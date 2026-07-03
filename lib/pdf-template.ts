import type { SectionsJson } from "./types";

function esc(val: unknown): string {
  if (val === null || val === undefined) return "—";
  return String(val).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function safeNum(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString();
}

// ── SVG arc battery gauge ──────────────────────────────────────────────────

function batteryArcSvg(level: number | null, chargeLimit: number | null): string {
  const R = 70;
  const cx = 90;
  const cy = 90;
  const sw = 14;
  // Arc: 200° → 340° (140° sweep across the bottom of the circle)
  const startDeg = 200;
  const totalDeg = 140;

  function toXY(deg: number) {
    const r = (deg * Math.PI) / 180;
    return { x: cx + R * Math.cos(r), y: cy + R * Math.sin(r) };
  }

  function arc(a: number, b: number) {
    const s = toXY(a);
    const e = toXY(b);
    const large = b - a > 180 ? 1 : 0;
    return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
  }

  const track = arc(startDeg, startDeg + totalDeg);

  if (level === null) {
    return `<svg viewBox="0 0 180 110" width="180" height="110" xmlns="http://www.w3.org/2000/svg">
  <path d="${track}" fill="none" stroke="#334155" stroke-width="${sw}" stroke-linecap="round"/>
  <text x="${cx}" y="${cy + 8}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="13" fill="#64748b">No data</text>
</svg>`;
  }

  const lvl = Math.max(0, Math.min(100, level));
  const fill = arc(startDeg, startDeg + (lvl / 100) * totalDeg);
  const color = lvl >= 80 ? "#22c55e" : lvl >= 50 ? "#f59e0b" : "#ef4444";

  let limitTick = "";
  if (chargeLimit !== null) {
    const lDeg = startDeg + (Math.max(0, Math.min(100, chargeLimit)) / 100) * totalDeg;
    const lRad = (lDeg * Math.PI) / 180;
    const i = { x: cx + (R - 10) * Math.cos(lRad), y: cy + (R - 10) * Math.sin(lRad) };
    const o = { x: cx + (R + 10) * Math.cos(lRad), y: cy + (R + 10) * Math.sin(lRad) };
    limitTick = `<line x1="${i.x.toFixed(2)}" y1="${i.y.toFixed(2)}" x2="${o.x.toFixed(2)}" y2="${o.y.toFixed(2)}" stroke="#94a3b8" stroke-width="2" stroke-linecap="round"/>`;
  }

  return `<svg viewBox="0 0 180 110" width="180" height="110" xmlns="http://www.w3.org/2000/svg">
  <path d="${track}" fill="none" stroke="#1e293b" stroke-width="${sw}" stroke-linecap="round"/>
  <path d="${fill}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round"/>
  ${limitTick}
  <text x="${cx}" y="${cy - 4}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="26" font-weight="700" fill="${color}">${lvl}%</text>
  <text x="${cx}" y="${cy + 14}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="10" fill="#94a3b8">BATTERY</text>
</svg>`;
}

// ── Degradation trend sparkline ───────────────────────────────────────────

function trendSvg(history: SectionsJson[]): string {
  const pts = history
    .map((h) => h.battery_snapshot.usable_battery_level)
    .filter((v): v is number => v !== null);

  if (pts.length < 2) return "";

  const W = 420, H = 80, px = 10, py = 10;
  const min = Math.min(...pts) - 2;
  const max = Math.max(...pts) + 2;
  const rangeY = max - min || 1;

  const coords = pts.map((v, i) => ({
    x: (px + (i / (pts.length - 1)) * (W - px * 2)).toFixed(1),
    y: (py + ((max - v) / rangeY) * (H - py * 2)).toFixed(1),
  }));

  const polyline = coords.map((c) => `${c.x},${c.y}`).join(" ");
  const first = pts[0], last = pts[pts.length - 1];
  const delta = last - first;
  const deltaStr = delta >= 0 ? `+${delta.toFixed(1)}%` : `${delta.toFixed(1)}%`;
  const deltaColor = delta >= 0 ? "#22c55e" : "#f59e0b";

  return `<div style="margin-top:12px;">
  <div style="font-size:11px;color:#64748b;margin-bottom:4px;">Usable battery trend (${pts.length} reports)</div>
  <svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg" style="display:block;">
    <polyline points="${polyline}" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    ${coords.map((c, i) => `<circle cx="${c.x}" cy="${c.y}" r="3" fill="${i === coords.length - 1 ? "#3b82f6" : "#1e3a5f"}"/>`).join("")}
  </svg>
  <div style="font-size:11px;color:#64748b;margin-top:2px;">
    ${first.toFixed(1)}% → ${last.toFixed(1)}%
    <span style="margin-left:8px;color:${deltaColor};font-weight:600;">${deltaStr}</span>
  </div>
</div>`;
}

// ── Comparison delta section ──────────────────────────────────────────────

function comparisonSection(current: SectionsJson, prev: SectionsJson): string {
  const prevDate = fmtDate(prev.meta.generated_at);
  const currDate = fmtDate(current.meta.generated_at);

  const days =
    prev.meta.generated_at
      ? Math.round(
          (new Date(current.meta.generated_at).getTime() - new Date(prev.meta.generated_at).getTime()) /
            86_400_000,
        )
      : null;

  const odoA = prev.vehicle_basics.odometer_miles;
  const odoB = current.vehicle_basics.odometer_miles;
  const batA = prev.battery_snapshot.usable_battery_level ?? prev.battery_snapshot.battery_level_percent;
  const batB = current.battery_snapshot.usable_battery_level ?? current.battery_snapshot.battery_level_percent;
  const rngA = prev.battery_snapshot.est_range_miles;
  const rngB = current.battery_snapshot.est_range_miles;
  const scoA = prev.meta.health_score;
  const scoB = current.meta.health_score;

  function delta(a: number | null, b: number | null, unit = "", dec = 0): string {
    if (a === null || b === null) return "<span style='color:#64748b'>—</span>";
    const d = b - a;
    const f = Math.abs(d).toFixed(dec);
    if (d > 0) return `<span style="color:#22c55e">+${f}${unit}</span>`;
    if (d < 0) return `<span style="color:#f59e0b">${d.toFixed(dec)}${unit}</span>`;
    return `<span style="color:#94a3b8">0${unit}</span>`;
  }

  return `<div class="section comparison-section">
  <h2>Change Since ${esc(prevDate)}${days !== null ? `<span class="days-chip">${days}d</span>` : ""}</h2>
  <table class="delta-table">
    <thead><tr><th>Metric</th><th>${esc(prevDate)}</th><th>${esc(currDate)}</th><th>Delta</th></tr></thead>
    <tbody>
      <tr><td>Odometer</td><td>${odoA !== null ? odoA.toLocaleString() + " mi" : "—"}</td><td>${odoB !== null ? odoB.toLocaleString() + " mi" : "—"}</td><td>${delta(odoA, odoB, " mi")}</td></tr>
      <tr><td>Usable Battery</td><td>${batA !== null ? batA + "%" : "—"}</td><td>${batB !== null ? batB + "%" : "—"}</td><td>${delta(batA, batB, "%", 1)}</td></tr>
      <tr><td>Est. Range</td><td>${rngA !== null ? rngA + " mi" : "—"}</td><td>${rngB !== null ? rngB + " mi" : "—"}</td><td>${delta(rngA, rngB, " mi")}</td></tr>
      ${scoA !== null || scoB !== null ? `<tr><td>Health Score</td><td>${scoA !== null ? scoA + "/100" : "—"}</td><td>${scoB !== null ? scoB + "/100" : "—"}</td><td>${delta(scoA, scoB, " pts")}</td></tr>` : ""}
    </tbody>
  </table>
</div>`;
}

// ── Main export ───────────────────────────────────────────────────────────

export function buildReportHtml(
  sections: SectionsJson,
  reportNumber: string,
  previousSections?: SectionsJson | null,
  history: SectionsJson[] = [],
): string {
  const { battery_snapshot: bat, vehicle_basics: vb, options_configuration: opt, software_system: sw, warranty_snapshot: war, meta } = sections;

  const score = meta.health_score;
  const band = score === null ? null : score >= 80 ? "green" : score >= 60 ? "yellow" : "red";
  const scoreColor = band === "green" ? "#22c55e" : band === "yellow" ? "#f59e0b" : band === "red" ? "#ef4444" : "#64748b";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "Helvetica Neue", "Segoe UI", system-ui, sans-serif; color: #0f172a; background: #fff; font-size: 14px; line-height: 1.6; }

  .cover { background: #0f172a; color: #fff; padding: 56px 48px 48px; min-height: 260px; position: relative; }
  .cover-accent { width: 48px; height: 5px; background: #E31937; border-radius: 3px; margin-bottom: 24px; }
  .cover-label { font-size: 11px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; color: #E31937; margin-bottom: 10px; }
  .cover-vehicle { font-size: 26px; font-weight: 700; color: #f8fafc; margin-bottom: 6px; }
  .cover-vin { font-family: "Courier New", monospace; font-size: 13px; color: #64748b; margin-bottom: 4px; }
  .cover-date { font-size: 12px; color: #475569; }
  .cover-num { position: absolute; top: 56px; right: 48px; font-size: 12px; color: #334155; font-weight: 600; }

  .health-badge { display: inline-flex; align-items: center; gap: 10px; background: #1e293b; border-radius: 12px; padding: 10px 20px; margin-top: 24px; }
  .hs-num { font-size: 32px; font-weight: 800; line-height: 1; }
  .hs-label { font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; color: #64748b; }
  .hs-band { font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; }
  .hs-divider { width: 1px; height: 36px; background: #334155; }

  .content { padding: 36px 48px; }

  .strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 28px; }
  .strip-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px; }
  .strip-card .lbl { font-size: 10px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: #94a3b8; margin-bottom: 4px; }
  .strip-card .val { font-size: 20px; font-weight: 700; color: #0f172a; }
  .strip-card .sub { font-size: 11px; color: #64748b; margin-top: 2px; }

  .bat-layout { display: flex; align-items: flex-start; gap: 28px; }
  .bat-details { flex: 1; }

  .section { margin-bottom: 28px; }
  .section h2 { font-size: 13px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #94a3b8; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 14px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 24px; }
  .field { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #f1f5f9; }
  .field .lbl { color: #64748b; font-size: 13px; }
  .field .val { font-weight: 600; font-size: 13px; text-align: right; color: #0f172a; }
  .opts { columns: 2; list-style: disc inside; }
  .opts li { padding: 2px 0; font-size: 13px; color: #334155; }
  .badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
  .badge.yes { background: #dcfce7; color: #166534; }
  .badge.no { background: #fee2e2; color: #991b1b; }

  .comparison-section h2 { color: #3b82f6 !important; }
  .days-chip { display: inline-block; background: #eff6ff; color: #3b82f6; font-size: 11px; font-weight: 600; padding: 1px 8px; border-radius: 10px; margin-left: 8px; vertical-align: middle; text-transform: none; letter-spacing: 0; }
  .delta-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .delta-table th { text-align: left; padding: 6px 10px; font-size: 11px; color: #94a3b8; font-weight: 600; border-bottom: 1px solid #e2e8f0; }
  .delta-table td { padding: 7px 10px; border-bottom: 1px solid #f1f5f9; color: #0f172a; }
  .delta-table tr:last-child td { border-bottom: none; }

  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }
</style>
</head>
<body>

<div class="cover">
  <div class="cover-num">${esc(reportNumber)}</div>
  <div class="cover-accent"></div>
  <div class="cover-label">Out Check &mdash; Vehicle Inspection Report</div>
  <div class="cover-vehicle">${esc(vb.year)} ${esc(vb.make)} ${esc(vb.model)}${vb.trim ? " " + esc(vb.trim) : ""}</div>
  <div class="cover-vin">VIN: ${esc(vb.vin)}</div>
  <div class="cover-date">Generated ${fmtDate(meta.generated_at)}</div>
  ${score !== null ? `<div class="health-badge">
    <div><div class="hs-num" style="color:${scoreColor}">${score}</div><div class="hs-label">Health Score</div></div>
    <div class="hs-divider"></div>
    <div><div class="hs-band" style="color:${scoreColor}">${band}</div><div class="hs-label">out of 100</div></div>
  </div>` : ""}
</div>

<div class="content">

  <div class="strip">
    <div class="strip-card">
      <div class="lbl">Battery</div>
      <div class="val">${bat.battery_level_percent !== null ? bat.battery_level_percent + "%" : "—"}</div>
      ${bat.usable_battery_level !== null && bat.usable_battery_level !== bat.battery_level_percent
        ? `<div class="sub">${bat.usable_battery_level}% usable</div>` : ""}
    </div>
    <div class="strip-card">
      <div class="lbl">Est. Range</div>
      <div class="val">${bat.est_range_miles !== null ? bat.est_range_miles + " mi" : "—"}</div>
      ${bat.est_range_km !== null ? `<div class="sub">${bat.est_range_km} km</div>` : ""}
    </div>
    <div class="strip-card">
      <div class="lbl">Odometer</div>
      <div class="val">${vb.odometer_miles !== null ? vb.odometer_miles.toLocaleString() : "—"}</div>
      ${vb.odometer_km !== null ? `<div class="sub">${vb.odometer_km.toLocaleString()} km</div>` : ""}
    </div>
    <div class="strip-card">
      <div class="lbl">Charge Limit</div>
      <div class="val">${bat.charge_limit_percent !== null ? bat.charge_limit_percent + "%" : "—"}</div>
    </div>
  </div>

  ${previousSections ? comparisonSection(sections, previousSections) : ""}

  <div class="section">
    <h2>Battery</h2>
    <div class="bat-layout">
      <div>${batteryArcSvg(bat.battery_level_percent, bat.charge_limit_percent)}</div>
      <div class="bat-details">
        <div class="grid">
          <div class="field"><span class="lbl">Level</span><span class="val">${bat.battery_level_percent !== null ? bat.battery_level_percent + "%" : "—"}</span></div>
          <div class="field"><span class="lbl">Usable Level</span><span class="val">${bat.usable_battery_level !== null ? bat.usable_battery_level + "%" : "—"}</span></div>
          <div class="field"><span class="lbl">Est. Range</span><span class="val">${bat.est_range_miles !== null ? bat.est_range_miles + " mi / " + bat.est_range_km + " km" : "—"}</span></div>
          <div class="field"><span class="lbl">Charge Limit</span><span class="val">${bat.charge_limit_percent !== null ? bat.charge_limit_percent + "%" : "—"}</span></div>
          <div class="field"><span class="lbl">Last Charge</span><span class="val">${fmtDate(bat.last_charge_timestamp)}</span></div>
        </div>
        ${trendSvg(history)}
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Vehicle</h2>
    <div class="grid">
      <div class="field"><span class="lbl">VIN</span><span class="val" style="font-family:monospace;font-size:12px">${esc(vb.vin)}</span></div>
      <div class="field"><span class="lbl">Year / Make / Model</span><span class="val">${esc(vb.year)} ${esc(vb.make)} ${esc(vb.model)}</span></div>
      <div class="field"><span class="lbl">Trim</span><span class="val">${esc(vb.trim)}</span></div>
      <div class="field"><span class="lbl">Odometer</span><span class="val">${vb.odometer_miles !== null ? vb.odometer_miles.toLocaleString() + " mi / " + (vb.odometer_km ?? 0).toLocaleString() + " km" : "—"}</span></div>
      <div class="field"><span class="lbl">Exterior</span><span class="val">${esc(vb.exterior_color)}</span></div>
      <div class="field"><span class="lbl">Interior</span><span class="val">${esc(vb.interior_color)}</span></div>
    </div>
  </div>

  <div class="section">
    <h2>Options &amp; Configuration</h2>
    ${opt.parsed_options.length > 0
      ? `<ul class="opts">${opt.parsed_options.map((o) => `<li>${esc(o)}</li>`).join("")}</ul>`
      : "<p style='color:#64748b;font-size:13px'>No options data available.</p>"}
    ${opt.options_codes.length > 0
      ? `<p style="margin-top:8px;font-size:11px;color:#94a3b8;">Codes: ${opt.options_codes.map(esc).join(", ")}</p>`
      : ""}
  </div>

  <div class="section">
    <h2>Software &amp; System</h2>
    <div class="grid">
      <div class="field"><span class="lbl">Firmware</span><span class="val">${esc(sw.firmware_version)}</span></div>
      <div class="field"><span class="lbl">Autopilot HW</span><span class="val">${esc(sw.hardware_ap)}</span></div>
      <div class="field"><span class="lbl">Connectivity</span><span class="val">${esc(sw.connectivity)}</span></div>
    </div>
  </div>

  <div class="section">
    <h2>Warranty</h2>
    <div class="grid">
      <div class="field"><span class="lbl">Basic Warranty</span><span class="val">${safeNum(war.base_warranty_miles)} mi / ${safeNum(war.base_warranty_years)} yr</span></div>
      <div class="field"><span class="lbl">Basic Status</span><span class="val"><span class="badge ${war.in_base_warranty ? "yes" : "no"}">${war.in_base_warranty ? "Active" : "Expired"}</span></span></div>
      <div class="field"><span class="lbl">Basic Expiration</span><span class="val">${fmtDate(war.base_warranty_expiration_date)}</span></div>
      <div class="field"><span class="lbl">Battery Warranty</span><span class="val">${safeNum(war.battery_warranty_miles)} mi / ${safeNum(war.battery_warranty_years)} yr</span></div>
      <div class="field"><span class="lbl">Battery Status</span><span class="val"><span class="badge ${war.in_battery_warranty ? "yes" : "no"}">${war.in_battery_warranty ? "Active" : "Expired"}</span></span></div>
      <div class="field"><span class="lbl">Battery Expiration</span><span class="val">${fmtDate(war.battery_warranty_expiration_date)}</span></div>
    </div>
  </div>

  <div class="footer">
    <p>Not affiliated with Tesla, Inc. &middot; Generated ${fmtDate(meta.generated_at)} &middot; ${esc(reportNumber)}</p>
  </div>

</div>
</body>
</html>`;
}
