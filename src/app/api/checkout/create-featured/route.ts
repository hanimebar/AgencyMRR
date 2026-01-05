import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase/server";

const stripe = new Stripe(process.env.STRIPE_PLATFORM_SECRET_KEY || "", {
  apiVersion: "2023-10-16",
});

/**
 * Create Stripe Checkout Session for Featured Listing
 * 
 * This route:
 * 1. Validates the startup slug exists
 * 2. Creates a Stripe Checkout Session with the featured listing price
 * 3. Returns the checkout URL
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { startupSlug } = body;

    if (!startupSlug) {
      return NextResponse.json(
        { error: "Startup slug is required" },
        { status: 400 }
      );
    }

    // Verify startup exists
    const { data: startup, error: startupError } = await supabaseAdmin
      .from("startups")
      .select("id, name, slug")
      .eq("slug", startupSlug)
      .single();

    if (startupError || !startup) {
      return NextResponse.json(
        { error: "Startup not found. Please check the slug and try again." },
        { status: 404 }
      );
    }

    // Get price ID from environment
    const priceId = process.env.FEATURED_LISTING_PRICE_ID;

    if (!priceId) {
      return NextResponse.json(
        { error: "Featured listing price not configured. Please contact support." },
        { status: 500 }
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
      success_url: `${baseUrl}/startup/${startupSlug}?featured=success`,
      cancel_url: `${baseUrl}/advertise?canceled=true`,
      metadata: {
        startup_id: startup.id,
        startup_slug: startupSlug,
        startup_name: startup.name,
        product_type: "featured_listing",
      },
      // Allow customer to enter email
      customer_email: undefined, // Let Stripe collect email
      // Subscription settings
      subscription_data: {
        metadata: {
          startup_id: startup.id,
          startup_slug: startupSlug,
        },
      },
    });

    return NextResponse.json({
      checkoutUrl: session.url,
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
