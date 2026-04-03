"use client";

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Sector,
} from "recharts";
import type { PieSectorShapeProps } from "recharts/types/polar/Pie";
import type { AssetWithValuations } from "@/lib/types";
import { ASSET_TYPE_LABELS, ASSET_TYPE_CHART_COLORS } from "@/lib/types";
import type { AssetType } from "@/lib/enums";
import { useState } from "react";

function fmtCompact(v: number): string {
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(1)}Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(1)}L`;
  return `₹${Math.round(v).toLocaleString("en-IN")}`;
}

// ─── Donut Chart ──────────────────────────────────────────────────────────────

interface DonutProps {
  assets: AssetWithValuations[];
}

export function AssetDonutChart({ assets }: DonutProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Aggregate by type
  const byType: Record<string, number> = {};
  for (const a of assets) {
    byType[a.type] = (byType[a.type] ?? 0) + a.currentValue;
  }

  const slices = Object.entries(byType)
    .filter(([, v]) => v > 0)
    .map(([type, value]) => ({
      type: type as AssetType,
      label: ASSET_TYPE_LABELS[type as AssetType],
      value,
      color: ASSET_TYPE_CHART_COLORS[type as AssetType],
    }))
    .sort((a, b) => b.value - a.value);

  const total = slices.reduce((s, x) => s + x.value, 0);

  function makeSectorShape(sl: typeof slices, ai: number | null) {
    return function SectorShape(props: PieSectorShapeProps, index: number) {
      const { cx, cy, innerRadius, outerRadius, startAngle, endAngle } = props;
      const isActive = index === ai;
      const color = sl[index]?.color ?? "#888";
      return (
        <Sector
          cx={cx} cy={cy}
          innerRadius={innerRadius as number}
          outerRadius={isActive ? (outerRadius as number) + 6 : (outerRadius as number)}
          startAngle={startAngle} endAngle={endAngle}
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
        By Asset Type
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
                shape={makeSectorShape(slices, activeIndex)}
                onClick={(_, idx) => setActiveIndex(ai => ai === idx ? null : idx)}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
          {slices.map((s, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(ai => ai === i ? null : i)}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", background: "none", border: "none", cursor: "pointer", padding: "2px 0" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: s.color, flexShrink: 0 }} />
                <span className={`text-xs ${activeIndex !== null && activeIndex !== i ? "text-muted-foreground/40" : "text-muted-foreground"}`}>{s.label}</span>
              </div>
              <span className="font-mono text-xs font-medium text-foreground">
                {total > 0 ? `${((s.value / total) * 100).toFixed(0)}%` : "—"}
              </span>
            </button>
          ))}
          {slices.length === 0 && (
            <p className="text-xs text-muted-foreground">No assets yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Area Chart ───────────────────────────────────────────────────────────────

interface AreaProps {
  assets: AssetWithValuations[];
}

export function AssetAreaChart({ assets }: AreaProps) {
  // Build time-series: collect all unique valuation dates and compute total value
  const dateMap: Map<string, number> = new Map();

  for (const asset of assets) {
    for (const v of asset.valuations) {
      const date = v.date.slice(0, 10);
      dateMap.set(date, (dateMap.get(date) ?? 0) + v.value);
    }
  }

  // Sort by date
  const sorted = Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({
      date,
      value,
      label: new Date(date).toLocaleDateString("en-IN", { month: "short", year: "2-digit" }),
    }));

  function fmtAxis(v: number): string {
    if (v >= 1e7) return `₹${(v / 1e7).toFixed(0)}Cr`;
    if (v >= 1e5) return `₹${(v / 1e5).toFixed(0)}L`;
    return `₹${(v / 1000).toFixed(0)}K`;
  }

  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: { value: number }[];
    label?: string;
  }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-lg border bg-popover shadow-md text-xs" style={{ padding: "10px 14px" }}>
        <p className="text-muted-foreground mb-1">{label}</p>
        <p className="font-mono font-semibold text-foreground">{fmtCompact(payload[0].value)}</p>
      </div>
    );
  };

  return (
    <div className="rounded-xl border bg-card" style={{ padding: "20px 24px 16px" }}>
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground" style={{ marginBottom: "16px" }}>
        Total Asset Value Over Time
      </p>
      {sorted.length < 2 ? (
        <div style={{ height: "160px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p className="text-xs text-muted-foreground">Add more assets and valuations to see trends</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={sorted} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="assetGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={fmtAxis} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={52} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="step" dataKey="value" stroke="#10b981" strokeWidth={2} fill="url(#assetGrad)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
