/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SectionsJson } from "./types";

const MILES_TO_KM = 1.60934;

/** Known Tesla warranty rules (can be extended). */
const WARRANTY_RULES: Record<string, { baseMiles: number; baseYears: number; battMiles: number; battYears: number }> = {
  "Model S": { baseMiles: 50000, baseYears: 4, battMiles: 150000, battYears: 8 },
  "Model X": { baseMiles: 50000, baseYears: 4, battMiles: 150000, battYears: 8 },
  "Model 3": { baseMiles: 50000, baseYears: 4, battMiles: 120000, battYears: 8 },
  "Model Y": { baseMiles: 50000, baseYears: 4, battMiles: 120000, battYears: 8 },
};

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

/**
 * Transform raw Tesla API responses into the unified sections_json format.
 */
export function transformToSections(
  vehicleData: any,
  optionsData: any,
  warrantyData: any,
  vehicleDbRecord: { vin: string; make: string; model: string; year: number; trim: string | null },
): SectionsJson {
  const charge = vehicleData?.charge_state ?? {};
  const state = vehicleData?.vehicle_state ?? {};
  const config = vehicleData?.vehicle_config ?? {};

  // Battery snapshot
  const battery_snapshot = {
    battery_level_percent: charge.battery_level ?? null,
    est_range_miles: charge.battery_range ? Math.round(charge.battery_range) : null,
    est_range_km: charge.battery_range ? Math.round(charge.battery_range * MILES_TO_KM) : null,
    charge_limit_percent: charge.charge_limit_soc ?? null,
    last_charge_timestamp: charge.timestamp ? new Date(charge.timestamp).toISOString() : null,
  };

  // Vehicle basics
  const odometer = state.odometer ?? null;
  const vehicle_basics = {
    vin: vehicleDbRecord.vin,
    make: vehicleDbRecord.make,
    model: vehicleDbRecord.model,
    year: vehicleDbRecord.year,
    trim: vehicleDbRecord.trim ?? config.trim_badging ?? null,
    odometer_miles: odometer ? Math.round(odometer) : null,
    odometer_km: odometer ? Math.round(odometer * MILES_TO_KM) : null,
    exterior_color: safe(() => config.exterior_color, null),
    interior_color: safe(() => config.interior_trim_type, null),
    license_plate: null,
    location_country: null,
  };

  // Options
  const rawCodes: string[] = safe(() => {
    if (Array.isArray(optionsData?.options)) {
      return optionsData.options.map((o: any) => o.code ?? o);
    }
    if (typeof optionsData?.option_codes === "string") {
      return optionsData.option_codes.split(",");
    }
    return [];
  }, []);

  const parsedOptions: string[] = safe(() => {
    if (Array.isArray(optionsData?.options)) {
      return optionsData.options
        .filter((o: any) => o.name || o.description)
        .map((o: any) => o.name ?? o.description);
    }
    return [];
  }, []);

  const options_configuration = {
    options_codes: rawCodes,
    parsed_options: parsedOptions,
  };

  // Software
  const software_system = {
    firmware_version: state.car_version?.split(" ")[0] ?? null,
    hardware_ap: safe(() => {
      const hw = vehicleData?.vehicle_config?.autopilot_type;
      if (hw) return hw;
      return null;
    }, null),
    connectivity: safe(() => config.connectivity ?? null, null),
    last_update_timestamp: state.car_version ? null : null, // Tesla doesn't expose this directly
  };

  // Warranty
  const rules = WARRANTY_RULES[vehicleDbRecord.model] ?? WARRANTY_RULES["Model 3"];
  const purchaseYear = vehicleDbRecord.year;

  // Approximate warranty expiration based on year of manufacture
  const baseExpDate = `${purchaseYear + rules.baseYears}-12-31`;
  const battExpDate = `${purchaseYear + rules.battYears}-12-31`;
  const now = new Date();

  // If warranty API data is available, use it; otherwise approximate
  const warrantyInfo = safe(() => warrantyData?.warranty ?? warrantyData, null);

  const warranty_snapshot = {
    base_warranty_miles: rules.baseMiles,
    base_warranty_years: rules.baseYears,
    battery_warranty_miles: rules.battMiles,
    battery_warranty_years: rules.battYears,
    in_base_warranty: warrantyInfo?.in_base_warranty ?? (new Date(baseExpDate) > now && (odometer ?? 0) < rules.baseMiles),
    in_battery_warranty: warrantyInfo?.in_battery_warranty ?? (new Date(battExpDate) > now && (odometer ?? 0) < rules.battMiles),
    base_warranty_expiration_date: warrantyInfo?.base_expiration_date ?? baseExpDate,
    battery_warranty_expiration_date: warrantyInfo?.battery_expiration_date ?? battExpDate,
  };

  return {
    battery_snapshot,
    vehicle_basics,
    options_configuration,
    software_system,
    warranty_snapshot,
    meta: {
      generated_at: new Date().toISOString(),
      generator_version: "1.0.0",
    },
  };
}
