import type { SectionsJson } from "./types";

export interface CompareDelta {
  previous_report_number: string;
  previous_generated_at: string | null;
  days_between: number | null;
  odometer_delta: number | null;
  battery_delta: number | null;
  range_delta: number | null;
  health_score_delta: number | null;
}

export function computeDelta(
  current: SectionsJson,
  previous: SectionsJson,
  prevReportNumber: string,
  prevGeneratedAt: string | null,
): CompareDelta {
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
