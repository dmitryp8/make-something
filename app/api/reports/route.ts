import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveTeslaToken } from "@/lib/tesla-connection";
import { getReportQueue } from "@/lib/queue";
import type { ReportJobData } from "@/lib/queue";

export const runtime = "nodejs";

/** GET /api/reports — list all reports for the current user. */
export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const reports = await prisma.report.findMany({
    where: { userId: auth.session.userId, deletedAt: null },
    include: { vehicle: { select: { model: true, year: true, vin: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    reports.map((r) => ({
      id: r.id,
      report_number: r.reportNumber,
      vehicle: {
        model: r.vehicle.model,
        year: r.vehicle.year,
        vin: r.vehicle.vin,
      },
      status: r.status,
      generated_at: r.generatedAt?.toISOString() ?? null,
    })),
  );
}

/** POST /api/reports — create a new report for a vehicle. */
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { session } = auth;

  const body = (await request.json()) as { vehicle_id?: string };
  const vehicleId = body.vehicle_id;

  if (!vehicleId) {
    return NextResponse.json({ error: "vehicle_id is required" }, { status: 400 });
  }

  // Verify vehicle belongs to user
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, userId: session.userId },
  });

  if (!vehicle) {
    return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
  }

  // Verify active Tesla connection
  const token = await getActiveTeslaToken(session.userId);
  if (!token) {
    return NextResponse.json(
      { error: "No active Tesla connection. Please reconnect." },
      { status: 400 },
    );
  }

  // Generate report number
  const year = new Date().getFullYear();
  const count = await prisma.report.count();
  const reportNumber = `OUT-${year}-${String(count + 1).padStart(6, "0")}`;

  const report = await prisma.report.create({
    data: {
      userId: session.userId,
      vehicleId,
      reportNumber,
      status: "pending",
    },
  });

  // Enqueue the generation job
  try {
    const queue = getReportQueue();
    await queue.add("generate", { reportId: report.id } satisfies ReportJobData);
  } catch (err) {
    console.error("Failed to enqueue report job (will process on next worker poll):", err);
    // Even if Redis is down, the report exists with "pending" status
    // The worker can pick it up by polling the DB
  }

  return NextResponse.json({ report_id: report.id, status: report.status }, { status: 201 });
}
