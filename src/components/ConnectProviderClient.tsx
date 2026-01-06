"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

interface ConnectProviderClientProps {
  startup: {
    id: string;
    slug: string;
    name: string;
    website_url: string;
    country: string;
    category: string;
  };
}

export function ConnectProviderClient({ startup }: ConnectProviderClientProps) {
  const handleConnectStripe = () => {
    window.location.href = `/api/providers/stripe/connect?startupId=${startup.id}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-3xl"
      >
        <Card className="glass-strong">
          <CardHeader>
            <CardTitle className="text-3xl">Connect Your Payment Provider</CardTitle>
            <CardDescription>
              Connect your payment provider to automatically sync your revenue metrics for <strong>{startup.name}</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Startup Info */}
            <div className="p-4 bg-muted/50 rounded-lg mb-4">
              <div className="text-sm text-muted-foreground mb-1">Startup</div>
              <div className="font-semibold">{startup.name}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {startup.country} • {startup.category}
              </div>
            </div>

            {/* Stripe Card */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Card className="border-primary/50">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold mb-2">Stripe</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Connect your Stripe account to sync MRR, total revenue, and last 30 days revenue.
                      </p>
                      <ul className="text-sm space-y-2 mb-4">
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          Read-write access for metrics
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          Automatic metrics sync
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          Secure OAuth connection
                        </li>
                      </ul>
                    </div>
                  </div>
                  <Button onClick={handleConnectStripe} size="lg" className="w-full">
                    Connect Stripe
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
