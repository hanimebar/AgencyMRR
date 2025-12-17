/**
 * Stripe Payment Provider Adapter
 * 
 * Implements PaymentProviderAdapter for Stripe Connect accounts.
 * 
 * This adapter:
 * - Uses Stripe SDK to fetch subscription and revenue data
 * - Calculates MRR from active subscriptions
 * - Calculates total revenue from all charges/invoices
 * - Calculates last 30 days revenue
 * 
 * To add another provider (e.g. Paddle):
 * 1. Create paddleAdapter.ts following this pattern
 * 2. Implement fetchMetrics() using Paddle's API
 * 3. Register in registry.ts
 */

import Stripe from "stripe";
import type { PaymentProviderAdapter, ProviderMetrics, ProviderConnectionConfig } from "./types";

// Initialize Stripe with platform secret key
// This is used for server-side operations
const stripe = new Stripe(process.env.STRIPE_PLATFORM_SECRET_KEY || "", {
  apiVersion: "2023-10-16",
});

/**
 * Stripe adapter implementation
 */
export const stripeAdapter: PaymentProviderAdapter = {
  name: "stripe",

  async fetchMetrics(config: ProviderConnectionConfig): Promise<ProviderMetrics> {
    // Create a Stripe instance for this specific connected account
    // The access token is the OAuth token from Stripe Connect
    const accountStripe = new Stripe(config.accessToken, {
      apiVersion: "2023-10-16",
    });

    // Fetch all active subscriptions with pagination
    // Stripe subscriptions represent recurring revenue
    let allSubscriptions: Stripe.Subscription[] = [];
    let hasMore = true;
    let startingAfter: string | undefined;

    while (hasMore) {
      const subscriptions: Stripe.Response<Stripe.ApiList<Stripe.Subscription>> = await accountStripe.subscriptions.list({
        status: "active",
        limit: 100,
        starting_after: startingAfter,
      });

      allSubscriptions = allSubscriptions.concat(subscriptions.data);
      hasMore = subscriptions.has_more;
      if (hasMore && subscriptions.data.length > 0) {
        startingAfter = subscriptions.data[subscriptions.data.length - 1].id;
      }
    }

    // Calculate MRR from active subscriptions
    // MRR = sum of (subscription amount / billing period in months)
    let mrr = 0;
    const currency = allSubscriptions[0]?.currency || "eur";

    for (const subscription of allSubscriptions) {
      for (const item of subscription.items.data) {
        const price = item.price;
        if (!price || !price.recurring) continue;

        const amount = price.unit_amount || 0;
        const interval = price.recurring.interval;
        const intervalCount = price.recurring.interval_count || 1;

        // Normalize to monthly
        let monthlyAmount = 0;
        if (interval === "month") {
          monthlyAmount = amount / intervalCount;
        } else if (interval === "year") {
          monthlyAmount = (amount / intervalCount) / 12;
        } else if (interval === "week") {
          monthlyAmount = (amount / intervalCount) * 4.33; // Average weeks per month
        } else if (interval === "day") {
          monthlyAmount = (amount / intervalCount) * 30;
        }

        mrr += monthlyAmount;
      }
    }

    // Calculate revenue from invoices (more accurate than charges)
    // Invoices represent actual revenue, including subscriptions and one-time payments
    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);
    let totalRevenue = 0;
    let last30dRevenue = 0;

    // Fetch all paid invoices with pagination
    let allInvoices: Stripe.Invoice[] = [];
    hasMore = true;
    startingAfter = undefined;

    while (hasMore) {
      const invoices: Stripe.Response<Stripe.ApiList<Stripe.Invoice>> = await accountStripe.invoices.list({
        limit: 100,
        starting_after: startingAfter,
        status: "paid",
      });

      allInvoices = allInvoices.concat(invoices.data);
      hasMore = invoices.has_more;
      if (hasMore && invoices.data.length > 0) {
        startingAfter = invoices.data[invoices.data.length - 1].id;
      }
    }

    for (const invoice of allInvoices) {
      if (invoice.amount_paid) {
        const amount = invoice.amount_paid / 100; // Stripe amounts are in cents
        totalRevenue += amount;

        // Check if invoice is within last 30 days
        if (invoice.created >= thirtyDaysAgo) {
          last30dRevenue += amount;
        }
      }
    }

    return {
      currency: currency.toUpperCase(),
      mrr: Math.round(mrr / 100), // Convert from cents to currency units
      totalRevenue: Math.round(totalRevenue),
      last30dRevenue: Math.round(last30dRevenue),
      raw: {
        subscriptionCount: allSubscriptions.length,
        invoiceCount: allInvoices.length,
      },
    };
  },
};
