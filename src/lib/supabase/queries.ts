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

export interface StartupWithMetrics extends Startup {
  metrics: StartupMetrics | null;
}

/**
 * Get all startups with their current metrics
 */
export async function getStartupsWithMetrics(filters?: {
  country?: string[];
  category?: string[];
  provider?: ProviderName[];
  minMrr?: number;
  maxMrr?: number;
  sortBy?: "mrr" | "last_30d_revenue" | "total_revenue";
}): Promise<StartupWithMetrics[]> {
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

  const { data, error } = await query;

  if (error) throw error;

  // Filter by metrics (can't do this in SQL easily with joins)
  let startups = (data || []).map((s: any) => ({
    ...s,
    metrics: s.startup_metrics_current?.[0] || null,
  })) as StartupWithMetrics[];

  // Filter by provider
  if (filters?.provider && filters.provider.length > 0) {
    startups = startups.filter(
      (s) => s.metrics && filters.provider!.includes(s.metrics.provider as ProviderName)
    );
  }

  // Filter by MRR range
  if (filters?.minMrr !== undefined) {
    startups = startups.filter((s) => (s.metrics?.mrr || 0) >= filters.minMrr!);
  }
  if (filters?.maxMrr !== undefined) {
    startups = startups.filter((s) => (s.metrics?.mrr || 0) <= filters.maxMrr!);
  }

  // Sort
  const sortBy = filters?.sortBy || "mrr";
  startups.sort((a, b) => {
    const aVal = a.metrics?.[sortBy] || 0;
    const bVal = b.metrics?.[sortBy] || 0;
    return bVal - aVal;
  });

  return startups;
}

/**
 * Get startup by slug
 */
export async function getStartupBySlug(slug: string): Promise<StartupWithMetrics | null> {
  const { data, error } = await supabaseAdmin
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

  return {
    ...data,
    metrics: data.startup_metrics_current?.[0] || null,
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
