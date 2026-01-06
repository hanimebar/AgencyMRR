/**
 * Server-side database queries using supabaseAdmin
 * These functions bypass RLS and should only be called from server components/actions
 */

import { supabaseAdmin } from "./server";
import type { ProviderName } from "../providers/types";

export interface Startup {
  id: string;
  name: string;
  slug: string;
  website_url: string;
  country: string;
  category: string;
  description: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface StartupMetrics {
  id: string;
  startup_id: string;
  currency: string;
  mrr: number;
  total_revenue: number;
  last_30d_revenue: number;
  provider: string;
  provider_last_synced_at: string | null;
  updated_at: string;
}

export interface Sponsorship {
  id: string;
  startup_id: string;
  type: string;
  category: string | null;
  status: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  start_date: string | null;
  end_date: string | null;
}

export interface StartupWithMetrics extends Startup {
  metrics: StartupMetrics | null;
  sponsorship?: Sponsorship | null;
}

/**
 * Get all startups with their current metrics and active sponsorships
 * 
 * Note: Sponsorships are fetched separately to avoid relational expansion issues
 */
export async function getStartupsWithMetrics(filters?: {
  country?: string[];
  category?: string[];
  provider?: ProviderName[];
  minMrr?: number;
  maxMrr?: number;
  sortBy?: "mrr" | "last_30d_revenue" | "total_revenue";
}): Promise<StartupWithMetrics[]> {
  // Get all startups with metrics (no sponsorships in select)
  let query = supabaseAdmin
    .from("startups")
    .select(`
      *,
      startup_metrics_current (*)
    `);

  // Apply filters
  if (filters?.country && filters.country.length > 0) {
    query = query.in("country", filters.country);
  }

  if (filters?.category && filters.category.length > 0) {
    query = query.in("category", filters.category);
  }

  const { data: startupsData, error } = await query;

  if (error) throw error;

  // Fetch active sponsorships separately
  const startupIds = (startupsData || []).map((s: any) => s.id);
  
  let sponsorships: Sponsorship[] = [];
  if (startupIds.length > 0) {
    const { data: sponsorshipsData, error: sponsorshipError } = await supabaseAdmin
      .from("sponsorships")
      .select("id, startup_id, type, category, status, stripe_customer_id, stripe_subscription_id, start_date, end_date")
      .in("startup_id", startupIds)
      .eq("status", "active");

    if (!sponsorshipError && sponsorshipsData) {
      sponsorships = sponsorshipsData as Sponsorship[];
    }
  }

  // Build a map of active sponsorships by startup_id
  const sponsoredByStartupId = new Map(
    sponsorships.map((s) => [s.startup_id, s])
  );

  // Process startups and attach sponsorships
  let allStartups = (startupsData || []).map((s: any) => {
    const activeSponsorship = sponsoredByStartupId.get(s.id) || null;

    return {
      ...s,
      metrics: s.startup_metrics_current?.[0] || null,
      sponsorship: activeSponsorship,
    };
  }) as StartupWithMetrics[];

  // Filter by provider
  if (filters?.provider && filters.provider.length > 0) {
    allStartups = allStartups.filter(
      (s) => s.metrics && filters.provider!.includes(s.metrics.provider as ProviderName)
    );
  }

  // Filter by MRR range
  if (filters?.minMrr !== undefined) {
    allStartups = allStartups.filter((s) => (s.metrics?.mrr || 0) >= filters.minMrr!);
  }
  if (filters?.maxMrr !== undefined) {
    allStartups = allStartups.filter((s) => (s.metrics?.mrr || 0) <= filters.maxMrr!);
  }

  // Sort: First sponsored startups (by MRR), then non-sponsored (by MRR)
  const sortBy = filters?.sortBy || "mrr";
  const sponsored = allStartups.filter((s) => s.sponsorship?.status === "active");
  const nonSponsored = allStartups.filter((s) => !s.sponsorship || s.sponsorship.status !== "active");

  sponsored.sort((a, b) => {
    const aVal = a.metrics?.[sortBy] || 0;
    const bVal = b.metrics?.[sortBy] || 0;
    return bVal - aVal;
  });

  nonSponsored.sort((a, b) => {
    const aVal = a.metrics?.[sortBy] || 0;
    const bVal = b.metrics?.[sortBy] || 0;
    return bVal - aVal;
  });

  return [...sponsored, ...nonSponsored];
}

/**
 * Get startup by slug with active sponsorship
 * 
 * Note: Sponsorships are fetched separately to avoid relational expansion issues
 */
export async function getStartupBySlug(slug: string): Promise<StartupWithMetrics | null> {
  // Fetch startup with metrics (no sponsorships in select)
  const { data: startupData, error } = await supabaseAdmin
    .from("startups")
    .select(`
      *,
      startup_metrics_current (*)
    `)
    .eq("slug", slug)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // Not found
    throw error;
  }

  // Fetch active sponsorship separately
  const { data: sponsorshipData, error: sponsorshipError } = await supabaseAdmin
    .from("sponsorships")
    .select("id, startup_id, type, category, status, stripe_customer_id, stripe_subscription_id, start_date, end_date")
    .eq("startup_id", startupData.id)
    .eq("status", "active")
    .maybeSingle();

  const activeSponsorship = (sponsorshipError || !sponsorshipData) ? null : (sponsorshipData as Sponsorship);

  return {
    ...startupData,
    metrics: startupData.startup_metrics_current?.[0] || null,
    sponsorship: activeSponsorship,
  } as StartupWithMetrics;
}

/**
 * Create a new startup
 */
export async function createStartup(data: {
  name: string;
  website_url: string;
  country: string;
  category: string;
  description?: string;
  logo_url?: string;
}): Promise<Startup> {
  const slug = data.name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const { data: startup, error } = await supabaseAdmin
    .from("startups")
    .insert({
      ...data,
      slug,
    })
    .select()
    .single();

  if (error) throw error;
  return startup;
}

/**
 * Get aggregate metrics (total MRR, startup count)
 */
export async function getAggregateMetrics(): Promise<{
  totalMrr: number;
  startupCount: number;
}> {
  const { data: metrics, error } = await supabaseAdmin
    .from("startup_metrics_current")
    .select("mrr");

  if (error) throw error;

  const totalMrr = (metrics || []).reduce((sum, m) => sum + (m.mrr || 0), 0);

  const { count } = await supabaseAdmin
    .from("startups")
    .select("*", { count: "exact", head: true })
    .not("id", "is", null);

  return {
    totalMrr: Math.round(totalMrr),
    startupCount: count || 0,
  };
}

/**
 * Get all provider connections that need syncing
 */
export async function getConnectionsToSync(): Promise<
  Array<{
    id: string;
    startup_id: string;
    provider: string;
    provider_account_id: string;
    access_token: string;
    refresh_token?: string;
  }>
> {
  const { data, error } = await supabaseAdmin
    .from("provider_connections")
    .select(`
      id,
      startup_id,
      provider,
      provider_account_id,
      provider_tokens (access_token, refresh_token)
    `)
    .eq("status", "connected");

  if (error) throw error;

  return (data || [])
    .filter((conn: any) => conn.provider_tokens && conn.provider_tokens.length > 0)
    .map((conn: any) => ({
      id: conn.id,
      startup_id: conn.startup_id,
      provider: conn.provider,
      provider_account_id: conn.provider_account_id,
      access_token: conn.provider_tokens[0].access_token,
      refresh_token: conn.provider_tokens[0].refresh_token || undefined,
    }));
}
