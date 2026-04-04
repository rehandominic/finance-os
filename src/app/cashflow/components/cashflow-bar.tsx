"use client";

import { useState } from "react";
import type { SerializedBudgetBucket, SerializedIncomeSource } from "@/lib/types";
import { BUCKET_TYPE_CHART_COLORS, BUCKET_TYPE_LABELS } from "@/lib/types";
import { Currency } from "@/lib/enums";

interface Props {
  incomeSources: SerializedIncomeSource[];
  buckets: SerializedBudgetBucket[];
  toDisplay: (amount: number, fromCurrency: Currency) => number;
  fmtCompact: (v: number) => string;
}

export function CashflowBar({ incomeSources, buckets, toDisplay, fmtCompact }: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const totalIncome = incomeSources.reduce(
    (s, src) => s + toDisplay(src.amount, src.currency as Currency), 0
  );

  // Sorted by order then createdAt (already sorted server-side)
  const segments = buckets.map((b) => ({
    id: b.id,
    name: b.name,
    amount: toDisplay(b.amount, b.currency as Currency),
    color: b.color ?? BUCKET_TYPE_CHART_COLORS[b.type],
    type: b.type,
  }));

  const totalAllocated = segments.reduce((s, seg) => s + seg.amount, 0);
  const unallocated = totalIncome - totalAllocated;
  const isOver = unallocated < 0;
  const overflowPct = isOver ? Math.abs(unallocated / totalIncome) * 100 : 0;

  if (totalIncome === 0) {
    return (
      <div className="rounded-xl border bg-card" style={{ padding: "24px" }}>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground" style={{ marginBottom: "16px" }}>
          Monthly Allocation
        </p>
        <div style={{ height: "48px", borderRadius: "8px", backgroundColor: "hsl(var(--muted))", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p className="text-xs text-muted-foreground">Add an income source to see your allocation bar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card" style={{ padding: "24px" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "16px" }}>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Monthly Allocation
        </p>
        <span className="font-mono text-sm font-semibold text-foreground">
          {fmtCompact(totalIncome)} / month
        </span>
      </div>

      {/* ── The bar ── */}
      <div style={{ position: "relative", marginBottom: "20px" }}>
        <div style={{
          display: "flex",
          height: "40px",
          borderRadius: "8px",
          overflow: "hidden",
          border: isOver ? "1.5px solid hsl(0,70%,55%)" : "1px solid hsl(var(--border))",
        }}>
          {segments.map((seg) => {
            const pct = Math.min((seg.amount / totalIncome) * 100, 100);
            const isHovered = hoveredId === seg.id;
            return (
              <div
                key={seg.id}
                style={{
                  width: `${pct}%`,
                  minWidth: pct > 0 ? "2px" : 0,
                  backgroundColor: seg.color,
                  opacity: hoveredId !== null && !isHovered ? 0.55 : 1,
                  transition: "opacity 0.15s, width 0.3s",
                  cursor: "default",
                  flexShrink: 0,
                }}
                onMouseEnter={() => setHoveredId(seg.id)}
                onMouseLeave={() => setHoveredId(null)}
              />
            );
          })}
          {/* Unallocated tail */}
          {!isOver && unallocated > 0 && (
            <div style={{
              flex: 1,
              backgroundColor: "hsl(var(--muted))",
              opacity: hoveredId !== null ? 0.55 : 1,
            }} />
          )}
        </div>

        {/* Over-allocation dashed marker at 100% */}
        {isOver && (
          <div style={{
            position: "absolute",
            top: 0,
            right: `${Math.min(overflowPct, 98)}%`,
            height: "40px",
            width: "2px",
            borderLeft: "2px dashed hsl(0,70%,55%)",
            pointerEvents: "none",
          }} />
        )}

        {/* Hover tooltip */}
        {hoveredId && (() => {
          const seg = segments.find((s) => s.id === hoveredId);
          if (!seg || totalIncome === 0) return null;
          const pct = (seg.amount / totalIncome) * 100;
          return (
            <div style={{
              position: "absolute",
              bottom: "calc(100% + 8px)",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 20,
              pointerEvents: "none",
            }}>
              <div className="rounded-lg border bg-popover shadow-md text-xs" style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>
                <p className="font-medium text-foreground">{seg.name}</p>
                <p className="font-mono text-muted-foreground">{fmtCompact(seg.amount)} · {pct.toFixed(1)}%</p>
              </div>
            </div>
          );
        })()}
      </div>

      {/* ── Legend ── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 20px" }}>
        {segments.map((seg) => {
          const pct = totalIncome > 0 ? (seg.amount / totalIncome) * 100 : 0;
          const isHovered = hoveredId === seg.id;
          return (
            <button
              key={seg.id}
              onMouseEnter={() => setHoveredId(seg.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: "none",
                border: "none",
                cursor: "default",
                padding: 0,
                opacity: hoveredId !== null && !isHovered ? 0.45 : 1,
                transition: "opacity 0.15s",
              }}
            >
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: seg.color, flexShrink: 0 }} />
              <span className="text-xs text-muted-foreground">{BUCKET_TYPE_LABELS[seg.type]}</span>
              <span className="text-xs font-medium text-foreground font-mono">{fmtCompact(seg.amount)}</span>
              <span className="text-xs text-muted-foreground font-mono">({pct.toFixed(0)}%)</span>
            </button>
          );
        })}
        {!isOver && unallocated > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "hsl(var(--muted-foreground))", opacity: 0.35, flexShrink: 0 }} />
            <span className="text-xs text-muted-foreground">Unallocated</span>
            <span className="text-xs font-medium text-foreground font-mono">{fmtCompact(unallocated)}</span>
            <span className="text-xs text-muted-foreground font-mono">({((unallocated / totalIncome) * 100).toFixed(0)}%)</span>
          </div>
        )}
        {isOver && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "hsl(0,70%,55%)", flexShrink: 0 }} />
            <span className="text-xs text-rose-600 dark:text-rose-400 font-medium">Over by {fmtCompact(Math.abs(unallocated))}</span>
          </div>
        )}
      </div>
    </div>
  );
}
