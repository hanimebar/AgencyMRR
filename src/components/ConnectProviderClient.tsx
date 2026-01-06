"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { CheckCircle2, Clock } from "lucide-react";

interface ConnectProviderClientProps {
  startupId: string;
  startupName: string;
}

export function ConnectProviderClient({ startupId, startupName }: ConnectProviderClientProps) {
  const handleConnectStripe = () => {
    window.location.href = `/api/providers/stripe/connect?startup=${startupId}`;
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
              Connect your payment provider to automatically sync your revenue metrics for <strong>{startupName}</strong>.
              We use read-only access and never charge your customers.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
                          Read-only access (no charge capability)
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

            {/* Coming Soon Providers */}
            <div className="grid grid-cols-2 gap-4 mt-6">
              {["Paddle", "Braintree", "PayPal", "Mollie"].map((provider) => (
                <motion.div
                  key={provider}
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Card className="opacity-50">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-bold mb-1">{provider}</h3>
                          <p className="text-xs text-muted-foreground">Coming soon</p>
                        </div>
                        <Clock className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
