import { Worker } from "bullmq";
import { randomBytes } from "crypto";
import { mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { PrismaClient } from "@prisma/client";

// Direct imports to avoid Next.js-specific module resolution issues
// These are plain TS modules with no Next.js dependencies
const ALGORITHM = "aes-256-gcm";

function getEncryptionKey(): Buffer {
  const hex = process.env.TOKEN_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) throw new Error("TOKEN_ENCRYPTION_KEY required");
  return Buffer.from(hex, "hex");
}

// We inline decrypt instead of importing from lib/encryption to avoid
// Next.js module issues when running as standalone worker
import { createDecipheriv } from "crypto";

function decryptToken(encoded: string): string {
  const key = getEncryptionKey();
  const buf = Buffer.from(encoded, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(buf.length - 16);
  const ciphertext = buf.subarray(12, buf.length - 16);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(ciphertext) + decipher.final("utf8");
}

const prisma = new PrismaClient();

const REPORT_QUEUE_NAME = "report-generation";
const API_BASE = "https://fleet-api.prd.na.vn.cloud.tesla.com";

/* eslint-disable @typescript-eslint/no-explicit-any */

async function apiFetch(path: string, accessToken: string): Promise<any> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Tesla API ${path} ${res.status}: ${body}`);
  }
  return res.json();
}

interface ReportJobData {
  reportId: string;
}

async function processReport(reportId: string) {
  console.log(`[worker] Processing report ${reportId}`);

  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: { vehicle: true, user: true },
  });

  if (!report) throw new Error(`Report ${reportId} not found`);

  await prisma.report.update({
    where: { id: reportId },
    data: { status: "processing" },
  });

  // Get active Tesla connection
  const conn = await prisma.teslaConnection.findFirst({
    where: { userId: report.userId, revokedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!conn) throw new Error("No active Tesla connection");

  const accessToken = decryptToken(conn.accessToken);

  // Fetch data from Tesla
  let vehicleData: any = {};
  let optionsData: any = {};
  let warrantyData: any = {};

  try {
    vehicleData = await apiFetch(
      `/api/1/vehicles/${report.vehicle.vin}/vehicle_data?endpoints=${encodeURIComponent("charge_state;vehicle_state;vehicle_config;drive_state")}`,
      accessToken,
    );
    vehicleData = vehicleData.response ?? vehicleData;
  } catch (err) {
    console.warn("[worker] vehicle_data fetch failed:", err);
  }

  try {
    optionsData = await apiFetch(`/api/1/dx/vehicles/options?vin=${report.vehicle.vin}`, accessToken);
  } catch (err) {
    console.warn("[worker] options fetch failed:", err);
  }

  try {
    warrantyData = await apiFetch("/api/1/dx/warranty/details", accessToken);
  } catch (err) {
    console.warn("[worker] warranty fetch failed:", err);
  }

  // Save raw snapshot
  const snapshotJson = { vehicleData, optionsData, warrantyData };

  // Transform to sections
  // Inline the transform logic to avoid Next.js import issues
  const { transformToSections } = await import("../lib/tesla-transform.js");
  const sections = transformToSections(vehicleData, optionsData, warrantyData, {
    vin: report.vehicle.vin,
    make: report.vehicle.make,
    model: report.vehicle.model,
    year: report.vehicle.year,
    trim: report.vehicle.trim,
  });

  // Generate PDF
  const { buildReportHtml } = await import("../lib/pdf-template.js");
  const html = buildReportHtml(sections, report.reportNumber);

  let pdfUrl: string | null = null;

  try {
    const puppeteer = await import("puppeteer");
    const browser = await puppeteer.default.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
    await browser.close();

    // Store PDF
    const storagePath = process.env.PDF_STORAGE_PATH ?? "./storage/reports";
    const pdfPath = join(storagePath, `${reportId}.pdf`);
    mkdirSync(dirname(pdfPath), { recursive: true });
    writeFileSync(pdfPath, pdfBuffer);
    pdfUrl = `/storage/reports/${reportId}.pdf`;
  } catch (err) {
    console.warn("[worker] PDF generation failed (continuing without PDF):", err);
  }

  // Generate share token
  const shareToken = randomBytes(20).toString("hex");

  // Update report
  await prisma.report.update({
    where: { id: reportId },
    data: {
      status: "ready",
      snapshotJson: snapshotJson as any,
      sectionsJson: sections as any,
      pdfUrl,
      shareToken,
      generatedAt: new Date(),
    },
  });

  console.log(`[worker] Report ${reportId} ready (share: ${shareToken})`);
}

// Start the worker
const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
const connection = { url: redisUrl, maxRetriesPerRequest: null };

const worker = new Worker<ReportJobData>(
  REPORT_QUEUE_NAME,
  async (job) => {
    try {
      await processReport(job.data.reportId);
    } catch (err) {
      console.error(`[worker] Report ${job.data.reportId} failed:`, err);

      await prisma.report.update({
        where: { id: job.data.reportId },
        data: {
          status: "failed",
          failedReason: err instanceof Error ? err.message : "Unknown error",
        },
      });

      throw err;
    }
  },
  { connection, concurrency: 2 },
);

worker.on("ready", () => console.log("[worker] Ready, listening for jobs..."));
worker.on("failed", (job, err) => console.error(`[worker] Job ${job?.id} failed:`, err.message));
worker.on("completed", (job) => console.log(`[worker] Job ${job.id} completed`));

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("[worker] Shutting down...");
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
});
