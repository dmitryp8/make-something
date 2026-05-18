import type { SectionsJson } from "./types";

export interface HealthScoreResult {
  score: number;
  band: "green" | "yellow" | "red";
}

/**
 * Compute a 0-100 health score from current report sections + history.
 *
 * Deductions:
 *   usable_battery_level < 90  → (90 - level) * 0.5  (max 45 pts)
 *   charge_limit < 80          → -10
 *   odometer > 100k miles      → -10
 *   odometer > 50k miles       → -5  (mutually exclusive with above)
 *   degradation vs first report > 20% → -15
 *   degradation vs first report > 10% → -10
 *
 * history should be ordered oldest-first; history[0] is the degradation baseline.
 * Empty history → no degradation penalty.
 * Score clamped to [0, 100].
 */
export function computeHealthScore(
  sections: SectionsJson,
  history: SectionsJson[],
): HealthScoreResult {
  let score = 100;

  const usable = sections.battery_snapshot.usable_battery_level;
  const chargeLimit = sections.battery_snapshot.charge_limit_percent;
  const odometer = sections.vehicle_basics.odometer_miles;

  if (usable !== null && usable < 90) {
    score -= (90 - usable) * 0.5;
  }

  if (chargeLimit !== null && chargeLimit < 80) {
    score -= 10;
  }

  if (odometer !== null) {
    if (odometer > 100_000) score -= 10;
    else if (odometer > 50_000) score -= 5;
  }

  if (history.length >= 1) {
    const firstUsable = history[0].battery_snapshot.usable_battery_level;
    if (firstUsable !== null && firstUsable > 0 && usable !== null) {
      const degradationPct = ((firstUsable - usable) / firstUsable) * 100;
      if (degradationPct > 20) score -= 15;
      else if (degradationPct > 10) score -= 10;
    }
  }

  const clamped = Math.round(Math.max(0, Math.min(100, score)));
  const band: "green" | "yellow" | "red" =
    clamped >= 80 ? "green" : clamped >= 60 ? "yellow" : "red";

  return { score: clamped, band };
}
