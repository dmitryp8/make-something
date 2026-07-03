import { describe, it, expect } from "vitest";
import { computeHealthScore } from "../lib/health-score";
import type { SectionsJson } from "../lib/types";

function make(usable = 95, chargeLimit = 90, odometer = 5_000): SectionsJson {
  return {
    battery_snapshot: {
      battery_level_percent: usable,
      usable_battery_level: usable,
      est_range_miles: 290,
      est_range_km: 467,
      charge_limit_percent: chargeLimit,
      last_charge_timestamp: null,
    },
    vehicle_basics: {
      vin: "5YJYGDEE2MF000001",
      make: "Tesla", model: "Model Y", year: 2021, trim: null,
      odometer_miles: odometer, odometer_km: Math.round(odometer * 1.60934),
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
    meta: { generated_at: new Date().toISOString(), generator_version: "1.0.0", health_score: null },
  };
}

describe("computeHealthScore", () => {
  it("returns 100 for a perfect vehicle", () => {
    const { score, band } = computeHealthScore(make(95, 90, 5_000), []);
    expect(score).toBe(100);
    expect(band).toBe("green");
  });

  it("deducts for usable_battery_level < 90", () => {
    // (90 - 80) * 0.5 = 5
    const { score } = computeHealthScore(make(80, 90, 5_000), []);
    expect(score).toBe(95);
  });

  it("deducts 10 pts for charge_limit < 80", () => {
    const { score } = computeHealthScore(make(95, 75, 5_000), []);
    expect(score).toBe(90);
  });

  it("deducts 5 pts for odometer 50k–100k", () => {
    const { score } = computeHealthScore(make(95, 90, 60_000), []);
    expect(score).toBe(95);
  });

  it("deducts 10 pts for odometer > 100k (not cumulative with 50k)", () => {
    const { score } = computeHealthScore(make(95, 90, 110_000), []);
    expect(score).toBe(90);
  });

  it("deducts 10 pts for degradation > 10%", () => {
    const first = make(100, 90, 5_000);
    const curr = make(88, 90, 5_000); // 12% degradation → 10 off; (90-88)*0.5=1 off
    const { score } = computeHealthScore(curr, [first]);
    expect(score).toBe(89);
  });

  it("deducts 15 pts for degradation > 20%", () => {
    const first = make(100, 90, 5_000);
    const curr = make(78, 90, 5_000); // 22% degradation → 15 off; (90-78)*0.5=6 off
    const { score } = computeHealthScore(curr, [first]);
    expect(score).toBe(79);
  });

  it("no degradation penalty with empty history", () => {
    const { score } = computeHealthScore(make(90, 90, 5_000), []);
    expect(score).toBe(100);
  });

  it("no battery deduction when usable_battery_level is null", () => {
    const s = make(95, 90, 5_000);
    s.battery_snapshot.usable_battery_level = null;
    const { score } = computeHealthScore(s, []);
    expect(score).toBe(100);
  });

  it("no degradation penalty when first history usable is null", () => {
    const first = make(95, 90, 5_000);
    first.battery_snapshot.usable_battery_level = null;
    const curr = make(80, 90, 5_000);
    const { score } = computeHealthScore(curr, [first]);
    // only battery deduction: (90-80)*0.5 = 5
    expect(score).toBe(95);
  });

  it("clamps score to 0 and returns red", () => {
    // max possible deductions: 45 (bat) + 10 (limit) + 10 (odo) + 15 (degrade) = 80 → floor is 20
    const first = make(100, 90, 5_000);
    const curr = make(0, 50, 150_000); // usable=0: (90-0)*0.5=45, limit=10, odo=10, degrade>20%=15 → 80 off → 20
    const { score } = computeHealthScore(curr, [first]);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThan(60);
  });

  it("returns yellow band for score 60–79", () => {
    // usable=60: (90-60)*0.5=15; charge_limit=75: 10 → 75
    const { band } = computeHealthScore(make(60, 75, 5_000), []);
    expect(band).toBe("yellow");
  });

  it("returns red band for score < 60", () => {
    const first = make(100, 90, 5_000);
    const curr = make(40, 50, 120_000);
    const { band } = computeHealthScore(curr, [first]);
    expect(band).toBe("red");
  });
});
