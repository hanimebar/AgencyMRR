import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_PLATFORM_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = "force-dynamic";

/**
 * Handle Stripe OAuth callback
 * 
 * This route:
 * 1. Reads code and state from query params
 * 2. Exchanges code for token via Stripe OAuth
 * 3. Looks up startup by state (startup.id)
 * 4. Inserts/updates row into provider_connections
 * 5. Redirects to /startup/[slug]?connected=1 on success
 * 6. Returns error response (not redirect) on failure
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code || !state) {
    console.error("Stripe callback missing code or state", { code, state });
    return new NextResponse("Stripe callback missing code or state", { status: 400 });
  }

  let token;
  try {
    token = await stripe.oauth.token({
      grant_type: "authorization_code",
      code,
    });
  } catch (err: any) {
    console.error("Stripe oauth.token failed", err?.message || err);
    return new NextResponse("Stripe oauth.token failed: " + (err?.message || "unknown error"), {
      status: 400,
    });
  }

  const stripeAccountId = token.stripe_user_id;
  if (!stripeAccountId) {
    console.error("No stripe_user_id in token", token);
    return new NextResponse("No stripe_user_id in token", { status: 400 });
  }

  const startupId = state;

  const { data: startup, error: startupError } = await supabaseAdmin
    .from("startups")
    .select("id, slug")
    .eq("id", startupId)
    .single();

  if (startupError || !startup) {
    console.error("Startup not found for state", { startupId, startupError });
    return new NextResponse("Startup not found for this Stripe connection.", { status: 400 });
  }

  const now = new Date().toISOString();

  // Check if connection already exists
  const { data: existingConnection } = await supabaseAdmin
    .from("provider_connections")
    .select("id")
    .eq("startup_id", startup.id)
    .eq("provider", "stripe")
    .maybeSingle();

  let connError;
  if (existingConnection) {
    // Update existing connection
    const { error } = await supabaseAdmin
      .from("provider_connections")
      .update({
        provider_account_id: stripeAccountId,
        status: "connected",
        connected_at: now,
        last_synced_at: now,
        updated_at: now,
      })
      .eq("id", existingConnection.id);
    connError = error;
  } else {
    // Insert new connection
    const { error } = await supabaseAdmin
      .from("provider_connections")
      .insert({
        startup_id: startup.id,
        provider: "stripe",
        provider_account_id: stripeAccountId,
        status: "connected",
        connected_at: now,
        last_synced_at: now,
        updated_at: now,
      });
    connError = error;
  }

  if (connError) {
    console.error("Failed to save provider_connections", connError);
    return new NextResponse(
      "Failed to record provider connection: " + (connError.message || JSON.stringify(connError)),
      { status: 500 }
    );
  }

  // Store tokens in provider_tokens table
  let connectionId: string;
  if (existingConnection) {
    connectionId = existingConnection.id;
  } else {
    // Fetch the newly inserted connection
    const { data: newConnection } = await supabaseAdmin
      .from("provider_connections")
      .select("id")
      .eq("startup_id", startup.id)
      .eq("provider", "stripe")
      .single();
    
    if (!newConnection) {
      console.error("Could not find connection after insert");
      // Still redirect - connection might be there but query failed
      const redirectUrl = `/startup/${startup.slug}?connected=1`;
      return NextResponse.redirect(redirectUrl);
    }
    connectionId = newConnection.id;
  }

  // Store tokens
  if (token.access_token) {
    const { error: tokenError } = await supabaseAdmin
      .from("provider_tokens")
      .upsert(
        {
          provider_connection_id: connectionId,
          access_token: token.access_token,
          refresh_token: token.refresh_token || null,
          scope: "read_write",
          updated_at: now,
        },
        {
          onConflict: "provider_connection_id",
        }
      );
    
    if (tokenError) {
      console.error("Failed to store tokens (non-fatal):", tokenError);
      // Don't fail the flow if token storage fails
    }
  }

  // (Optional) Metrics fetch can be added here later. For now, just confirm connect works.

  const redirectUrl = `/startup/${startup.slug}?connected=1`;
  return NextResponse.redirect(redirectUrl);
}
