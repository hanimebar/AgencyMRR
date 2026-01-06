import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Generate Stripe Connect OAuth URL and redirect founder
 * 
 * This route:
 * 1. Takes a startup ID from query params (startupId)
 * 2. Verifies the startup exists
 * 3. Generates a Stripe Connect OAuth URL with read_write scope
 * 4. Redirects the user to Stripe
 * 
 * After OAuth, Stripe redirects to /api/providers/stripe/callback
 */
export async function GET(request: NextRequest) {
  const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
  
  try {
    const searchParams = request.nextUrl.searchParams;
    const startupId = searchParams.get("startupId") || searchParams.get("startup");

    if (!startupId) {
      return NextResponse.redirect(`${baseUrl}/submit?error=missing_startup_id`);
    }

    // Verify startup exists using service-role client
    const { data: startup, error: startupError } = await supabaseAdmin
      .from("startups")
      .select("id")
      .eq("id", startupId)
      .single();

    if (startupError || !startup) {
      console.error("Startup not found for connect", { startupId, startupError });
      return NextResponse.redirect(`${baseUrl}/submit?error=startup_not_found`);
    }

    const redirectUri = `${baseUrl}/api/providers/stripe/callback`;
    const clientId = process.env.STRIPE_CLIENT_ID;

    if (!clientId) {
      console.error("STRIPE_CLIENT_ID not configured");
      return NextResponse.redirect(`${baseUrl}/submit?error=stripe_not_configured`);
    }

    // Build Stripe Connect OAuth URL
    // state must be set to the startup.id (uuid) as a string
    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      scope: "read_write",
      redirect_uri: redirectUri,
      state: startupId, // EXACTLY the startup.id as a string
    });

    const connectUrl = `https://connect.stripe.com/oauth/authorize?${params.toString()}`;

    return NextResponse.redirect(connectUrl);
  } catch (error: any) {
    console.error("Error creating Stripe Connect URL:", error);
    return NextResponse.redirect(
      `${baseUrl}/submit?error=${encodeURIComponent(error.message || "connect_failed")}`
    );
  }
}
