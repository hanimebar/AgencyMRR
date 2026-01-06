import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getProviderAdapter } from "@/lib/providers/registry";

export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_PLATFORM_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

/**
 * Handle Stripe OAuth callback
 * 
 * This route:
 * 1. Receives OAuth code from Stripe
 * 2. Exchanges code for access token using Stripe SDK
 * 3. Always upserts into provider_connections
 * 4. Fetches metrics using the adapter
 * 5. Updates startup_metrics_current and history
 * 6. Redirects to /startup/[slug]?connected=1 on success
 */
export async function GET(req: NextRequest) {
  const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state"); // this must be startupId

  if (!code || !state) {
    console.error("Stripe callback missing code or state", { code, state });
    return NextResponse.redirect(`${baseUrl}/submit?error=missing_params`);
  }

  // Exchange code for token using Stripe SDK
  let token;
  try {
    token = await stripe.oauth.token({
      grant_type: "authorization_code",
      code,
    });
  } catch (err: any) {
    console.error("Stripe oauth.token failed", err?.message || err);
    return NextResponse.redirect(`${baseUrl}/submit?error=token_exchange_failed`);
  }

  const stripeAccountId = token.stripe_user_id;
  if (!stripeAccountId) {
    console.error("No stripe_user_id in token", token);
    return NextResponse.redirect(`${baseUrl}/submit?error=missing_stripe_account_id`);
  }

  const startupId = state; // state is the startup.id directly

  // 1) Fetch startup by id
  const { data: startup, error: startupError } = await supabaseAdmin
    .from("startups")
    .select("id, slug")
    .eq("id", startupId)
    .single();

  if (startupError || !startup) {
    console.error("Startup not found for state", { startupId, startupError });
    return NextResponse.redirect(`${baseUrl}/submit?error=startup_not_found`);
  }

  // 2) Upsert into provider_connections
  const now = new Date().toISOString();

  // First, try to find existing connection
  const { data: existingConnection } = await supabaseAdmin
    .from("provider_connections")
    .select("id")
    .eq("startup_id", startup.id)
    .eq("provider", "stripe")
    .maybeSingle();

  let connectionId: string;
  let connection;

  if (existingConnection) {
    // Update existing connection
    const { data: updated, error: updateError } = await supabaseAdmin
      .from("provider_connections")
      .update({
        provider_account_id: stripeAccountId,
        status: "connected",
        connected_at: now,
        last_synced_at: now,
        updated_at: now,
      })
      .eq("id", existingConnection.id)
      .select()
      .single();

    if (updateError) {
      console.error("Failed to update provider_connections", updateError);
      // Still redirect to startup page
      return NextResponse.redirect(`/startup/${startup.slug}?connected=1`);
    }
    connection = updated;
    connectionId = updated.id;
  } else {
    // Insert new connection
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("provider_connections")
      .insert({
        startup_id: startup.id,
        provider: "stripe",
        provider_account_id: stripeAccountId,
        status: "connected",
        connected_at: now,
        last_synced_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to insert provider_connections", insertError);
      // Still redirect to startup page
      return NextResponse.redirect(`/startup/${startup.slug}?connected=1`);
    }
    connection = inserted;
    connectionId = inserted.id;
  }


  // Store tokens
  const accessToken = token.access_token;
  const refreshToken = token.refresh_token;

  if (accessToken) {
    // Upsert token
    await supabaseAdmin
      .from("provider_tokens")
      .upsert(
        {
          provider_connection_id: connectionId,
          access_token: accessToken,
          refresh_token: refreshToken || null,
          scope: "read_only",
          updated_at: now,
        },
        {
          onConflict: "provider_connection_id",
        }
      );
  }

  // 3) Fetch metrics via existing provider adapter
  try {
    const adapter = getProviderAdapter("stripe");
    const metrics = await adapter.fetchMetrics({
      providerConnectionId: connectionId,
      providerAccountId: stripeAccountId,
      accessToken: accessToken!,
      refreshToken: refreshToken || undefined,
    });

    // Upsert metrics into startup_metrics_current
    await supabaseAdmin
      .from("startup_metrics_current")
      .upsert(
        {
          startup_id: startup.id,
          currency: metrics.currency,
          mrr: metrics.mrr,
          total_revenue: metrics.totalRevenue,
          last_30d_revenue: metrics.last30dRevenue,
          provider: "stripe",
          provider_last_synced_at: now,
          updated_at: now,
        },
        {
          onConflict: "startup_id",
        }
      );

    // Add to history
    await supabaseAdmin.from("startup_metrics_history").insert({
      startup_id: startup.id,
      currency: metrics.currency,
      mrr: metrics.mrr,
      total_revenue: metrics.totalRevenue,
      last_30d_revenue: metrics.last30dRevenue,
      provider: "stripe",
      snapshot_date: new Date().toISOString().split("T")[0],
    });
  } catch (err: any) {
    console.error("Failed to fetch/write Stripe metrics", err?.message || err);
    // Don't fail the OAuth flow if metrics fail - we can retry later
  }

  // 4) Redirect to startup detail page (use relative URL)
  return NextResponse.redirect(`/startup/${startup.slug}?connected=1`);
}
