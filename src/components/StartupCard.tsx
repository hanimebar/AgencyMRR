"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { formatCompact, getCountryFlag, isNordicCountry } from "@/lib/utils";
import type { StartupWithMetrics } from "@/lib/supabase/queries";
import { Sparkles } from "lucide-react";

interface StartupCardProps {
  startup: StartupWithMetrics;
  index: number;
}

export function StartupCard({ startup, index }: StartupCardProps) {
  const metrics = startup.metrics;
  const isNordic = isNordicCountry(startup.country);
  const isSponsored = startup.sponsorship?.status === "active";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
    >
      <Link href={`/startup/${startup.slug}`}>
        <motion.div
          whileHover={{ scale: 1.02, y: -4 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <Card className={`glass-strong h-full cursor-pointer hover:border-primary/50 transition-all ${
            isSponsored ? "border-primary/50 ring-2 ring-primary/20 bg-primary/5" : ""
          }`}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-xl font-bold">{startup.name}</h3>
                    {isSponsored && (
                      <span className="px-2 py-0.5 bg-primary text-primary-foreground rounded-full text-xs flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        Sponsored
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{getCountryFlag(startup.country)}</span>
                    <span>{startup.country}</span>
                    {isNordic && (
                      <span className="px-2 py-0.5 bg-primary/20 text-primary rounded-full text-xs">
                        Nordic Verified
                      </span>
                    )}
                  </div>
                </div>
                {startup.logo_url && (
                  <img
                    src={startup.logo_url}
                    alt={startup.name}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                )}
              </div>

              {metrics ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">MRR</span>
                    <span className="text-lg font-bold">
                      {formatCompact(metrics.mrr)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Last 30d</span>
                    <span className="text-sm">
                      {formatCompact(metrics.last_30d_revenue)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-xs text-muted-foreground">Provider</span>
                    <span className="text-xs px-2 py-1 bg-secondary rounded">
                      {metrics.provider}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  No metrics available yet
                </div>
              )}

              <div className="mt-4 text-xs text-muted-foreground">
                {startup.category}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </Link>
    </motion.div>
  );
}
