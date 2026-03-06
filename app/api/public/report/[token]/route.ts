import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const report = await prisma.report.findFirst({
    where: { shareToken: token, status: "ready", deletedAt: null },
    include: {
      vehicle: {
        select: { vin: true, make: true, model: true, year: true, trim: true },
      },
    },
  });

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  // Public view: no PII (email, phone, etc.)
  return NextResponse.json({
    report_number: report.reportNumber,
    vehicle: {
      vin: report.vehicle.vin,
      make: report.vehicle.make,
      model: report.vehicle.model,
      year: report.vehicle.year,
      trim: report.vehicle.trim,
    },
    sections: report.sectionsJson,
    pdf_url: report.pdfUrl,
    generated_at: report.generatedAt?.toISOString() ?? null,
  });
}
