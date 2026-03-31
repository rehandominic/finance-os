"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { projectValue, fmtCompact, YEARS, CURRENT_YEAR } from "./growth-matrix";

// Show 6 representative rates — enough to tell the story without clutter
const CHART_RATES = [5, 10, 15, 20, 25];

const RATE_COLORS: Record<number, string> = {
  5:  "#64748b", // slate
  10: "#06b6d4", // cyan
  15: "#10b981", // emerald
  20: "#f59e0b", // amber
  25: "#f43f5e", // rose
};

interface Props {
  portfolioValue: number;
}

export function GrowthChart({ portfolioValue }: Props) {
  // One data point per year (same YEARS array as the matrix)
  const data = YEARS.map((year) => {
    const point: Record<string, number | string> = { year: String(year) };
    for (const rate of CHART_RATES) {
      point[`${rate}%`] = Math.round(projectValue(portfolioValue, rate, year));
    }
    return point;
  });

  function fmtAxis(v: number): string {
    if (v >= 1e7) return `₹${(v / 1e7).toFixed(0)}Cr`;
    if (v >= 1e5) return `₹${(v / 1e5).toFixed(0)}L`;
    return `₹${(v / 1000).toFixed(0)}K`;
  }

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: { name: string; value: number; color: string }[];
    label?: string;
  }) => {
    if (!active || !payload?.length) return null;
    const yearsAhead = Number(label) - CURRENT_YEAR;
    return (
      <div
        className="rounded-lg border bg-popover shadow-md text-xs"
        style={{ padding: "10px 14px", minWidth: "160px" }}
      >
        <p className="font-semibold text-foreground mb-2">
          {label}
          <span className="text-muted-foreground font-normal ml-1.5">
            (+{yearsAhead} yrs)
          </span>
        </p>
        {payload
          .slice()
          .reverse()
          .map((p) => (
            <div key={p.name} className="flex items-center justify-between gap-4 py-0.5">
              <div className="flex items-center gap-1.5">
                <span
                  className="inline-block h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: p.color }}
                />
                <span className="text-muted-foreground">{p.name} CAGR</span>
              </div>
              <span className="font-mono font-medium" style={{ color: p.color }}>
                {fmtCompact(p.value)}
              </span>
            </div>
          ))}
      </div>
    );
  };

  return (
    <div>
      <div style={{ marginBottom: "16px" }}>
        <h2 className="text-sm font-semibold text-foreground" style={{ marginBottom: "4px" }}>
          Growth Trajectories
        </h2>
        <p className="text-xs text-muted-foreground">
          How the same starting portfolio diverges dramatically across compounding rates over 20 years.
        </p>
      </div>

      <div className="rounded-xl border bg-card" style={{ padding: "24px 16px 16px 8px" }}>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={data} margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              vertical={false}
            />
            <XAxis
              dataKey="year"
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tickFormatter={fmtAxis}
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              width={58}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              iconType="circle"
              iconSize={8}
              formatter={(value) => (
                <span style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))" }}>
                  {value} CAGR
                </span>
              )}
            />
            {CHART_RATES.map((rate) => (
              <Line
                key={rate}
                type="monotone"
                dataKey={`${rate}%`}
                stroke={RATE_COLORS[rate]}
                strokeWidth={rate === 15 ? 2.5 : 1.8}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
