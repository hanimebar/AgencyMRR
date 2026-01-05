import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase/server";

const stripe = new Stripe(process.env.STRIPE_PLATFORM_SECRET_KEY || "", {
  apiVersion: "2023-10-16",
});

/**
 * Create Stripe Checkout Session for Sponsorship
 * 
 * This route:
 * 1. Validates the startup slug exists
 * 2. Determines the correct price ID based on sponsorship type
 * 3. Creates a Stripe Checkout Session with subscription mode
 * 4. Creates a pending sponsorship record in the database
 * 5. Returns the checkout URL
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { startupSlug, type } = body;

    if (!startupSlug) {
      return NextResponse.json(
        { error: "Startup slug is required" },
        { status: 400 }
      );
    }

    if (!type) {
      return NextResponse.json(
        { error: "Sponsorship type is required" },
        { status: 400 }
      );
    }

    // Map sponsorship type to price ID
    const priceIdMap: Record<string, string> = {
      featured_listing: process.env.FEATURED_LISTING_PRICE_ID || "",
      category_hero: process.env.CATEGORY_HERO_PRICE_ID || "",
      homepage_sponsor: process.env.HOMEPAGE_SPONSOR_PRICE_ID || "",
    };

    const priceId = priceIdMap[type];

    if (!priceId) {
      return NextResponse.json(
        { error: `Price ID not configured for sponsorship type: ${type}` },
        { status: 500 }
      );
    }

    // Verify startup exists
    const { data: startup, error: startupError } = await supabaseAdmin
      .from("startups")
      .select("id, name, slug, category")
      .eq("slug", startupSlug)
      .single();

    if (startupError || !startup) {
      return NextResponse.json(
        { error: "Startup not found. Please check the slug and try again." },
        { status: 404 }
      );
    }

    const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/startup/${startupSlug}?sponsorship=success`,
      cancel_url: `${baseUrl}/startup/${startupSlug}?sponsorship=cancelled`,
      metadata: {
        startup_id: startup.id,
        startup_slug: startupSlug,
        startup_name: startup.name,
        type: type,
      },
      // Allow customer to enter email
      customer_email: undefined,
      // Subscription settings
      subscription_data: {
        metadata: {
          startup_id: startup.id,
          startup_slug: startupSlug,
          type: type,
        },
      },
    });

    // Create pending sponsorship record
    const { error: sponsorshipError } = await supabaseAdmin
      .from("sponsorships")
      .insert({
        startup_id: startup.id,
        type: type,
        category: type === "category_hero" ? startup.category : null,
        status: "pending",
        stripe_price_id: priceId,
        stripe_checkout_session_id: session.id,
      });

    if (sponsorshipError) {
      console.error("Error creating sponsorship record:", sponsorshipError);
      // Don't fail the checkout if DB insert fails - we can handle it in webhook
    }

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
    });
  } catch (error: any) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
