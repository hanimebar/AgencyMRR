"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

interface SponsorshipCTAProps {
  startupSlug: string;
  hasActiveSponsorship: boolean;
  sponsorshipType?: string;
}

export function SponsorshipCTA({ startupSlug, hasActiveSponsorship, sponsorshipType }: SponsorshipCTAProps) {
  const [loading, setLoading] = useState(false);

  const handleGetFeatured = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/stripe/sponsorship/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startupSlug,
          type: "featured_listing",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error("Checkout error:", error);
      alert(`Error: ${error.message || "Failed to start checkout. Please try again."}`);
    } finally {
      setLoading(false);
    }
  };

  if (hasActiveSponsorship) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="glass-strong border-green-500/50 bg-green-500/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-green-500" />
              <div>
                <h3 className="font-semibold text-lg">Active Featured Listing</h3>
                <p className="text-sm text-muted-foreground">
                  Your startup has an active {sponsorshipType || "featured"} sponsorship.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="glass-strong border-primary/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Promote This Startup
          </CardTitle>
          <CardDescription>
            Get featured at the top of the leaderboard and increase your visibility
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleGetFeatured}
            disabled={loading}
            size="lg"
            className="w-full"
          >
            {loading ? "Processing..." : "Get a Featured Listing"}
          </Button>
          <p className="text-xs text-muted-foreground mt-3 text-center">
            Recurring monthly subscription. Cancel anytime.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
