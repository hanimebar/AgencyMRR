import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getProviderAdapter } from "@/lib/providers/registry";

/**
 * Handle Stripe OAuth callback
 * 
 * This route:
 * 1. Receives OAuth code from Stripe
 * 2. Exchanges code for access token
 * 3. Stores connection and token in database
 * 4. Immediately fetches metrics using the adapter
 * 5. Updates startup_metrics_current and history
 * 6. Redirects to startup detail page
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      return NextResponse.redirect(
        `${process.env.APP_BASE_URL || "http://localhost:3000"}/submit?error=${error}`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.APP_BASE_URL || "http://localhost:3000"}/submit?error=missing_params`
      );
    }

    // Decode state to get startup ID
    let startupId: string;
    try {
      const decoded = JSON.parse(Buffer.from(state, "base64").toString());
      startupId = decoded.startupId;
    } catch {
      return NextResponse.redirect(
        `${process.env.APP_BASE_URL || "http://localhost:3000"}/submit?error=invalid_state`
      );
    }

    // Exchange code for access token
    // Stripe Connect OAuth uses client_id and client_secret
    const clientId = process.env.STRIPE_CLIENT_ID;
    const clientSecret = process.env.STRIPE_PLATFORM_SECRET_KEY;

    if (!clientId || !clientSecret) {
      throw new Error("Stripe credentials not configured");
    }

    const tokenResponse = await fetch("https://connect.stripe.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Stripe OAuth error:", errorText);
      throw new Error("Failed to exchange OAuth code");
    }

    const response = await tokenResponse.json();

    const accountId = response.stripe_user_id;
    const accessToken = response.access_token;
    const refreshToken = response.refresh_token;

    if (!accountId || !accessToken) {
      throw new Error("Missing account ID or access token from Stripe");
    }

    // Get startup to get slug for redirect
    const { data: startup, error: startupError } = await supabaseAdmin
      .from("startups")
      .select("slug")
      .eq("id", startupId)
      .single();

    if (startupError || !startup) {
      throw new Error("Startup not found");
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
          provider_account_id: accountId,
          status: "connected",
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingConnection.id)
        .select()
        .single();

      if (updateError) throw updateError;
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
          provider_account_id: accountId,
          status: "connected",
          connected_at: new Date().toISOString(),
          last_synced_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (connError) throw connError;
      connectionId = connection.id;

      // Create token
      await supabaseAdmin.from("provider_tokens").insert({
        provider_connection_id: connectionId,
        access_token: accessToken,
        refresh_token: refreshToken,
        scope: "read_only",
      });
    }

    // Immediately fetch metrics using the adapter
    try {
      const adapter = getProviderAdapter("stripe");
      const metrics = await adapter.fetchMetrics({
        providerConnectionId: connectionId,
        providerAccountId: accountId,
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
    } catch (metricsError) {
      console.error("Error fetching metrics:", metricsError);
      // Don't fail the OAuth flow if metrics fail - we can retry later
    }

    // Redirect to startup page
    return NextResponse.redirect(
      `${process.env.APP_BASE_URL || "http://localhost:3000"}/startup/${startup.slug}?connected=1`
    );
  } catch (error: any) {
    console.error("Error in Stripe callback:", error);
    return NextResponse.redirect(
      `${process.env.APP_BASE_URL || "http://localhost:3000"}/submit?error=${encodeURIComponent(error.message)}`
    );
  }
}
