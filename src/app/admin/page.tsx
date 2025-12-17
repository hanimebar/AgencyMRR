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

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [startups, setStartups] = useState<Startup[]>([]);
  const [loading, setLoading] = useState(false);

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
      const response = await fetch("/api/admin/startups");
      if (response.ok) {
        const data = await response.json();
        setStartups(data);
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
        <p className="text-muted-foreground">Manage startups and sync metrics</p>
      </div>

      {loading ? (
        <div className="text-center py-16">Loading...</div>
      ) : (
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
      )}
    </div>
  );
}
