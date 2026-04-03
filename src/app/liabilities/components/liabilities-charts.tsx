"use client";

import { useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Sector,
} from "recharts";
import type { PieSectorShapeProps } from "recharts/types/polar/Pie";
import type { LiabilityWithPayments } from "@/lib/types";
import { LIABILITY_TYPE_LABELS, LIABILITY_TYPE_CHART_COLORS } from "@/lib/types";
import type { LiabilityType } from "@/lib/enums";

function fmtCompact(v: number): string {
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(1)}Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(1)}L`;
  return `₹${Math.round(v).toLocaleString("en-IN")}`;
}

// ─── Paydown chart ────────────────────────────────────────────────────────────

type Range = "1Y" | "3Y" | "5Y" | "ALL";

function buildPaydownData(liabilities: LiabilityWithPayments[], range: Range) {
  // Collect all payment dates across all liabilities
  const allDates = new Set<string>();
  for (const lib of liabilities) {
    for (const p of lib.payments) {
      allDates.add(p.date.slice(0, 10));
    }
  }

  const cutoff = new Date();
  if (range === "1Y") cutoff.setFullYear(cutoff.getFullYear() - 1);
  else if (range === "3Y") cutoff.setFullYear(cutoff.getFullYear() - 3);
  else if (range === "5Y") cutoff.setFullYear(cutoff.getFullYear() - 5);
  else cutoff.setFullYear(2000);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const sortedDates = [...allDates].filter((d) => d >= cutoffStr).sort();
  if (sortedDates.length === 0) return [];

  return sortedDates.map((date) => {
    let total = 0;
    for (const lib of liabilities) {
      if (lib.startDate.slice(0, 10) > date) continue;
      // Find the latest payment on or before this date
      const pay = lib.payments
        .filter((p) => p.date.slice(0, 10) <= date)
        .sort((a, b) => b.date.localeCompare(a.date))[0];
      total += pay ? pay.balanceAfter : lib.originalAmount;
    }
    return {
      date,
      value: total,
      label: new Date(date + "T12:00:00").toLocaleDateString("en-IN", {
        month: "short",
        year: "2-digit",
      }),
    };
  });
}

interface PaydownProps {
  liabilities: LiabilityWithPayments[];
}

export function LiabilityPaydownChart({ liabilities }: PaydownProps) {
  const [range, setRange] = useState<Range>("ALL");
  const data = buildPaydownData(liabilities, range);

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
    payload?: { value: number }[];
    label?: string;
  }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-lg border bg-popover shadow-md text-xs" style={{ padding: "10px 14px" }}>
        <p className="text-muted-foreground mb-1">{label}</p>
        <p className="font-mono font-semibold text-rose-600 dark:text-rose-400">{fmtCompact(payload[0].value)}</p>
        <p className="text-muted-foreground" style={{ fontSize: "10px", marginTop: "2px" }}>outstanding</p>
      </div>
    );
  };

  return (
    <div className="rounded-xl border bg-card" style={{ padding: "20px 24px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Debt Paydown Over Time
        </p>
        {/* Range tabs */}
        <div style={{ display: "flex", gap: "2px" }}>
          {(["1Y", "3Y", "5Y", "ALL"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-2 py-0.5 text-xs rounded transition-colors ${
                range === r
                  ? "bg-muted text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {data.length < 2 ? (
        <div style={{ height: "160px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p className="text-xs text-muted-foreground">Log payments to see your paydown progress</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="debtGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.28} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tickFormatter={fmtAxis}
              tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              width={52}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="step"
              dataKey="value"
              stroke="#ef4444"
              strokeWidth={2}
              fill="url(#debtGrad)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0, fill: "#ef4444" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ─── Donut chart ──────────────────────────────────────────────────────────────

interface DonutProps {
  liabilities: LiabilityWithPayments[];
  activeType: LiabilityType | "ALL";
  onTypeSelect: (type: LiabilityType | "ALL") => void;
}

export function LiabilityDonutChart({ liabilities, activeType, onTypeSelect }: DonutProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Aggregate outstanding by type (active liabilities only)
  const byType: Record<string, number> = {};
  for (const l of liabilities) {
    if (l.outstandingBalance <= 0) continue;
    byType[l.type] = (byType[l.type] ?? 0) + l.outstandingBalance;
  }

  const slices = Object.entries(byType)
    .filter(([, v]) => v > 0)
    .map(([type, value]) => ({
      type: type as LiabilityType,
      label: LIABILITY_TYPE_LABELS[type as LiabilityType],
      value,
      color: LIABILITY_TYPE_CHART_COLORS[type as LiabilityType],
    }))
    .sort((a, b) => b.value - a.value);

  const total = slices.reduce((s, x) => s + x.value, 0);

  function makeSectorShape(sl: typeof slices, hover: number | null) {
    return function SectorShape(props: PieSectorShapeProps, index: number) {
      const { cx, cy, innerRadius, outerRadius, startAngle, endAngle } = props;
      const sliceType = sl[index]?.type;
      const isActive = sliceType !== undefined && activeType === sliceType;
      const isHover = index === hover;
      const color = sl[index]?.color ?? "#888";
      return (
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius as number}
          outerRadius={(isActive || isHover) ? (outerRadius as number) + 6 : (outerRadius as number)}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={color}
          stroke="hsl(var(--card))"
          strokeWidth={2}
        />
      );
    };
  }

  return (
    <div className="rounded-xl border bg-card" style={{ padding: "20px 24px" }}>
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground" style={{ marginBottom: "16px" }}>
        By Debt Type
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
        <div style={{ flexShrink: 0 }}>
          <ResponsiveContainer width={160} height={160}>
            <PieChart>
              <Pie
                data={slices}
                dataKey="value"
                cx="50%"
                cy="50%"
                innerRadius={48}
                outerRadius={72}
                shape={makeSectorShape(slices, hoverIndex)}
                onMouseEnter={(_, idx) => setHoverIndex(idx)}
                onMouseLeave={() => setHoverIndex(null)}
                onClick={(_, idx) => {
                  const t = slices[idx]?.type;
                  if (!t) return;
                  onTypeSelect(activeType === t ? "ALL" : t);
                }}
                style={{ cursor: "pointer" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
          {slices.map((s, i) => {
            const isActive = activeType === s.type;
            return (
              <button
                key={i}
                onClick={() => onTypeSelect(isActive ? "ALL" : s.type)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "8px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "2px 0",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor: s.color,
                    flexShrink: 0,
                    opacity: activeType !== "ALL" && !isActive ? 0.3 : 1,
                  }} />
                  <span className={`text-xs ${activeType !== "ALL" && !isActive ? "text-muted-foreground/40" : "text-muted-foreground"}`}>
                    {s.label}
                  </span>
                </div>
                <span className="font-mono text-xs font-medium text-foreground">
                  {total > 0 ? `${((s.value / total) * 100).toFixed(0)}%` : "—"}
                </span>
              </button>
            );
          })}
          {slices.length === 0 && (
            <p className="text-xs text-muted-foreground">No active liabilities</p>
          )}
        </div>
      </div>
    </div>
  );
}
