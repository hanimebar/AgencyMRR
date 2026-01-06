import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    // Simple auth check
    const cookies = request.cookies.get("admin_authenticated");
    if (!cookies || cookies.value !== "true") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch sponsorships without relational expansion
    const { data: sponsorships, error } = await supabaseAdmin
      .from("sponsorships")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Fetch startup names separately
    const startupIds = (sponsorships || []).map((s: any) => s.startup_id);
    let startupNames = new Map<string, string>();

    if (startupIds.length > 0) {
      const { data: startups } = await supabaseAdmin
        .from("startups")
        .select("id, name")
        .in("id", startupIds);

      if (startups) {
        startupNames = new Map(startups.map((s: any) => [s.id, s.name]));
      }
    }

    const formatted = (sponsorships || []).map((s: any) => ({
      id: s.id,
      startup_id: s.startup_id,
      startup_name: startupNames.get(s.startup_id) || "Unknown",
      type: s.type,
      status: s.status,
      stripe_subscription_id: s.stripe_subscription_id,
      start_date: s.start_date,
      end_date: s.end_date,
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch sponsorships" },
      { status: 500 }
    );
  }
}
