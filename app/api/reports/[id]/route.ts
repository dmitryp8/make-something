import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeDelta } from "@/lib/compare";
import type { SectionsJson } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id } = await params;

  const report = await prisma.report.findFirst({
    where: { id, userId: auth.session.userId, deletedAt: null },
    include: {
      vehicle: {
        select: { id: true, vin: true, make: true, model: true, year: true, trim: true },
      },
    },
  });

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  let delta = null;
  const compareWithId = _request.nextUrl.searchParams.get("compareWith");
  if (compareWithId) {
    const prevReport = await prisma.report.findFirst({
      where: { id: compareWithId, userId: auth.session.userId, deletedAt: null },
    });
    if (prevReport?.sectionsJson && report.sectionsJson) {
      delta = computeDelta(
        report.sectionsJson as SectionsJson,
        prevReport.sectionsJson as SectionsJson,
        prevReport.reportNumber,
        prevReport.generatedAt?.toISOString() ?? null,
      );
    }
  }

  return NextResponse.json({
    id: report.id,
    report_number: report.reportNumber,
    status: report.status,
    vehicle: {
      id: report.vehicle.id,
      vin: report.vehicle.vin,
      make: report.vehicle.make,
      model: report.vehicle.model,
      year: report.vehicle.year,
      trim: report.vehicle.trim,
    },
    sections: report.sectionsJson,
    pdf_url: report.pdfUrl,
    generated_at: report.generatedAt?.toISOString() ?? null,
    share_token: report.shareToken,
    delta,
  });
}
