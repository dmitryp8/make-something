import { prisma } from "./prisma";
import { encrypt, decrypt } from "./encryption";
import { refreshAccessToken } from "./tesla-api";

/**
 * Get the active (non-revoked) Tesla connection for a user.
 * Auto-refreshes the token if it's about to expire (< 5 min).
 * Returns the decrypted access token ready to use.
 */
export async function getActiveTeslaToken(userId: string): Promise<string | null> {
  const conn = await prisma.teslaConnection.findFirst({
    where: { userId, revokedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!conn) return null;

  const now = new Date();
  const fiveMinFromNow = new Date(now.getTime() + 5 * 60 * 1000);

  // If token is still valid, return it
  if (conn.expiresAt > fiveMinFromNow) {
    return decrypt(conn.accessToken);
  }

  // Token expired or about to expire — refresh
  try {
    const oldRefresh = decrypt(conn.refreshToken);
    const newTokens = await refreshAccessToken(oldRefresh);

    await prisma.teslaConnection.update({
      where: { id: conn.id },
      data: {
        accessToken: encrypt(newTokens.access_token),
        refreshToken: encrypt(newTokens.refresh_token),
        expiresAt: new Date(Date.now() + newTokens.expires_in * 1000),
      },
    });

    return newTokens.access_token;
  } catch (err) {
    console.error("Failed to refresh Tesla token:", err);
    // Mark as revoked since we can't refresh
    await prisma.teslaConnection.update({
      where: { id: conn.id },
      data: { revokedAt: new Date() },
    });
    return null;
  }
}
