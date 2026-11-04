import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role") || "STUDENT";
    const orgType = searchParams.get("orgType") || "";
    const action = searchParams.get("action") || "login";

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const redirectUri = `${appUrl.replace(/\/$/, "")}/api/v1/auth/google/callback`;

    if (!clientId) {
      return NextResponse.json({
        configured: false,
        error: "GOOGLE_CLIENT_ID is not configured in .env. Please see SETUP.md for Google OAuth setup instructions.",
      });
    }

    // State payload with cryptographic nonce to prevent CSRF
    const statePayload = {
      role,
      orgType,
      action,
      nonce: Math.random().toString(36).substring(2, 15),
      timestamp: Date.now(),
    };
    const state = Buffer.from(JSON.stringify(statePayload)).toString("base64url");

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      state,
      access_type: "offline",
      prompt: "select_account",
    });

    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    return NextResponse.json({
      configured: true,
      url: googleAuthUrl,
    });
  } catch (error: any) {
    console.error("[Google OAuth URL Error]:", error);
    return NextResponse.json(
      { error: "Failed to generate Google authentication URL" },
      { status: 500 }
    );
  }
}
