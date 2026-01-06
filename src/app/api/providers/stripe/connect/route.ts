import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = "force-dynamic";

/**
 * Generate Stripe Connect OAuth URL and redirect founder
 * 
 * This route:
 * 1. Takes startupId from query params
 * 2. Verifies the startup exists
 * 3. Builds Stripe Connect OAuth URL with state=startupId
 * 4. Redirects to Stripe
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const startupId = searchParams.get("startupId");

  if (!startupId) {
    return new NextResponse("Missing startupId", { status: 400 });
  }

  const { data: startup, error } = await supabaseAdmin
    .from("startups")
    .select("id")
    .eq("id", startupId)
    .single();

  if (error || !startup) {
    console.error("Startup not found in connect route", { startupId, error });
    return NextResponse.redirect("/submit");
  }

  const redirectUri = `${process.env.APP_BASE_URL}/api/providers/stripe/callback`;

  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.STRIPE_CLIENT_ID!,
    scope: "read_write",
    redirect_uri: redirectUri,
    state: startup.id, // EXACTLY the startup.id as uuid
  });

  const url = "https://connect.stripe.com/oauth/authorize?" + params.toString();

  return NextResponse.redirect(url);
}
