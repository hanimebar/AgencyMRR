/**
 * Provider-agnostic types for payment provider adapters
 * 
 * This architecture allows adding new providers (Paddle, Braintree, PayPal, Mollie)
 * by implementing the PaymentProviderAdapter interface and registering it in registry.ts
 */

export type ProviderName = "stripe" | "paddle" | "braintree" | "paypal" | "mollie";

/**
 * Standardized metrics structure returned by all provider adapters
 */
export interface ProviderMetrics {
  currency: string; // ISO currency code (EUR, USD, SEK, etc.)
  mrr: number; // Monthly Recurring Revenue
  totalRevenue: number; // All-time total revenue
  last30dRevenue: number; // Revenue in last 30 days
  raw?: any; // Optional raw provider response for debugging
}

/**
 * Configuration passed to adapter's fetchMetrics method
 * Contains the connection ID and account ID from the database
 */
export interface ProviderConnectionConfig {
  providerConnectionId: string; // UUID of provider_connections row
  providerAccountId: string; // Provider-specific account identifier
  accessToken: string; // OAuth access token (retrieved from provider_tokens table)
  refreshToken?: string; // Optional refresh token
}

/**
 * Interface that all payment provider adapters must implement
 * 
 * To add a new provider:
 * 1. Create a new file: src/lib/providers/[provider]Adapter.ts
 * 2. Implement this interface
 * 3. Register it in src/lib/providers/registry.ts
 */
export interface PaymentProviderAdapter {
  name: ProviderName;

  /**
   * Fetch the latest metrics from the payment provider
   * 
   * This method should:
   * - Use the access token to authenticate with the provider's API
   * - Fetch subscription/revenue data
   * - Calculate MRR, total revenue, and last 30 days revenue
   * - Return standardized ProviderMetrics
   * 
   * @param config - Connection configuration including tokens
   * @returns Promise resolving to standardized metrics
   */
  fetchMetrics(config: ProviderConnectionConfig): Promise<ProviderMetrics>;
}
