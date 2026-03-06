import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  await prisma.teslaConnection.updateMany({
    where: { userId: auth.session.userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
