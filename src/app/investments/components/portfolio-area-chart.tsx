"use client";

import { useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InvestmentWithStats } from "@/lib/types";
import { useCurrency } from "./investments-shell";
import { Currency } from "@/lib/enums";
import { calculateTotalInvested, calculateTotalQty } from "@/lib/calculations";

type Range = "1M" | "3M" | "6M" | "1Y" | "ALL";

const RANGES: Range[] = ["1M", "3M", "6M", "1Y", "ALL"];
const RANGE_DAYS: Record<Range, number> = {
  "1M": 30,
  "3M": 90,
  "6M": 180,
  "1Y": 365,
  ALL: 9999,
};

function buildTimeSeries(
  investments: InvestmentWithStats[],
  range: Range,
  toDisplay: (amount: number, fromCurrency: Currency) => number
) {
  const now = new Date();
  const daysBack = RANGE_DAYS[range];
  const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

  // Collect all unique transaction dates within range + today
  const dateSet = new Set<string>();
  dateSet.add(now.toISOString().split("T")[0]);

  for (const inv of investments) {
    for (const t of inv.transactions) {
      const d = new Date(t.date);
      if (d >= startDate) dateSet.add(d.toISOString().split("T")[0]);
    }
  }

  // Also sprinkle evenly-spaced points so chart isn't just transaction dates
  const step = Math.max(1, Math.floor(daysBack / 30));
  for (let i = 0; i <= daysBack; i += step) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    if (d >= startDate) dateSet.add(d.toISOString().split("T")[0]);
  }

  const sortedDates = Array.from(dateSet).sort();

  return sortedDates.map((dateStr) => {
    const date = new Date(dateStr + "T23:59:59");
    let invested = 0;
    let currentValue = 0;

    for (const inv of investments) {
      const txBefore = inv.transactions.filter((t) => new Date(t.date) <= date);
      if (txBefore.length === 0) continue;

      const qty = calculateTotalQty(txBefore);
      const invAmt = calculateTotalInvested(txBefore);

      invested += toDisplay(invAmt, inv.currency);
      // Use current price as proxy (no historical prices available)
      currentValue += toDisplay(qty * inv.currentPrice, inv.currency);
    }

    return {
      date: dateStr,
      invested: Math.round(invested),
      value: Math.round(currentValue),
    };
  }).filter((p) => p.invested > 0 || p.value > 0);
}

function formatDate(dateStr: string, range: Range): string {
  const d = new Date(dateStr);
  if (range === "1M") {
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  }
  if (range === "ALL") {
    return d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
  }
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

interface Props {
  investments: InvestmentWithStats[];
}

export function PortfolioAreaChart({ investments }: Props) {
  const [range, setRange] = useState<Range>("1Y");
  const { displayCurrency, toDisplay, fmt } = useCurrency();

  const data = useMemo(
    () => buildTimeSeries(investments, range, toDisplay),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [investments, range, displayCurrency]
  );

  const currencySymbol = displayCurrency === Currency.INR ? "₹" : "$";

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
    const invested = payload.find((p) => p.name === "invested");
    const value = payload.find((p) => p.name === "value");
    const pnl = (value?.value ?? 0) - (invested?.value ?? 0);
    const pnlPct =
      (invested?.value ?? 0) > 0 ? (pnl / (invested?.value ?? 1)) * 100 : 0;

    return (
      <div className="rounded-lg border bg-popover px-3 py-2.5 shadow-md text-xs space-y-1.5">
        <p className="font-medium text-foreground">
          {label ? formatDate(label, range) : ""}
        </p>
        <div className="flex items-center justify-between gap-6">
          <span className="text-muted-foreground">Invested</span>
          <span className="font-mono font-medium">
            {currencySymbol}
            {(invested?.value ?? 0).toLocaleString()}
          </span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="text-muted-foreground">Value</span>
          <span className="font-mono font-medium">
            {currencySymbol}
            {(value?.value ?? 0).toLocaleString()}
          </span>
        </div>
        <div className="flex items-center justify-between gap-6 border-t pt-1.5">
          <span className="text-muted-foreground">P&L</span>
          <span
            className={`font-mono font-medium ${pnl >= 0 ? "text-emerald-500" : "text-red-500"}`}
          >
            {pnl >= 0 ? "+" : ""}
            {currencySymbol}
            {Math.abs(pnl).toLocaleString()} ({pnl >= 0 ? "+" : ""}
            {pnlPct.toFixed(1)}%)
          </span>
        </div>
      </div>
    );
  };

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex flex-row items-start justify-between pb-2 gap-4">
        <div>
          <CardTitle className="text-base">Portfolio Value</CardTitle>
          <CardDescription>Invested vs Current Value over time</CardDescription>
        </div>
        {/* Range tabs */}
        <div className="flex items-center rounded-lg border overflow-hidden shrink-0">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-2.5 py-1 text-xs transition-colors ${
                range === r
                  ? "bg-foreground text-background font-medium"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {data.length < 2 ? (
          <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
            Not enough data for this range
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradInvested" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tickFormatter={(v) => formatDate(v, range)}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tickFormatter={(v) =>
                  v >= 1000000
                    ? `${currencySymbol}${(v / 1000000).toFixed(1)}M`
                    : v >= 100000
                    ? `${currencySymbol}${(v / 100000).toFixed(1)}L`
                    : v >= 1000
                    ? `${currencySymbol}${(v / 1000).toFixed(0)}K`
                    : `${currencySymbol}${v}`
                }
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                width={60}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="invested"
                name="invested"
                stroke="#10b981"
                strokeWidth={1.5}
                strokeDasharray="4 2"
                strokeOpacity={0.5}
                fill="url(#gradInvested)"
                dot={false}
                activeDot={{ r: 3 }}
              />
              <Area
                type="monotone"
                dataKey="value"
                name="value"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#gradValue)"
                dot={false}
                activeDot={{ r: 4, fill: "#10b981" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}

        {/* Legend */}
        <div className="flex items-center gap-4 mt-2 justify-center">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-0.5 opacity-50" style={{ borderTop: "2px dashed #10b981" }} />
            <span className="text-xs text-muted-foreground">Invested</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-0.5" style={{ backgroundColor: "#10b981" }} />
            <span className="text-xs text-muted-foreground">Current Value</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
