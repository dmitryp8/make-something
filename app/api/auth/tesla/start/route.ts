import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { buildAuthUrl } from "@/lib/tesla-api";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const state = randomBytes(16).toString("hex");

  // Store state in a short-lived cookie for CSRF protection
  const jar = await cookies();
  jar.set("tesla_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutes
    path: "/",
  });

  try {
    const redirectUri = new URL("/api/auth/tesla/callback", request.nextUrl.origin).toString();
    const url = buildAuthUrl(state, redirectUri);
    return NextResponse.redirect(url);
  } catch (err) {
    console.error("Tesla OAuth start error:", err);
    const fallbackUrl = new URL("/", request.nextUrl.origin);
    fallbackUrl.searchParams.set("error", "oauth_not_configured");
    return NextResponse.redirect(fallbackUrl);
  }
}
