import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getProviderAdapter } from "@/lib/providers/registry";

export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_PLATFORM_SECRET_KEY || "", {
  apiVersion: "2023-10-16",
});

/**
 * Handle Stripe OAuth callback
 * 
 * This route:
 * 1. Receives OAuth code from Stripe
 * 2. Exchanges code for access token using Stripe SDK
 * 3. Stores connection and token in database
 * 4. Immediately fetches metrics using the adapter
 * 5. Updates startup_metrics_current and history
 * 6. Redirects to startup detail page
 */
export async function GET(request: NextRequest) {
  const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
  
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      console.error("Stripe OAuth error:", error);
      return NextResponse.redirect(
        `${baseUrl}/submit?error=${error}`
      );
    }

    if (!code || !state) {
      console.error("Missing code or state in callback");
      return NextResponse.redirect(
        `${baseUrl}/submit?error=missing_params`
      );
    }

    // Treat state as startupId directly (UUID string)
    const startupId = state;

    // Verify startup exists
    const { data: startup, error: startupError } = await supabaseAdmin
      .from("startups")
      .select("id, slug")
      .eq("id", startupId)
      .single();

    if (startupError || !startup) {
      console.error("Startup not found for ID:", startupId, startupError);
      return NextResponse.redirect(
        `${baseUrl}/submit?error=startup_not_found`
      );
    }

    // Exchange code for access token using Stripe SDK
    let tokenResponse;
    try {
      tokenResponse = await stripe.oauth.token({
        grant_type: "authorization_code",
        code,
      });
    } catch (stripeError: any) {
      console.error("Stripe token exchange failed:", stripeError);
      return NextResponse.redirect(
        `${baseUrl}/submit?error=token_exchange_failed`
      );
    }

    const stripeAccountId = tokenResponse.stripe_user_id;
    const accessToken = tokenResponse.access_token;
    const refreshToken = tokenResponse.refresh_token;

    if (!stripeAccountId || !accessToken) {
      console.error("Missing account ID or access token from Stripe");
      return NextResponse.redirect(
        `${baseUrl}/submit?error=missing_stripe_data`
      );
    }

    // Create or update provider connection
    const { data: existingConnection } = await supabaseAdmin
      .from("provider_connections")
      .select("id")
      .eq("startup_id", startupId)
      .eq("provider", "stripe")
      .single();

    let connectionId: string;

    if (existingConnection) {
      // Update existing connection
      const { data: updated, error: updateError } = await supabaseAdmin
        .from("provider_connections")
        .update({
          provider_account_id: stripeAccountId,
          status: "connected",
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingConnection.id)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating provider connection:", updateError);
        throw updateError;
      }
      connectionId = updated.id;

      // Update token
      await supabaseAdmin
        .from("provider_tokens")
        .update({
          access_token: accessToken,
          refresh_token: refreshToken,
          updated_at: new Date().toISOString(),
        })
        .eq("provider_connection_id", connectionId);
    } else {
      // Create new connection
      const { data: connection, error: connError } = await supabaseAdmin
        .from("provider_connections")
        .insert({
          startup_id: startupId,
          provider: "stripe",
          provider_account_id: stripeAccountId,
          status: "connected",
          connected_at: new Date().toISOString(),
          last_synced_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (connError) {
        console.error("Error creating provider connection:", connError);
        throw connError;
      }
      connectionId = connection.id;

      // Create token
      await supabaseAdmin.from("provider_tokens").insert({
        provider_connection_id: connectionId,
        access_token: accessToken,
        refresh_token: refreshToken,
        scope: "read_write",
      });
    }

    // Immediately fetch metrics using the adapter
    try {
      const adapter = getProviderAdapter("stripe");
      const metrics = await adapter.fetchMetrics({
        providerConnectionId: connectionId,
        providerAccountId: stripeAccountId,
        accessToken,
        refreshToken,
      });

      // Update current metrics
      await supabaseAdmin
        .from("startup_metrics_current")
        .upsert({
          startup_id: startupId,
          currency: metrics.currency,
          mrr: metrics.mrr,
          total_revenue: metrics.totalRevenue,
          last_30d_revenue: metrics.last30dRevenue,
          provider: "stripe",
          provider_last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "startup_id",
        });

      // Add to history
      await supabaseAdmin.from("startup_metrics_history").insert({
        startup_id: startupId,
        currency: metrics.currency,
        mrr: metrics.mrr,
        total_revenue: metrics.totalRevenue,
        last_30d_revenue: metrics.last30dRevenue,
        provider: "stripe",
        snapshot_date: new Date().toISOString().split("T")[0],
      });
    } catch (metricsError: any) {
      console.error("Error fetching metrics:", metricsError);
      // Don't fail the OAuth flow if metrics fail - we can retry later
    }

    // Redirect to startup page with success indicator
    return NextResponse.redirect(
      `${baseUrl}/startup/${startup.slug}?connected=1`
    );
  } catch (error: any) {
    console.error("Error in Stripe callback:", error);
    return NextResponse.redirect(
      `${baseUrl}/submit?error=${encodeURIComponent(error.message || "unknown_error")}`
    );
  }
}
