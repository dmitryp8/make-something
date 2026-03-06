import type { SectionsJson } from "./types";

function esc(val: unknown): string {
  if (val === null || val === undefined) return "—";
  return String(val).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export function buildReportHtml(sections: SectionsJson, reportNumber: string): string {
  const { battery_snapshot: bat, vehicle_basics: vb, options_configuration: opt, software_system: sw, warranty_snapshot: war, meta } = sections;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "Segoe UI", system-ui, sans-serif; color: #1a1a2e; background: #fff; padding: 40px; font-size: 14px; line-height: 1.6; }
  .cover { text-align: center; margin-bottom: 40px; padding-bottom: 32px; border-bottom: 2px solid #e0e0e0; }
  .cover h1 { font-size: 28px; font-weight: 700; margin-bottom: 4px; }
  .cover .subtitle { font-size: 16px; color: #555; }
  .cover .vin { font-family: monospace; font-size: 13px; color: #888; margin-top: 8px; }
  .section { margin-bottom: 28px; }
  .section h2 { font-size: 18px; font-weight: 600; color: #0a0a23; border-bottom: 1px solid #ddd; padding-bottom: 6px; margin-bottom: 12px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
  .field { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #f0f0f0; }
  .field .label { color: #666; }
  .field .value { font-weight: 500; text-align: right; }
  .options-list { columns: 2; list-style: disc inside; }
  .options-list li { padding: 2px 0; }
  .badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
  .badge.yes { background: #d4edda; color: #155724; }
  .badge.no { background: #f8d7da; color: #721c24; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 11px; color: #999; text-align: center; }
</style>
</head>
<body>

<div class="cover">
  <h1>OUT CHECK</h1>
  <div class="subtitle">${esc(vb.make)} ${esc(vb.model)} ${esc(vb.year)} ${vb.trim ? esc(vb.trim) : ""}</div>
  <div class="vin">VIN: ${esc(vb.vin)}</div>
</div>

<div class="section">
  <h2>Battery Snapshot</h2>
  <div class="grid">
    <div class="field"><span class="label">Battery Level</span><span class="value">${bat.battery_level_percent !== null ? bat.battery_level_percent + "%" : "—"}</span></div>
    <div class="field"><span class="label">Est. Range</span><span class="value">${bat.est_range_miles !== null ? bat.est_range_miles + " mi / " + bat.est_range_km + " km" : "—"}</span></div>
    <div class="field"><span class="label">Charge Limit</span><span class="value">${bat.charge_limit_percent !== null ? bat.charge_limit_percent + "%" : "—"}</span></div>
    <div class="field"><span class="label">Last Charge</span><span class="value">${fmtDate(bat.last_charge_timestamp)}</span></div>
  </div>
</div>

<div class="section">
  <h2>Vehicle Basics</h2>
  <div class="grid">
    <div class="field"><span class="label">VIN</span><span class="value">${esc(vb.vin)}</span></div>
    <div class="field"><span class="label">Year / Make / Model</span><span class="value">${esc(vb.year)} ${esc(vb.make)} ${esc(vb.model)}</span></div>
    <div class="field"><span class="label">Trim</span><span class="value">${esc(vb.trim)}</span></div>
    <div class="field"><span class="label">Odometer</span><span class="value">${vb.odometer_miles !== null ? vb.odometer_miles.toLocaleString() + " mi / " + (vb.odometer_km ?? 0).toLocaleString() + " km" : "—"}</span></div>
    <div class="field"><span class="label">Exterior Color</span><span class="value">${esc(vb.exterior_color)}</span></div>
    <div class="field"><span class="label">Interior Color</span><span class="value">${esc(vb.interior_color)}</span></div>
  </div>
</div>

<div class="section">
  <h2>Options &amp; Configuration</h2>
  ${opt.parsed_options.length > 0
    ? `<ul class="options-list">${opt.parsed_options.map((o) => `<li>${esc(o)}</li>`).join("")}</ul>`
    : "<p>No options data available.</p>"}
  ${opt.options_codes.length > 0
    ? `<p style="margin-top:8px;font-size:11px;color:#999;">Codes: ${opt.options_codes.join(", ")}</p>`
    : ""}
</div>

<div class="section">
  <h2>Software &amp; System</h2>
  <div class="grid">
    <div class="field"><span class="label">Firmware</span><span class="value">${esc(sw.firmware_version)}</span></div>
    <div class="field"><span class="label">Autopilot Hardware</span><span class="value">${esc(sw.hardware_ap)}</span></div>
    <div class="field"><span class="label">Connectivity</span><span class="value">${esc(sw.connectivity)}</span></div>
  </div>
</div>

<div class="section">
  <h2>Warranty Snapshot</h2>
  <div class="grid">
    <div class="field"><span class="label">Base Warranty</span><span class="value">${war.base_warranty_miles.toLocaleString()} mi / ${war.base_warranty_years} years</span></div>
    <div class="field"><span class="label">Base Warranty Status</span><span class="value"><span class="badge ${war.in_base_warranty ? "yes" : "no"}">${war.in_base_warranty ? "Active" : "Expired"}</span></span></div>
    <div class="field"><span class="label">Base Expiration</span><span class="value">${fmtDate(war.base_warranty_expiration_date)}</span></div>
    <div class="field"><span class="label">Battery Warranty</span><span class="value">${war.battery_warranty_miles.toLocaleString()} mi / ${war.battery_warranty_years} years</span></div>
    <div class="field"><span class="label">Battery Warranty Status</span><span class="value"><span class="badge ${war.in_battery_warranty ? "yes" : "no"}">${war.in_battery_warranty ? "Active" : "Expired"}</span></span></div>
    <div class="field"><span class="label">Battery Expiration</span><span class="value">${fmtDate(war.battery_warranty_expiration_date)}</span></div>
  </div>
</div>

<div class="footer">
  <p>Not affiliated with Tesla, Inc. &middot; Generated ${fmtDate(meta.generated_at)} &middot; ${esc(reportNumber)}</p>
</div>

</body>
</html>`;
}
