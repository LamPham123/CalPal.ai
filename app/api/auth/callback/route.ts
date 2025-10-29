import { NextRequest, NextResponse } from "next/server";
import { getTokensFromCode, getUserInfo } from "@/lib/google-auth";
import { encrypt } from "@/lib/encryption";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  // Handle OAuth errors
  if (error) {
    console.error("OAuth error:", error);
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(error)}`, request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/?error=no_code", request.url)
    );
  }

  try {
    // Exchange code for tokens
    const tokens = await getTokensFromCode(code);

    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error("Missing tokens from Google");
    }

    // Get user info
    const userInfo = await getUserInfo(tokens.access_token);

    if (!userInfo.email) {
      throw new Error("No email found in user info");
    }

    // Encrypt tokens before storing
    const encryptedAccessToken = encrypt(tokens.access_token);
    const encryptedRefreshToken = encrypt(tokens.refresh_token);

    // Calculate expiry time
    const expiresAt = Date.now() + (tokens.expiry_date ? tokens.expiry_date - Date.now() : 3600 * 1000);

    // Get or create user in Convex
    const userId = await convex.mutation(api.users.getOrCreateUser, {
      email: userInfo.email,
      displayName: userInfo.name || userInfo.email,
      googleCalendarId: "primary", // Will fetch actual calendar ID later
    });

    // Store tokens in Convex
    await convex.mutation(api.auth.storeTokens, {
      userId,
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      expiresAt,
      scopes: tokens.scope?.split(" ") || [],
    });

    // Create session (simple cookie-based for now)
    const response = NextResponse.redirect(new URL("/dashboard", request.url));

    // Set session cookie
    response.cookies.set("user_id", userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error("Error in OAuth callback:", error);
    return NextResponse.redirect(
      new URL("/?error=auth_failed", request.url)
    );
  }
}
