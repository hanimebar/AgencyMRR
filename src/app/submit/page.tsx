"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";

const COUNTRIES = [
  { code: "FI", name: "Finland" },
  { code: "SE", name: "Sweden" },
  { code: "NO", name: "Norway" },
  { code: "DK", name: "Denmark" },
  { code: "IS", name: "Iceland" },
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "NL", name: "Netherlands" },
];

const CATEGORIES = [
  "SaaS",
  "App",
  "Agency",
  "Service",
  "E-commerce",
  "Other",
];

export default function SubmitPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    website_url: "",
    country: "FI",
    category: "SaaS",
    description: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/startups/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Failed to create startup");

      const { startup } = await response.json();
      router.push(`/connect/${startup.id}`);
    } catch (error) {
      console.error(error);
      alert("Failed to submit. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl"
      >
        <Card className="glass-strong">
          <CardHeader>
            <CardTitle className="text-3xl">List Your Startup</CardTitle>
            <CardDescription>
              Add your startup to the AgencyMRR leaderboard. Connect your payment provider to verify your metrics.
              <br />
              <span className="mt-2 block">
                Questions? Contact us at{" "}
                <a href="mailto:reachout@actvli.com" className="text-primary hover:underline">
                  reachout@actvli.com
                </a>
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="name">Startup Name *</Label>
                <Input
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Acme Inc."
                />
              </div>

              <div>
                <Label htmlFor="website_url">Website URL *</Label>
                <Input
                  id="website_url"
                  type="url"
                  required
                  value={formData.website_url}
                  onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                  placeholder="https://example.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="country">Country *</Label>
                  <Select
                    id="country"
                    required
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    id="category"
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Short pitch about your startup..."
                />
              </div>

              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading ? "Creating..." : "Continue to Connect Provider"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
