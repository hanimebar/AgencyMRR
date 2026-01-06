import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_PLATFORM_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

/**
 * Stripe Webhook Handler
 * 
 * Configure in Stripe Dashboard:
 * - URL: https://your-domain.com/api/stripe/webhook
 * - Events to listen for:
 *   - checkout.session.completed
 *   - invoice.paid
 *   - customer.subscription.deleted
 *   - invoice.payment_failed (optional)
 * 
 * Get your webhook secret from Stripe Dashboard > Developers > Webhooks
 * Set it as STRIPE_WEBHOOK_SECRET in your environment variables
 */
export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return new NextResponse("Missing signature", { status: 400 });
  }

  const buf = await req.arrayBuffer();
  const body = Buffer.from(buf);

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("Webhook signature verification failed", err.message);
    return new NextResponse("Signature verification failed", { status: 400 });
  }

  // Handle events
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(session);
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(invoice);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case "invoice.payment_failed": {
        // Optional: handle failed payments
        console.log("Payment failed for invoice:", event.data.object);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
        break;
    }

    return new NextResponse("OK", { status: 200 });
  } catch (error: any) {
    console.error("Error processing webhook:", error);
    return new NextResponse(
      JSON.stringify({ error: error.message || "Webhook processing failed" }),
      { status: 500 }
    );
  }
}

/**
 * Handle checkout.session.completed event
 * Activates the sponsorship when payment is successful
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const startupId = session.metadata?.startup_id;
  const type = session.metadata?.type;
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  if (!startupId || !type || !customerId || !subscriptionId) {
    console.error("Missing required metadata in checkout session:", {
      startupId,
      type,
      customerId,
      subscriptionId,
    });
    return;
  }

  // Find the sponsorship by checkout session ID
  const { data: sponsorship, error: findError } = await supabaseAdmin
    .from("sponsorships")
    .select("*")
    .eq("stripe_checkout_session_id", session.id)
    .single();

  if (findError || !sponsorship) {
    console.error("Sponsorship not found for checkout session:", session.id);
    // Try to find by startup_id and type if session ID doesn't match
    const { data: fallbackSponsorship } = await supabaseAdmin
      .from("sponsorships")
      .select("*")
      .eq("startup_id", startupId)
      .eq("type", type)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (fallbackSponsorship) {
      // Update the fallback sponsorship
      await supabaseAdmin
        .from("sponsorships")
        .update({
          status: "active",
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          start_date: new Date().toISOString().split("T")[0],
          updated_at: new Date().toISOString(),
        })
        .eq("id", fallbackSponsorship.id);
    }
    return;
  }

  // Update sponsorship to active
  const { error: updateError } = await supabaseAdmin
    .from("sponsorships")
    .update({
      status: "active",
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      start_date: new Date().toISOString().split("T")[0],
      updated_at: new Date().toISOString(),
    })
    .eq("id", sponsorship.id);

  if (updateError) {
    console.error("Error updating sponsorship:", updateError);
    throw updateError;
  }

  console.log(`Sponsorship activated: ${sponsorship.id} for startup ${startupId}`);
}

/**
 * Handle invoice.paid event
 * Ensures sponsorship stays active when recurring payment succeeds
 */
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string;

  if (!subscriptionId) {
    return;
  }

  // Find sponsorship by subscription ID and ensure it's active
  const { data: sponsorship } = await supabaseAdmin
    .from("sponsorships")
    .select("*")
    .eq("stripe_subscription_id", subscriptionId)
    .single();

  if (sponsorship && sponsorship.status !== "active") {
    await supabaseAdmin
      .from("sponsorships")
      .update({
        status: "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", sponsorship.id);
  }
}

/**
 * Handle customer.subscription.deleted event
 * Cancels the sponsorship when subscription is deleted
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const subscriptionId = subscription.id;

  // Find sponsorship by subscription ID
  const { data: sponsorship, error } = await supabaseAdmin
    .from("sponsorships")
    .select("*")
    .eq("stripe_subscription_id", subscriptionId)
    .single();

  if (error || !sponsorship) {
    console.error("Sponsorship not found for subscription:", subscriptionId);
    return;
  }

  // Update sponsorship to cancelled
  const { error: updateError } = await supabaseAdmin
    .from("sponsorships")
    .update({
      status: "cancelled",
      end_date: new Date().toISOString().split("T")[0],
      updated_at: new Date().toISOString(),
    })
    .eq("id", sponsorship.id);

  if (updateError) {
    console.error("Error cancelling sponsorship:", updateError);
    throw updateError;
  }

  console.log(`Sponsorship cancelled: ${sponsorship.id}`);
}
