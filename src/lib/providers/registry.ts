/**
 * Provider Adapter Registry
 * 
 * Central registry for all payment provider adapters.
 * 
 * To add a new provider:
 * 1. Create [provider]Adapter.ts implementing PaymentProviderAdapter
 * 2. Import it here
 * 3. Add it to the adapters record
 * 
 * Example for Paddle:
 * import { paddleAdapter } from "./paddleAdapter";
 * 
 * const adapters: Record<ProviderName, PaymentProviderAdapter> = {
 *   stripe: stripeAdapter,
 *   paddle: paddleAdapter, // <-- Add here
 *   ...
 * };
 */

import type { PaymentProviderAdapter, ProviderName } from "./types";
import { stripeAdapter } from "./stripeAdapter";

// Placeholder stubs for future providers
const placeholderAdapter: PaymentProviderAdapter = {
  name: "paddle" as ProviderName,
  async fetchMetrics() {
    throw new Error("Provider adapter not yet implemented");
  },
};

const adapters: Partial<Record<ProviderName, PaymentProviderAdapter>> = {
  stripe: stripeAdapter,
  // Future providers - uncomment and implement when ready:
  // paddle: paddleAdapter,
  // braintree: braintreeAdapter,
  // paypal: paypalAdapter,
  // mollie: mollieAdapter,
};

/**
 * Get a provider adapter by name
 * 
 * @param provider - Provider name (stripe, paddle, etc.)
 * @returns The adapter instance
 * @throws Error if provider is not registered
 */
export function getProviderAdapter(provider: ProviderName): PaymentProviderAdapter {
  const adapter = adapters[provider];
  if (!adapter) {
    throw new Error(`No adapter registered for provider: ${provider}. Available: ${Object.keys(adapters).join(", ")}`);
  }
  return adapter;
}

/**
 * Get list of all registered providers
 */
export function getRegisteredProviders(): ProviderName[] {
  return Object.keys(adapters) as ProviderName[];
}
