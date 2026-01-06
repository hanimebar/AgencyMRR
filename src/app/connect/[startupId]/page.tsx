import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/server";
import { ConnectProviderClient } from "@/components/ConnectProviderClient";

export const dynamic = "force-dynamic";

export default async function ConnectPage({
  params,
}: {
  params: { startupId: string };
}) {
  // Fetch startup by ID using service-role client
  const { data: startup, error } = await supabaseAdmin
    .from("startups")
    .select("id, slug, name, website_url, country, category")
    .eq("id", params.startupId)
    .single();

  if (error || !startup) {
    redirect("/submit");
  }

  return <ConnectProviderClient startup={startup} />;
}
