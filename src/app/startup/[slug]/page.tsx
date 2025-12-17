import { notFound } from "next/navigation";
import { getStartupBySlug } from "@/lib/supabase/queries";
import { formatCurrency, formatRelativeTime, getCountryFlag, isNordicCountry } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StartupMetricsChart } from "@/components/StartupMetricsChart";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export default async function StartupDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const startup = await getStartupBySlug(params.slug);

  if (!startup) {
    notFound();
  }

  const metrics = startup.metrics;
  const isNordic = isNordicCountry(startup.country);

  return (
    <div className="min-h-screen container mx-auto px-4 py-16">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold mb-2">{startup.name}</h1>
              <div className="flex items-center gap-4 text-muted-foreground">
                <span>{getCountryFlag(startup.country)} {startup.country}</span>
                <span>•</span>
                <span>{startup.category}</span>
                {isNordic && (
                  <>
                    <span>•</span>
                    <span className="px-2 py-1 bg-primary/20 text-primary rounded-full text-sm">
                      Nordic Verified
                    </span>
                  </>
                )}
              </div>
            </div>
            {startup.logo_url && (
              <img
                src={startup.logo_url}
                alt={startup.name}
                className="w-24 h-24 rounded-lg object-cover"
              />
            )}
          </div>
          <a
            href={startup.website_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            {startup.website_url}
          </a>
          {startup.description && (
            <p className="mt-4 text-muted-foreground">{startup.description}</p>
          )}
        </div>

        {/* Metrics */}
        {metrics ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card className="glass-strong">
                <CardHeader>
                  <CardTitle className="text-sm text-muted-foreground">MRR</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {formatCurrency(metrics.mrr, metrics.currency)}
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-strong">
                <CardHeader>
                  <CardTitle className="text-sm text-muted-foreground">Last 30 Days</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {formatCurrency(metrics.last_30d_revenue, metrics.currency)}
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-strong">
                <CardHeader>
                  <CardTitle className="text-sm text-muted-foreground">Total Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {formatCurrency(metrics.total_revenue, metrics.currency)}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Chart */}
            <Card className="glass-strong mb-8">
              <CardHeader>
                <CardTitle>MRR Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <StartupMetricsChart startupId={startup.id} />
              </CardContent>
            </Card>

            {/* Provider Info */}
            <Card className="glass-strong">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground">Provider</div>
                    <div className="text-lg font-semibold capitalize">{metrics.provider}</div>
                  </div>
                  {metrics.provider_last_synced_at && (
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Last Synced</div>
                      <div className="text-sm">
                        {formatRelativeTime(metrics.provider_last_synced_at)}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="glass-strong">
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground text-lg">
                No metrics available yet. Connect a payment provider to see revenue data.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
