"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { CheckCircle2, Star, Sparkles, TrendingUp, Home } from "lucide-react";

const SPONSORSHIP_TYPES = [
  {
    id: "featured_listing",
    name: "Featured Listing",
    icon: Star,
    description: "Pinned at the top of the leaderboard in your segment",
    price: 39,
    features: [
      "Pinned at the top of the leaderboard in your segment",
      "Special badge and highlight",
      "Recurring, cancel anytime",
    ],
  },
  {
    id: "category_hero",
    name: "Category Hero",
    icon: TrendingUp,
    description: "Featured placement in category-specific leaderboards",
    price: 79,
    features: [
      "Featured placement in category-specific leaderboards",
      "Enhanced visibility in your category",
      "Recurring, cancel anytime",
    ],
  },
  {
    id: "homepage_sponsor",
    name: "Homepage Sponsor",
    icon: Home,
    description: "Premium placement on the homepage hero section",
    price: 149,
    features: [
      "Premium placement on the homepage hero section",
      "Maximum visibility to all visitors",
      "Recurring, cancel anytime",
    ],
  },
];

function AdvertiseContent() {
  const searchParams = useSearchParams();
  const [startupSlug, setStartupSlug] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>("featured_listing");

  // Get startup slug from URL if present
  useEffect(() => {
    const slug = searchParams.get("startup");
    if (slug) {
      setStartupSlug(slug);
    }
  }, [searchParams]);

  const handleBuySponsorship = async (type: string) => {
    if (!startupSlug.trim()) {
      alert("Please enter your startup slug");
      return;
    }

    setLoading(type);
    try {
      const response = await fetch("/api/stripe/sponsorship/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startupSlug: startupSlug.trim(),
          type,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error("Checkout error:", error);
      alert(`Error: ${error.message || "Failed to start checkout. Please try again."}`);
    } finally {
      setLoading(null);
    }
  };

  const selectedSponsorship = SPONSORSHIP_TYPES.find((s) => s.id === selectedType) || SPONSORSHIP_TYPES[0];

  return (
    <div className="min-h-screen container mx-auto px-4 py-16">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
            Sponsorship Packages
          </h1>
          <p className="text-muted-foreground text-xl">
            Get maximum visibility for your startup on the AgencyMRR leaderboard
          </p>
        </motion.div>

        {/* Sponsorship Type Selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-8"
        >
          <div className="grid md:grid-cols-3 gap-4">
            {SPONSORSHIP_TYPES.map((sponsorship) => {
              const Icon = sponsorship.icon;
              return (
                <motion.div
                  key={sponsorship.id}
                  whileHover={{ scale: 1.02, y: -4 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Card
                    className={`glass-strong cursor-pointer transition-all ${
                      selectedType === sponsorship.id
                        ? "border-primary ring-2 ring-primary/50"
                        : "hover:border-primary/50"
                    }`}
                    onClick={() => setSelectedType(sponsorship.id)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <Icon className="w-6 h-6 text-primary" />
                        <CardTitle className="text-lg">{sponsorship.name}</CardTitle>
                      </div>
                      <p className="text-sm text-muted-foreground">{sponsorship.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Selected Sponsorship Details */}
        <motion.div
          key={selectedType}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="glass-strong border-primary/50">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                {(() => {
                  const Icon = selectedSponsorship.icon;
                  return <Icon className="w-8 h-8 text-primary" />;
                })()}
                <CardTitle className="text-3xl">{selectedSponsorship.name}</CardTitle>
              </div>
              <CardDescription className="text-lg">{selectedSponsorship.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Features */}
              <div className="space-y-4">
                {selectedSponsorship.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <p className="font-semibold">{feature}</p>
                  </div>
                ))}
              </div>

              {/* Price */}
              <div className="p-6 bg-primary/10 rounded-lg border border-primary/20">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold">€{selectedSponsorship.price}</span>
                  <span className="text-lg text-muted-foreground">/month</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Recurring monthly subscription
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Cancel anytime from your Stripe dashboard
                </p>
              </div>

              {/* Startup Selection */}
              <div className="space-y-4 pt-4 border-t">
                <Label className="text-lg">Which startup would you like to sponsor?</Label>
                <div className="space-y-2">
                  <Input
                    placeholder="Enter your startup slug (e.g., acme-inc)"
                    value={startupSlug}
                    onChange={(e) => setStartupSlug(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    You can find your startup slug in the URL: /startup/your-slug-here
                  </p>
                </div>
              </div>

              {/* CTA Button */}
              <Button
                onClick={() => handleBuySponsorship(selectedType)}
                disabled={loading !== null || !startupSlug.trim()}
                size="lg"
                className="w-full text-lg py-6"
              >
                {loading === selectedType ? (
                  "Processing..."
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Buy {selectedSponsorship.name}
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                By clicking &quot;Buy {selectedSponsorship.name}&quot;, you&apos;ll be redirected to Stripe Checkout to complete your purchase.
                You can cancel your subscription at any time.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Contact Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-12 p-6 glass-strong rounded-lg"
        >
          <h2 className="text-2xl font-bold mb-4">Questions?</h2>
          <p className="text-muted-foreground mb-4">
            Contact us at <a href="mailto:ads@agencymrr.com" className="text-primary hover:underline">ads@agencymrr.com</a> to
            discuss custom advertising opportunities.
          </p>
        </motion.div>
      </div>
    </div>
  );
}

export default function AdvertisePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-16">Loading...</div>
        </div>
      </div>
    }>
      <AdvertiseContent />
    </Suspense>
  );
}
