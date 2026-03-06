"use client";

import { Card, CardBody, CardHeader, Chip, Divider } from "@heroui/react";
import type { SectionsJson } from "@/lib/types";

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="flex items-baseline justify-between border-b border-white/5 py-2">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="text-sm font-medium">{value ?? "—"}</span>
    </div>
  );
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}
interface ReportSectionsProps {
  sections: SectionsJson;
  reportNumber: string;
  showHeader?: boolean;
  showFooter?: boolean;
}

export default function ReportSections({
  sections,
  reportNumber,
  showHeader = true,
  showFooter = true,
}: ReportSectionsProps) {
  const { battery_snapshot: bat, vehicle_basics: vb, options_configuration: opt, software_system: sw, warranty_snapshot: war, meta } = sections;

  return (
    <div className="space-y-6">
      {/* Header */}
      {showHeader && (
        <>
          <div className="text-center">
            <h1 className="font-[family-name:var(--font-space-grotesk)] text-3xl font-bold">OUT CHECK</h1>
            <p className="mt-1 text-lg text-slate-300">
              {vb.make} {vb.model} {vb.year} {vb.trim ?? ""}
            </p>
            <p className="font-mono text-xs text-slate-500">VIN: {vb.vin}</p>
            <p className="mt-1 text-xs text-slate-500">{reportNumber}</p>
          </div>
          <Divider className="bg-white/10" />
        </>
      )}

      {/* Battery */}
      <Card className="border border-white/10 bg-slate-800/60">
        <CardHeader><h2 className="text-lg font-semibold">🔋 Battery Snapshot</h2></CardHeader>
        <CardBody>
          <Field label="Battery Level" value={bat.battery_level_percent !== null ? `${bat.battery_level_percent}%` : null} />
          <Field label="Estimated Range" value={bat.est_range_miles !== null ? `${bat.est_range_miles} mi / ${bat.est_range_km} km` : null} />
          <Field label="Charge Limit" value={bat.charge_limit_percent !== null ? `${bat.charge_limit_percent}%` : null} />
          <Field label="Last Charge" value={fmtDate(bat.last_charge_timestamp)} />
        </CardBody>
      </Card>

      {/* Basics */}
      <Card className="border border-white/10 bg-slate-800/60">
        <CardHeader><h2 className="text-lg font-semibold">🚗 Vehicle Basics</h2></CardHeader>
        <CardBody>
          <Field label="VIN" value={vb.vin} />
          <Field label="Year / Make / Model" value={`${vb.year} ${vb.make} ${vb.model}`} />
          <Field label="Trim" value={vb.trim} />
          <Field label="Odometer" value={vb.odometer_miles !== null ? `${vb.odometer_miles.toLocaleString()} mi / ${(vb.odometer_km ?? 0).toLocaleString()} km` : null} />
          <Field label="Exterior Color" value={vb.exterior_color} />
          <Field label="Interior Color" value={vb.interior_color} />
        </CardBody>
      </Card>

      {/* Options */}
      <Card className="border border-white/10 bg-slate-800/60">
        <CardHeader><h2 className="text-lg font-semibold">⚙️ Options & Configuration</h2></CardHeader>
        <CardBody>
          {opt.parsed_options.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {opt.parsed_options.map((o, i) => (
                <Chip key={i} variant="flat" size="sm">{o}</Chip>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">No options data available.</p>
          )}
          {opt.options_codes.length > 0 && (
            <p className="mt-3 font-mono text-xs text-slate-600">{opt.options_codes.join(", ")}</p>
          )}
        </CardBody>
      </Card>

      {/* Software */}
      <Card className="border border-white/10 bg-slate-800/60">
        <CardHeader><h2 className="text-lg font-semibold">💻 Software & System</h2></CardHeader>
        <CardBody>
          <Field label="Firmware" value={sw.firmware_version} />
          <Field label="Autopilot Hardware" value={sw.hardware_ap} />
          <Field label="Connectivity" value={sw.connectivity} />
        </CardBody>
      </Card>

      {/* Warranty */}
      <Card className="border border-white/10 bg-slate-800/60">
        <CardHeader><h2 className="text-lg font-semibold">🛡️ Warranty Snapshot</h2></CardHeader>
        <CardBody>
          <Field label="Base Warranty" value={`${war.base_warranty_miles.toLocaleString()} mi / ${war.base_warranty_years} years`} />
          <div className="flex items-baseline justify-between border-b border-white/5 py-2">
            <span className="text-sm text-slate-400">Base Warranty Status</span>
            <Chip color={war.in_base_warranty ? "success" : "danger"} variant="flat" size="sm">
              {war.in_base_warranty ? "Active" : "Expired"}
            </Chip>
          </div>
          <Field label="Base Expiration" value={fmtDate(war.base_warranty_expiration_date)} />
          <Field label="Battery Warranty" value={`${war.battery_warranty_miles.toLocaleString()} mi / ${war.battery_warranty_years} years`} />
          <div className="flex items-baseline justify-between border-b border-white/5 py-2">
            <span className="text-sm text-slate-400">Battery Warranty Status</span>
            <Chip color={war.in_battery_warranty ? "success" : "danger"} variant="flat" size="sm">
              {war.in_battery_warranty ? "Active" : "Expired"}
            </Chip>
          </div>
          <Field label="Battery Expiration" value={fmtDate(war.battery_warranty_expiration_date)} />
        </CardBody>
      </Card>

      {/* Footer */}
      {showFooter && (
        <div className="pt-4 text-center text-xs text-slate-600">
          <p>Not affiliated with Tesla, Inc.</p>
          <p>Generated {fmtDate(meta.generated_at)} · v{meta.generator_version}</p>
        </div>
      )}
    </div>
  );
}
