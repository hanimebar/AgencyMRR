import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getStartupsWithMetrics, getAggregateMetrics, type StartupWithMetrics } from "@/lib/supabase/queries";
import { formatCompact, getCountryFlag, isNordicCountry } from "@/lib/utils";
import { StartupCard } from "@/components/StartupCard";
import { HeroSection } from "@/components/HeroSection";
import { LeaderboardFilters } from "@/components/LeaderboardFilters";

export const dynamic = "force-dynamic"; // Disable static generation
export const revalidate = 60; // Revalidate every 60 seconds

export default async function HomePage() {
  let startups: StartupWithMetrics[] = [];
  let aggregates = { totalMrr: 0, startupCount: 0 };

  try {
    [startups, aggregates] = await Promise.all([
      getStartupsWithMetrics({ sortBy: "mrr" }),
      getAggregateMetrics(),
    ]);
  } catch (error) {
    console.error("Error fetching data:", error);
    // Gracefully handle database errors (e.g., tables not created yet)
  }

  return (
    <div className="min-h-screen">
      <HeroSection
        totalMrr={aggregates.totalMrr}
        startupCount={aggregates.startupCount}
      />
      
      <div id="leaderboard" className="container mx-auto px-4 py-16">
        <div className="mb-8">
          <h2 className="text-4xl font-bold mb-4">Nordic Leaderboard</h2>
          <p className="text-muted-foreground text-lg">
            Verified recurring revenue from payment providers
          </p>
        </div>

        <LeaderboardFilters />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {startups.map((startup, index) => (
            <StartupCard key={startup.id} startup={startup} index={index} />
          ))}
        </div>

        {startups.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">
              No startups listed yet. Be the first!
            </p>
            <Link href="/submit">
              <Button className="mt-4">List Your Startup</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
