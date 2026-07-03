/* ── Report sections_json shape ── */

export interface BatterySnapshot {
  battery_level_percent: number | null;
  usable_battery_level: number | null;
  est_range_miles: number | null;
  est_range_km: number | null;
  charge_limit_percent: number | null;
  last_charge_timestamp: string | null;
}

export interface VehicleBasics {
  vin: string;
  make: string;
  model: string;
  year: number;
  trim: string | null;
  odometer_miles: number | null;
  odometer_km: number | null;
  exterior_color: string | null;
  interior_color: string | null;
  license_plate: string | null;
  location_country: string | null;
}

export interface OptionsConfiguration {
  options_codes: string[];
  parsed_options: string[];
}

export interface SoftwareSystem {
  firmware_version: string | null;
  hardware_ap: string | null;
  connectivity: string | null;
  last_update_timestamp: string | null;
}

export interface WarrantySnapshot {
  base_warranty_miles: number;
  base_warranty_years: number;
  battery_warranty_miles: number;
  battery_warranty_years: number;
  in_base_warranty: boolean;
  in_battery_warranty: boolean;
  base_warranty_expiration_date: string | null;
  battery_warranty_expiration_date: string | null;
}

export interface ReportMeta {
  generated_at: string;
  generator_version: string;
  health_score: number | null;
}

export interface SectionsJson {
  battery_snapshot: BatterySnapshot;
  vehicle_basics: VehicleBasics;
  options_configuration: OptionsConfiguration;
  software_system: SoftwareSystem;
  warranty_snapshot: WarrantySnapshot;
  meta: ReportMeta;
}

/* ── API response shapes ── */

export interface VehicleListItem {
  id: string;
  vin: string;
  make: string;
  model: string;
  year: number;
  trim: string | null;
  odometer_miles: number | null;
  last_seen_at: string;
}

export interface ReportListItem {
  id: string;
  report_number: string;
  vehicle: {
    model: string;
    year: number;
    vin: string;
  };
  status: string;
  generated_at: string | null;
}

export interface ReportDetail {
  id: string;
  report_number: string;
  status: string;
  vehicle: {
    id: string;
    vin: string;
    make: string;
    model: string;
    year: number;
    trim: string | null;
  };
  sections: SectionsJson | null;
  pdf_url: string | null;
  generated_at: string | null;
  share_token: string | null;
}
