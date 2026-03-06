import type { SectionsJson } from "@/lib/types";

export interface SamplePublicReport {
  report_number: string;
  vehicle: {
    vin: string;
    make: string;
    model: string;
    year: number;
    trim: string | null;
  };
  sections: SectionsJson;
  pdf_url: string | null;
  generated_at: string;
}

export const SAMPLE_PUBLIC_REPORT: SamplePublicReport = {
  report_number: "OUT-2026-000001",
  vehicle: {
    vin: "5YJ3E1EA9LF000001",
    make: "Tesla",
    model: "Model 3",
    year: 2020,
    trim: "Long Range AWD",
  },
  sections: {
    battery_snapshot: {
      battery_level_percent: 78,
      est_range_miles: 248,
      est_range_km: 399,
      charge_limit_percent: 85,
      last_charge_timestamp: "2026-03-04T21:10:00.000Z",
    },
    vehicle_basics: {
      vin: "5YJ3E1EA9LF000001",
      make: "Tesla",
      model: "Model 3",
      year: 2020,
      trim: "Long Range AWD",
      odometer_miles: 48210,
      odometer_km: 77586,
      exterior_color: "Midnight Silver Metallic",
      interior_color: "Black",
      license_plate: null,
      location_country: "US",
    },
    options_configuration: {
      options_codes: ["AD15", "BTX8", "PPSW", "W39B", "TM00", "UTAB"],
      parsed_options: [
        "19” Sport Wheels",
        "Premium Interior",
        "Autopilot Hardware",
        "All-Wheel Drive",
        "Glass Roof",
        "Heated Seats",
      ],
    },
    software_system: {
      firmware_version: "2026.4.10",
      hardware_ap: "HW3",
      connectivity: "Online",
      last_update_timestamp: "2026-03-01T18:32:00.000Z",
    },
    warranty_snapshot: {
      base_warranty_miles: 50000,
      base_warranty_years: 4,
      battery_warranty_miles: 120000,
      battery_warranty_years: 8,
      in_base_warranty: false,
      in_battery_warranty: true,
      base_warranty_expiration_date: "2024-09-15",
      battery_warranty_expiration_date: "2028-09-15",
    },
    meta: {
      generated_at: "2026-03-04T21:15:00.000Z",
      generator_version: "1.0.0-sample",
    },
  },
  pdf_url: null,
  generated_at: "2026-03-04T21:15:00.000Z",
};
