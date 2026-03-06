/**
 * Tesla Fleet API client.
 *
 * Auth server:  https://fleet-auth.prd.vn.cloud.tesla.com
 * API base:     https://fleet-api.prd.na.vn.cloud.tesla.com
 */

const AUTH_BASE = "https://fleet-auth.prd.vn.cloud.tesla.com";
const API_BASE = "https://fleet-api.prd.na.vn.cloud.tesla.com";

/* ── helpers ── */

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing env var: ${name}`);
  return val;
}

function resolveRedirectUri(fallback?: string): string {
  return process.env.TESLA_REDIRECT_URI ?? fallback ?? requireEnv("TESLA_REDIRECT_URI");
}

/* eslint-disable @typescript-eslint/no-explicit-any */

async function apiFetch(path: string, accessToken: string): Promise<any> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Tesla API ${path} ${res.status}: ${body}`);
  }
  return res.json();
}

/* ── OAuth ── */

export function buildAuthUrl(state: string, fallbackRedirectUri?: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: requireEnv("TESLA_CLIENT_ID"),
    redirect_uri: resolveRedirectUri(fallbackRedirectUri),
    scope: "openid vehicle_device_data offline_access",
    state,
  });
  return `${AUTH_BASE}/oauth2/v3/authorize?${params}`;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export async function exchangeCode(code: string, fallbackRedirectUri?: string): Promise<TokenResponse> {
  const res = await fetch(`${AUTH_BASE}/oauth2/v3/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: requireEnv("TESLA_CLIENT_ID"),
      client_secret: requireEnv("TESLA_CLIENT_SECRET"),
      code,
      redirect_uri: resolveRedirectUri(fallbackRedirectUri),
      audience: API_BASE,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Tesla token exchange failed ${res.status}: ${body}`);
  }

  return res.json() as Promise<TokenResponse>;
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const res = await fetch(`${AUTH_BASE}/oauth2/v3/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: requireEnv("TESLA_CLIENT_ID"),
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Tesla token refresh failed ${res.status}: ${body}`);
  }

  return res.json() as Promise<TokenResponse>;
}

/* ── Vehicle endpoints ── */

export async function listVehicles(accessToken: string): Promise<any[]> {
  const data = await apiFetch("/api/1/vehicles", accessToken);
  return data.response ?? [];
}

export async function getVehicleData(vin: string, accessToken: string): Promise<any> {
  const data = await apiFetch(
    `/api/1/vehicles/${vin}/vehicle_data?endpoints=${encodeURIComponent(
      "charge_state;vehicle_state;vehicle_config;drive_state"
    )}`,
    accessToken,
  );
  return data.response ?? data;
}

export async function getVehicleOptions(vin: string, accessToken: string): Promise<any> {
  const data = await apiFetch(`/api/1/dx/vehicles/options?vin=${vin}`, accessToken);
  return data;
}

export async function getWarrantyDetails(accessToken: string): Promise<any> {
  const data = await apiFetch("/api/1/dx/warranty/details", accessToken);
  return data;
}

export async function wakeUp(vin: string, accessToken: string): Promise<void> {
  await fetch(`${API_BASE}/api/1/vehicles/${vin}/wake_up`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
