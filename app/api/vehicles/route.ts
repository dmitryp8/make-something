import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveTeslaToken } from "@/lib/tesla-connection";
import { listVehicles as teslaListVehicles } from "@/lib/tesla-api";

export const runtime = "nodejs";

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { session } = auth;

  const forceRefresh = request.nextUrl.searchParams.get("force_refresh") === "true";

  if (forceRefresh) {
    const token = await getActiveTeslaToken(session.userId);
    if (token) {
      try {
        const teslaVehicles = await teslaListVehicles(token);

        for (const tv of teslaVehicles) {
          const vin = tv.vin as string;
          if (!vin) continue;

          await prisma.vehicle.upsert({
            where: { userId_vin: { userId: session.userId, vin } },
            create: {
              userId: session.userId,
              vin,
              teslaVehicleId: String(tv.id ?? ""),
              make: "Tesla",
              model: tv.display_name ?? "Unknown",
              year: extractYear(vin),
              trim: null,
              lastSeenAt: new Date(),
            },
            update: {
              teslaVehicleId: String(tv.id ?? ""),
              lastSeenAt: new Date(),
            },
          });
        }
      } catch (err) {
        console.error("Failed to refresh vehicles from Tesla:", err);
      }
    }
  }

  const vehicles = await prisma.vehicle.findMany({
    where: { userId: session.userId },
    orderBy: { lastSeenAt: "desc" },
  });

  return NextResponse.json(
    vehicles.map((v) => ({
      id: v.id,
      vin: v.vin,
      make: v.make,
      model: v.model,
      year: v.year,
      trim: v.trim,
      odometer_miles: v.odometerMiles,
      last_seen_at: v.lastSeenAt.toISOString(),
    })),
  );
}

/** Extract approximate model year from VIN (position 10). */
function extractYear(vin: string): number {
  const code = vin[9];
  const map: Record<string, number> = {
    J: 2018, K: 2019, L: 2020, M: 2021, N: 2022,
    P: 2023, R: 2024, S: 2025, T: 2026, V: 2027,
  };
  return map[code] ?? new Date().getFullYear();
}
