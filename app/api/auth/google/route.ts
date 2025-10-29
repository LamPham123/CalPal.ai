import { NextResponse } from "next/server";
import { getAuthorizationUrl } from "@/lib/google-auth";

export async function GET() {
  try {
    console.log("🔐 Environment check:");
    console.log("  GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID?.substring(0, 20) + "...");
    console.log("  GOOGLE_REDIRECT_URI:", process.env.GOOGLE_REDIRECT_URI);

    const authUrl = getAuthorizationUrl();
    console.log("  Generated auth URL redirect_uri:", new URL(authUrl).searchParams.get("redirect_uri"));

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("Error generating auth URL:", error);
    return NextResponse.json(
      { error: "Failed to initiate OAuth flow" },
      { status: 500 }
    );
  }
}
