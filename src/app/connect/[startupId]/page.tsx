import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/server";
import { ConnectProviderClient } from "@/components/ConnectProviderClient";

export const dynamic = "force-dynamic";

export default async function ConnectPage({
  params,
}: {
  params: { startupId: string };
}) {
  // Load startup by ID server-side
  const { data: startup, error } = await supabaseAdmin
    .from("startups")
    .select("id, name, slug")
    .eq("id", params.startupId)
    .single();

  if (error || !startup) {
    notFound();
  }

  return <ConnectProviderClient startupId={startup.id} startupName={startup.name} />;
}
