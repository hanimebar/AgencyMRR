import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

/**
 * Handle Stripe OAuth callback
 */
export async function GET(req: NextRequest) {
  try {
    // Validate environment variables first
    const stripeKey = process.env.STRIPE_PLATFORM_SECRET_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!stripeKey) {
      console.error("STRIPE_PLATFORM_SECRET_KEY is not set");
      return new NextResponse("Server configuration error: Stripe key missing", { status: 500 });
    }

    if (!supabaseUrl || !supabaseKey) {
      console.error("Supabase credentials missing", { hasUrl: !!supabaseUrl, hasKey: !!supabaseKey });
      return new NextResponse("Server configuration error: Supabase credentials missing", { status: 500 });
    }

    // Initialize clients inside the function
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (!code || !state) {
      console.error("Stripe callback missing code or state", { code, state });
      return new NextResponse("Stripe callback missing code or state", { status: 400 });
    }

    // Step 1: Exchange code for token
    let token;
    try {
      token = await stripe.oauth.token({
        grant_type: "authorization_code",
        code,
      });
    } catch (err: any) {
      console.error("Stripe oauth.token failed", err?.message || err);
      return new NextResponse(
        `Stripe oauth.token failed: ${err?.message || "unknown error"}`,
        { status: 400 }
      );
    }

    const stripeAccountId = token.stripe_user_id;
    if (!stripeAccountId) {
      console.error("No stripe_user_id in token", token);
      return new NextResponse("No stripe_user_id in token", { status: 400 });
    }

    // Step 2: Lookup startup by state (startupId)
    const startupId = state;
    const { data: startup, error: startupError } = await supabaseAdmin
      .from("startups")
      .select("id, slug")
      .eq("id", startupId)
      .single();

    if (startupError || !startup) {
      console.error("Startup not found for state", { startupId, startupError });
      return new NextResponse(
        `Startup not found for this Stripe connection. Error: ${startupError?.message || "unknown"}`,
        { status: 400 }
      );
    }

    // Step 3: Insert or update provider_connections
    const now = new Date().toISOString();

    // Check if connection already exists
    const { data: existingConnection, error: checkError } = await supabaseAdmin
      .from("provider_connections")
      .select("id")
      .eq("startup_id", startup.id)
      .eq("provider", "stripe")
      .maybeSingle();

    if (checkError) {
      console.error("Error checking existing connection", checkError);
      return new NextResponse(
        `Error checking connection: ${checkError.message}`,
        { status: 500 }
      );
    }

    let connectionId: string;
    let connError;

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
        .select("id")
        .single();
      
      connError = updateError;
      connectionId = updated?.id || existingConnection.id;
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
        .select("id")
        .single();
      
      connError = insertError;
      connectionId = inserted?.id;
    }

    if (connError) {
      console.error("Failed to save provider_connections", {
        error: connError,
        message: connError.message,
        details: connError.details,
        hint: connError.hint,
        code: connError.code,
      });
      return new NextResponse(
        `Failed to record provider connection: ${connError.message || JSON.stringify(connError)}`,
        { status: 500 }
      );
    }

    if (!connectionId) {
      console.error("No connection ID after insert/update");
      return new NextResponse("Failed to get connection ID after save", { status: 500 });
    }

    // Step 4: Store tokens (non-fatal if this fails)
    if (token.access_token) {
      try {
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
      } catch (tokenErr: any) {
        console.error("Exception storing tokens (non-fatal):", tokenErr);
      }
    }

    // Step 5: Redirect to startup page
    const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
    const redirectUrl = `${baseUrl}/startup/${startup.slug}?connected=1`;
    return NextResponse.redirect(redirectUrl);

  } catch (error: any) {
    console.error("Unexpected error in Stripe callback:", error);
    console.error("Error stack:", error?.stack);
    return new NextResponse(
      `Unexpected error: ${error?.message || JSON.stringify(error)}`,
      { status: 500 }
    );
  }
}
