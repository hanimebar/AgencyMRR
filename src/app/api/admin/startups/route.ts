import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    // Simple auth check (in production, use proper session/auth)
    const cookies = request.cookies.get("admin_authenticated");
    if (!cookies || cookies.value !== "true") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: startups, error } = await supabaseAdmin
      .from("startups")
      .select(`
        *,
        startup_metrics_current (*),
        provider_connections (status, provider)
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const formatted = (startups || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      website_url: s.website_url,
      country: s.country,
      category: s.category,
      metrics: s.startup_metrics_current?.[0] || null,
      connection: s.provider_connections?.[0] || null,
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch startups" },
      { status: 500 }
    );
  }
}
