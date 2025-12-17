import { NextRequest, NextResponse } from "next/server";

/**
 * Generate Stripe Connect OAuth URL and redirect founder
 * 
 * This route:
 * 1. Takes a startup ID from query params
 * 2. Generates a Stripe Connect OAuth URL with read-only scopes
 * 3. Redirects the user to Stripe
 * 
 * After OAuth, Stripe redirects to /api/providers/stripe/callback
 * 
 * Note: Stripe Connect OAuth uses a direct URL format, not the SDK
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startupId = searchParams.get("startup");

    if (!startupId) {
      return NextResponse.json({ error: "Missing startup ID" }, { status: 400 });
    }

    const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
    const redirectUri = `${baseUrl}/api/providers/stripe/callback`;
    const clientId = process.env.STRIPE_CLIENT_ID;

    if (!clientId) {
      return NextResponse.json(
        { error: "Stripe client ID not configured" },
        { status: 500 }
      );
    }

    // Store startup ID in state (base64 encoded JSON)
    // In production, use a secure session/token system
    const state = Buffer.from(JSON.stringify({ startupId })).toString("base64");

    // Stripe Connect OAuth URL
    // See: https://stripe.com/docs/connect/oauth-reference
    // Using read_only scope to ensure we can't charge customers
    const connectUrl = `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${clientId}&scope=read_only&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;

    return NextResponse.redirect(connectUrl);
  } catch (error: any) {
    console.error("Error creating Stripe Connect URL:", error);
    return NextResponse.json(
      { error: error.message || "Failed to initiate Stripe connection" },
      { status: 500 }
    );
  }
}
