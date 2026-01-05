import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Simple auth check
    const cookies = request.cookies.get("admin_authenticated");
    if (!cookies || cookies.value !== "true") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sponsorshipId = params.id;

    // Update sponsorship to cancelled
    const { error } = await supabaseAdmin
      .from("sponsorships")
      .update({
        status: "cancelled",
        end_date: new Date().toISOString().split("T")[0],
        updated_at: new Date().toISOString(),
      })
      .eq("id", sponsorshipId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to deactivate sponsorship" },
      { status: 500 }
    );
  }
}
