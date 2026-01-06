import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getProviderAdapter } from "@/lib/providers/registry";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: { startupId: string } }
) {
  try {
    // Simple auth check
    const cookies = request.cookies.get("admin_authenticated");
    if (!cookies || cookies.value !== "true") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const startupId = params.startupId;

    // Get connection for this startup
    const { data: connection, error: connError } = await supabaseAdmin
      .from("provider_connections")
      .select(`
        *,
        provider_tokens (access_token, refresh_token)
      `)
      .eq("startup_id", startupId)
      .eq("status", "connected")
      .single();

    if (connError || !connection) {
      return NextResponse.json(
        { error: "No active connection found" },
        { status: 404 }
      );
    }

    const token = (connection as any).provider_tokens?.[0];
    if (!token) {
      return NextResponse.json(
        { error: "No access token found" },
        { status: 404 }
      );
    }

    // Get adapter and fetch metrics
    const adapter = getProviderAdapter(connection.provider as any);
    const metrics = await adapter.fetchMetrics({
      providerConnectionId: connection.id,
      providerAccountId: connection.provider_account_id,
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
    });

    // Update current metrics
    await supabaseAdmin
      .from("startup_metrics_current")
      .upsert({
        startup_id: startupId,
        currency: metrics.currency,
        mrr: metrics.mrr,
        total_revenue: metrics.totalRevenue,
        last_30d_revenue: metrics.last30dRevenue,
        provider: connection.provider,
        provider_last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "startup_id",
      });

    // Add to history
    const today = new Date().toISOString().split("T")[0];
    await supabaseAdmin.from("startup_metrics_history").insert({
      startup_id: startupId,
      currency: metrics.currency,
      mrr: metrics.mrr,
      total_revenue: metrics.totalRevenue,
      last_30d_revenue: metrics.last30dRevenue,
      provider: connection.provider,
      snapshot_date: today,
    });

    // Update connection
    await supabaseAdmin
      .from("provider_connections")
      .update({
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", connection.id);

    return NextResponse.json({ success: true, metrics });
  } catch (error: any) {
    console.error("Error syncing startup:", error);
    return NextResponse.json(
      { error: error.message || "Failed to sync" },
      { status: 500 }
    );
  }
}
