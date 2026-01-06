import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getConnectionsToSync } from "@/lib/supabase/queries";
import { getProviderAdapter } from "@/lib/providers/registry";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

/**
 * Cron endpoint to sync metrics for all connected providers
 * 
 * This should be called periodically (e.g., daily) by an external cron service
 * or Vercel Cron.
 * 
 * For security, you may want to add authentication (e.g., secret header)
 */
export async function GET(request: NextRequest) {
  try {
    // Optional: Add authentication check
    // All header access happens inside the function, not at module level
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const connections = await getConnectionsToSync();
    const results = [];

    for (const conn of connections) {
      try {
        // Get adapter for this provider
        const adapter = getProviderAdapter(conn.provider as any);

        // Fetch metrics
        const metrics = await adapter.fetchMetrics({
          providerConnectionId: conn.id,
          providerAccountId: conn.provider_account_id,
          accessToken: conn.access_token,
          refreshToken: conn.refresh_token,
        });

        // Update current metrics
        await supabaseAdmin
          .from("startup_metrics_current")
          .upsert({
            startup_id: conn.startup_id,
            currency: metrics.currency,
            mrr: metrics.mrr,
            total_revenue: metrics.totalRevenue,
            last_30d_revenue: metrics.last30dRevenue,
            provider: conn.provider,
            provider_last_synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, {
            onConflict: "startup_id",
          });

        // Add to history (daily snapshot)
        const today = new Date().toISOString().split("T")[0];
        
        // Check if snapshot for today already exists
        const { data: existing } = await supabaseAdmin
          .from("startup_metrics_history")
          .select("id")
          .eq("startup_id", conn.startup_id)
          .eq("snapshot_date", today)
          .single();

        if (!existing) {
          await supabaseAdmin.from("startup_metrics_history").insert({
            startup_id: conn.startup_id,
            currency: metrics.currency,
            mrr: metrics.mrr,
            total_revenue: metrics.totalRevenue,
            last_30d_revenue: metrics.last30dRevenue,
            provider: conn.provider,
            snapshot_date: today,
          });
        }

        // Update connection last_synced_at
        await supabaseAdmin
          .from("provider_connections")
          .update({
            last_synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", conn.id);

        results.push({
          startup_id: conn.startup_id,
          provider: conn.provider,
          status: "success",
        });
      } catch (error: any) {
        console.error(`Error syncing ${conn.provider} for startup ${conn.startup_id}:`, error);
        results.push({
          startup_id: conn.startup_id,
          provider: conn.provider,
          status: "error",
          error: error.message,
        });
      }
    }

    return NextResponse.json({
      synced: results.filter((r) => r.status === "success").length,
      failed: results.filter((r) => r.status === "error").length,
      results,
    });
  } catch (error: any) {
    console.error("Error in sync-metrics cron:", error);
    return NextResponse.json(
      { error: error.message || "Failed to sync metrics" },
      { status: 500 }
    );
  }
}
