import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { ConnectProviderClient } from "@/components/ConnectProviderClient";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
