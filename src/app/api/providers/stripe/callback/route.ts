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
 * 4. Inserts/upserts row into provider_connections
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

  const { error: connError } = await supabaseAdmin
    .from("provider_connections")
    .upsert(
      {
        startup_id: startup.id,
        provider: "stripe",
        provider_account_id: stripeAccountId,
        status: "connected",
        connected_at: now,
        updated_at: now,
      },
      {
        onConflict: "startup_id,provider",
      }
    );

  if (connError) {
    console.error("Failed to upsert provider_connections", connError);
    return new NextResponse("Failed to record provider connection: " + connError.message, {
      status: 500,
    });
  }

  // (Optional) Metrics fetch can be added here later. For now, just confirm connect works.

  const redirectUrl = `/startup/${startup.slug}?connected=1`;
  return NextResponse.redirect(redirectUrl);
}
