"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";
import { motion } from "framer-motion";

interface Startup {
  id: string;
  name: string;
  slug: string;
  website_url: string;
  country: string;
  category: string;
  metrics: {
    mrr: number;
    total_revenue: number;
    last_30d_revenue: number;
    currency: string;
    provider: string;
    provider_last_synced_at: string | null;
  } | null;
  connection: {
    status: string;
    provider: string;
  } | null;
}

interface Sponsorship {
  id: string;
  startup_id: string;
  startup_name: string;
  type: string;
  status: string;
  stripe_subscription_id: string | null;
  start_date: string | null;
  end_date: string | null;
}

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [startups, setStartups] = useState<Startup[]>([]);
  const [sponsorships, setSponsorships] = useState<Sponsorship[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"startups" | "sponsorships">("startups");

  useEffect(() => {
    // Check if already authenticated (simple cookie-based check)
    const isAuth = document.cookie.includes("admin_authenticated=true");
    setAuthenticated(isAuth);
    if (isAuth) {
      fetchStartups();
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const response = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (response.ok) {
      document.cookie = "admin_authenticated=true; path=/; max-age=86400"; // 24 hours
      setAuthenticated(true);
      fetchStartups();
    } else {
      alert("Invalid password");
    }
  };

  const fetchStartups = async () => {
    setLoading(true);
    try {
      const [startupsRes, sponsorshipsRes] = await Promise.all([
        fetch("/api/admin/startups"),
        fetch("/api/admin/sponsorships"),
      ]);

      if (startupsRes.ok) {
        const data = await startupsRes.json();
        setStartups(data);
      }

      if (sponsorshipsRes.ok) {
        const data = await sponsorshipsRes.json();
        setSponsorships(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (startupId: string) => {
    try {
      const response = await fetch(`/api/admin/sync/${startupId}`, {
        method: "POST",
      });
      if (response.ok) {
        alert("Sync initiated");
        fetchStartups();
      } else {
        alert("Sync failed");
      }
    } catch (error) {
      console.error(error);
      alert("Sync failed");
    }
  };

  const handleDeactivateSponsorship = async (sponsorshipId: string) => {
    if (!confirm("Are you sure you want to deactivate this sponsorship?")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/sponsorships/${sponsorshipId}/deactivate`, {
        method: "POST",
      });
      if (response.ok) {
        alert("Sponsorship deactivated");
        fetchStartups();
      } else {
        alert("Failed to deactivate");
      }
    } catch (error) {
      console.error(error);
      alert("Failed to deactivate");
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Admin Login</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                type="password"
                placeholder="Admin Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Button type="submit" className="w-full">
                Login
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen container mx-auto px-4 py-16">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage startups, sponsorships, and sync metrics</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b">
        <button
          onClick={() => setActiveTab("startups")}
          className={`pb-2 px-4 font-semibold transition-colors ${
            activeTab === "startups"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Startups
        </button>
        <button
          onClick={() => setActiveTab("sponsorships")}
          className={`pb-2 px-4 font-semibold transition-colors ${
            activeTab === "sponsorships"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Sponsorships ({sponsorships.length})
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16">Loading...</div>
      ) : activeTab === "startups" ? (
        <div className="space-y-4">
          {startups.map((startup) => (
            <motion.div
              key={startup.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="glass-strong">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-2">{startup.name}</h3>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>{startup.website_url}</div>
                        <div>
                          {startup.country} • {startup.category}
                        </div>
                        {startup.connection && (
                          <div>
                            Provider: {startup.connection.provider} • Status:{" "}
                            {startup.connection.status}
                          </div>
                        )}
                      </div>
                      {startup.metrics && (
                        <div className="mt-4 grid grid-cols-3 gap-4">
                          <div>
                            <div className="text-xs text-muted-foreground">MRR</div>
                            <div className="font-semibold">
                              {formatCurrency(
                                startup.metrics.mrr,
                                startup.metrics.currency
                              )}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Last 30d</div>
                            <div className="font-semibold">
                              {formatCurrency(
                                startup.metrics.last_30d_revenue,
                                startup.metrics.currency
                              )}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Total</div>
                            <div className="font-semibold">
                              {formatCurrency(
                                startup.metrics.total_revenue,
                                startup.metrics.currency
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                      {startup.metrics?.provider_last_synced_at && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          Last synced:{" "}
                          {formatRelativeTime(startup.metrics.provider_last_synced_at)}
                        </div>
                      )}
                    </div>
                    <Button
                      onClick={() => handleSync(startup.id)}
                      variant="outline"
                      size="sm"
                    >
                      Sync Now
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {sponsorships.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              No sponsorships found
            </div>
          ) : (
            sponsorships.map((sponsorship) => (
              <motion.div
                key={sponsorship.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="glass-strong">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold mb-2">{sponsorship.startup_name}</h3>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <div>
                            Type: <span className="font-semibold capitalize">{sponsorship.type.replace("_", " ")}</span>
                          </div>
                          <div>
                            Status: <span className={`font-semibold ${
                              sponsorship.status === "active" ? "text-green-500" :
                              sponsorship.status === "cancelled" ? "text-red-500" :
                              "text-yellow-500"
                            }`}>{sponsorship.status}</span>
                          </div>
                          {sponsorship.start_date && (
                            <div>Start: {new Date(sponsorship.start_date).toLocaleDateString()}</div>
                          )}
                          {sponsorship.end_date && (
                            <div>End: {new Date(sponsorship.end_date).toLocaleDateString()}</div>
                          )}
                          {sponsorship.stripe_subscription_id && (
                            <div className="text-xs">
                              Subscription: {sponsorship.stripe_subscription_id}
                            </div>
                          )}
                        </div>
                      </div>
                      {sponsorship.status === "active" && (
                        <Button
                          onClick={() => handleDeactivateSponsorship(sponsorship.id)}
                          variant="destructive"
                          size="sm"
                        >
                          Deactivate
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
