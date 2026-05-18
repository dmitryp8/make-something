import { describe, it, expect } from "vitest";
import type { SectionsJson } from "../lib/types";

// Mirror the computeDelta logic from the API route so we can unit test it
// without importing Next.js server modules.
function computeDelta(
  current: SectionsJson,
  previous: SectionsJson,
  prevReportNumber: string,
  prevGeneratedAt: string | null,
) {
  const odoA = previous.vehicle_basics.odometer_miles;
  const odoB = current.vehicle_basics.odometer_miles;
  const batA = previous.battery_snapshot.usable_battery_level ?? previous.battery_snapshot.battery_level_percent;
  const batB = current.battery_snapshot.usable_battery_level ?? current.battery_snapshot.battery_level_percent;
  const rngA = previous.battery_snapshot.est_range_miles;
  const rngB = current.battery_snapshot.est_range_miles;
  const scoA = previous.meta.health_score;
  const scoB = current.meta.health_score;

  const daysDiff =
    prevGeneratedAt && current.meta.generated_at
      ? Math.round(
          (new Date(current.meta.generated_at).getTime() - new Date(prevGeneratedAt).getTime()) / 86_400_000,
        )
      : null;

  return {
    previous_report_number: prevReportNumber,
    previous_generated_at: prevGeneratedAt,
    days_between: daysDiff,
    odometer_delta: odoA !== null && odoB !== null ? odoB - odoA : null,
    battery_delta: batA !== null && batB !== null ? batB - batA : null,
    range_delta: rngA !== null && rngB !== null ? rngB - rngA : null,
    health_score_delta: scoA !== null && scoB !== null ? scoB - scoA : null,
  };
}

function make(): SectionsJson {
  return {
    battery_snapshot: {
      battery_level_percent: 87,
      usable_battery_level: 85,
      est_range_miles: 280,
      est_range_km: 451,
      charge_limit_percent: 90,
      last_charge_timestamp: null,
    },
    vehicle_basics: {
      vin: "5YJYGDEE2MF000001",
      make: "Tesla", model: "Model Y", year: 2021, trim: null,
      odometer_miles: 40_000, odometer_km: 64_374,
      exterior_color: null, interior_color: null, license_plate: null, location_country: null,
    },
    options_configuration: { options_codes: [], parsed_options: [] },
    software_system: { firmware_version: null, hardware_ap: null, connectivity: null, last_update_timestamp: null },
    warranty_snapshot: {
      base_warranty_miles: 50_000, base_warranty_years: 4,
      battery_warranty_miles: 120_000, battery_warranty_years: 8,
      in_base_warranty: true, in_battery_warranty: true,
      base_warranty_expiration_date: null, battery_warranty_expiration_date: null,
    },
    meta: { generated_at: "2026-03-31T09:00:00Z", generator_version: "1.0.0", health_score: 90 },
  };
}

describe("computeDelta", () => {
  it("computes correct odometer delta", () => {
    const prev = make(); prev.vehicle_basics.odometer_miles = 40_000;
    const curr = make(); curr.vehicle_basics.odometer_miles = 42_847;
    expect(computeDelta(curr, prev, "OUT-001", "2026-01-15T09:00:00Z").odometer_delta).toBe(2_847);
  });

  it("computes correct battery delta using usable_battery_level", () => {
    const prev = make(); prev.battery_snapshot.usable_battery_level = 87;
    const curr = make(); curr.battery_snapshot.usable_battery_level = 82;
    expect(computeDelta(curr, prev, "OUT-001", "2026-01-15T09:00:00Z").battery_delta).toBe(-5);
  });

  it("falls back to battery_level_percent when usable_battery_level is null", () => {
    const prev = make();
    prev.battery_snapshot.usable_battery_level = null;
    prev.battery_snapshot.battery_level_percent = 90;
    const curr = make();
    curr.battery_snapshot.usable_battery_level = null;
    curr.battery_snapshot.battery_level_percent = 85;
    expect(computeDelta(curr, prev, "OUT-001", "2026-01-15T09:00:00Z").battery_delta).toBe(-5);
  });

  it("returns null odometer delta when values are null", () => {
    const prev = make(); prev.vehicle_basics.odometer_miles = null;
    const curr = make(); curr.vehicle_basics.odometer_miles = null;
    expect(computeDelta(curr, prev, "OUT-001", "2026-01-15T09:00:00Z").odometer_delta).toBeNull();
  });

  it("computes days_between correctly", () => {
    const prev = make(); prev.meta.generated_at = "2026-01-15T09:00:00Z";
    const curr = make(); curr.meta.generated_at = "2026-03-31T09:00:00Z"; // 75 days
    expect(computeDelta(curr, prev, "OUT-001", "2026-01-15T09:00:00Z").days_between).toBe(75);
  });

  it("returns null days_between when prevGeneratedAt is null", () => {
    expect(computeDelta(make(), make(), "OUT-001", null).days_between).toBeNull();
  });

  it("computes health_score_delta", () => {
    const prev = make(); prev.meta.health_score = 90;
    const curr = make(); curr.meta.health_score = 85;
    expect(computeDelta(curr, prev, "OUT-001", "2026-01-15T09:00:00Z").health_score_delta).toBe(-5);
  });

  it("returns null health_score_delta when either score is null", () => {
    const prev = make(); prev.meta.health_score = null;
    const curr = make(); curr.meta.health_score = 85;
    expect(computeDelta(curr, prev, "OUT-001", "2026-01-15T09:00:00Z").health_score_delta).toBeNull();
  });
});
