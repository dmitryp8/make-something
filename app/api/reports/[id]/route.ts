import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
  });
}
