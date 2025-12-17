"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

export function LeaderboardFilters() {
  const [sortBy, setSortBy] = useState<"mrr" | "last_30d_revenue" | "total_revenue">("mrr");

  // For now, this is a simple client-side component
  // In a full implementation, this would trigger server-side filtering
  return (
    <div className="flex flex-wrap gap-4 items-center mb-6">
      <span className="text-sm text-muted-foreground">Sort by:</span>
      <Select
        value={sortBy}
        onChange={(e) => setSortBy(e.target.value as any)}
        className="w-48"
      >
        <option value="mrr">MRR (Highest)</option>
        <option value="last_30d_revenue">Last 30 Days</option>
        <option value="total_revenue">Total Revenue</option>
      </Select>
    </div>
  );
}
