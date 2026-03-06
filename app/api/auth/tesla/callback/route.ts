import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encryption";
import { createSession } from "@/lib/auth";
import { exchangeCode } from "@/lib/tesla-api";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code || !state) {
    return NextResponse.json({ error: "Missing code or state" }, { status: 400 });
  }

  // Verify CSRF state
  const jar = await cookies();
  const savedState = jar.get("tesla_oauth_state")?.value;
  jar.delete("tesla_oauth_state");

  if (state !== savedState) {
    return NextResponse.json({ error: "Invalid state parameter" }, { status: 403 });
  }

  try {
    const redirectUri = new URL("/api/auth/tesla/callback", request.nextUrl.origin).toString();
    // Exchange code for tokens
    const tokens = await exchangeCode(code, redirectUri);

    // Decode the access_token JWT to get the user's sub (Tesla ID)
    // The sub claim is a stable identifier for the Tesla account
    const payload = JSON.parse(
      Buffer.from(tokens.access_token.split(".")[1], "base64").toString(),
    );
    const teslaSub = payload.sub as string;
    const email = (payload.email as string | undefined) ?? `${teslaSub}@tesla.user`;

    // Upsert user
    const user = await prisma.user.upsert({
      where: { email },
      create: { email },
      update: {},
    });

    // Upsert Tesla connection (revoke old ones first)
    await prisma.teslaConnection.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await prisma.teslaConnection.create({
      data: {
        userId: user.id,
        accessToken: encrypt(tokens.access_token),
        refreshToken: encrypt(tokens.refresh_token),
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        scope: "openid vehicle_device_data offline_access",
      },
    });

    // Create session
    await createSession({ userId: user.id, email: user.email });

    return NextResponse.redirect(new URL("/dashboard", request.nextUrl.origin));
  } catch (err) {
    console.error("Tesla OAuth callback error:", err);
    return NextResponse.redirect(new URL("/?error=auth_failed", request.nextUrl.origin));
  }
}
