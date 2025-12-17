"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { supabase } from "@/lib/supabase/client";

interface StartupMetricsChartProps {
  startupId: string;
}

export function StartupMetricsChart({ startupId }: StartupMetricsChartProps) {
  const [data, setData] = useState<Array<{ date: string; mrr: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      const { data: history, error } = await supabase
        .from("startup_metrics_history")
        .select("snapshot_date, mrr")
        .eq("startup_id", startupId)
        .order("snapshot_date", { ascending: true })
        .limit(30);

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      const chartData = (history || []).map((h) => ({
        date: new Date(h.snapshot_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        mrr: Number(h.mrr),
      }));

      setData(chartData);
      setLoading(false);
    }

    fetchHistory();
  }, [startupId]);

  if (loading) {
    return <div className="h-64 flex items-center justify-center text-muted-foreground">Loading chart...</div>;
  }

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        No historical data available yet. Metrics will appear here after syncing.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
        <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
        <YAxis stroke="hsl(var(--muted-foreground))" />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
          }}
        />
        <Line
          type="monotone"
          dataKey="mrr"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={{ fill: "hsl(var(--primary))" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
