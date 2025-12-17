import { NextRequest, NextResponse } from "next/server";
import { createStartup } from "@/lib/supabase/queries";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, website_url, country, category, description } = body;

    if (!name || !website_url || !country || !category) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const startup = await createStartup({
      name,
      website_url,
      country,
      category,
      description,
    });

    return NextResponse.json({ startup });
  } catch (error: any) {
    console.error("Error creating startup:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create startup" },
      { status: 500 }
    );
  }
}
