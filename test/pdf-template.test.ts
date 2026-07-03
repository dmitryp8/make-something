import { describe, it, expect } from "vitest";
import { buildReportHtml } from "../lib/pdf-template";
import type { SectionsJson } from "../lib/types";

function make(): SectionsJson {
  return {
    battery_snapshot: {
      battery_level_percent: 87,
      usable_battery_level: 85,
      est_range_miles: 280,
      est_range_km: 451,
      charge_limit_percent: 90,
      last_charge_timestamp: "2026-03-31T09:00:00Z",
    },
    vehicle_basics: {
      vin: "5YJYGDEE2MF000001",
      make: "Tesla", model: "Model Y", year: 2021, trim: "Long Range",
      odometer_miles: 42_100, odometer_km: 67_764,
      exterior_color: "Deep Blue", interior_color: "White",
      license_plate: null, location_country: null,
    },
    options_configuration: { options_codes: ["APF2"], parsed_options: ["Autopilot"] },
    software_system: { firmware_version: "2024.3.25", hardware_ap: "HW3", connectivity: "Premium", last_update_timestamp: null },
    warranty_snapshot: {
      base_warranty_miles: 50_000, base_warranty_years: 4,
      battery_warranty_miles: 120_000, battery_warranty_years: 8,
      in_base_warranty: true, in_battery_warranty: true,
      base_warranty_expiration_date: "2025-12-31",
      battery_warranty_expiration_date: "2029-12-31",
    },
    meta: { generated_at: "2026-03-31T09:00:00Z", generator_version: "1.0.0", health_score: 87 },
  };
}

describe("buildReportHtml", () => {
  it("produces valid HTML with VIN and report number", () => {
    const html = buildReportHtml(make(), "OUT-2026-000001");
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("5YJYGDEE2MF000001");
    expect(html).toContain("OUT-2026-000001");
    expect(html).toContain("Model Y");
  });

  it("renders health score badge when score is present", () => {
    const html = buildReportHtml(make(), "OUT-2026-000001");
    expect(html).toContain("87");
    expect(html).toContain("health-badge");
  });

  it("omits health badge when health_score is null", () => {
    const s = make();
    s.meta.health_score = null;
    const html = buildReportHtml(s, "OUT-2026-000001");
    // CSS defines .health-badge but the element should not be rendered
    expect(html).not.toContain('<div class="health-badge">');
  });

  it("renders gray arc with 'No data' when battery_level_percent is null", () => {
    const s = make();
    s.battery_snapshot.battery_level_percent = null;
    const html = buildReportHtml(s, "OUT-2026-000001");
    expect(html).toContain("No data");
    expect(html).not.toContain("NaN");
  });

  it("arc path has no NaN when battery is 0", () => {
    const s = make();
    s.battery_snapshot.battery_level_percent = 0;
    const html = buildReportHtml(s, "OUT-2026-000001");
    expect(html).not.toContain("NaN");
  });

  it("includes comparison section when previousSections provided", () => {
    const current = make();
    const prev = make();
    prev.meta.generated_at = "2025-12-31T09:00:00Z";
    prev.vehicle_basics.odometer_miles = 39_000;
    const html = buildReportHtml(current, "OUT-2026-000002", prev);
    expect(html).toContain("comparison-section");
    expect(html).toContain("Change Since");
  });

  it("omits comparison section when no previousSections", () => {
    const html = buildReportHtml(make(), "OUT-2026-000001");
    // CSS defines .comparison-section but the element should not be rendered
    expect(html).not.toContain('<div class="section comparison-section">');
  });

  it("renders degradation trend when history has 2+ reports", () => {
    const h1 = make(); h1.battery_snapshot.usable_battery_level = 96;
    const h2 = make(); h2.battery_snapshot.usable_battery_level = 91;
    const html = buildReportHtml(make(), "OUT-2026-000003", null, [h1, h2]);
    expect(html).toContain("Usable battery trend");
    expect(html).toContain("polyline");
  });

  it("omits trend when history has fewer than 2 reports", () => {
    const html = buildReportHtml(make(), "OUT-2026-000001", null, []);
    expect(html).not.toContain("Usable battery trend");
  });

  it("warranty toLocaleString does not crash with valid numbers", () => {
    expect(() => buildReportHtml(make(), "OUT-2026-000001")).not.toThrow();
  });
});
