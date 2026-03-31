"use client";

import { Wallet, BarChart3 } from "lucide-react";
import { GrowthMatrix } from "./growth-matrix";
import { GrowthChart } from "./growth-chart";

interface Summary {
  totalValue: number;
  totalInvested: number;
  totalPnl: number;
  totalPnlPercent: number;
  xirr: number | null;
}

function fmtCompact(v: number): string {
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)}Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(2)}L`;
  return `₹${Math.round(v).toLocaleString("en-IN")}`;
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  valueClass,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-xl border bg-card" style={{ padding: "20px 24px" }}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
      </div>
      <p className={`font-mono text-2xl font-semibold tracking-tight ${valueClass ?? ""}`}>
        {value}
      </p>
      {sub && (
        <p className="text-xs text-muted-foreground font-mono mt-1">{sub}</p>
      )}
    </div>
  );
}

export function ProjectorView({ summary }: { summary: Summary }) {
  const { totalValue, totalInvested, totalPnlPercent } = summary;

  const portfolioFormatted = fmtCompact(totalValue);
  const investedFormatted = fmtCompact(totalInvested);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>

      {/* ── Page header ── */}
      <div style={{ maxWidth: "640px" }}>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
          Finance OS
        </p>
        <h1
          className="font-semibold tracking-tight text-foreground"
          style={{ fontSize: "28px", lineHeight: "1.2", marginBottom: "12px" }}
        >
          Wealth Projector
        </h1>
        <p className="text-muted-foreground" style={{ fontSize: "15px", lineHeight: "1.6" }}>
          Your portfolio today —{" "}
          <span className="font-mono font-semibold text-foreground">{portfolioFormatted}</span>{" "}
          — projected across 20 years and 11 return scenarios. No new contributions assumed.
          Just the math of money growing on money.
        </p>
      </div>

      {/* ── Stat bar (2 cards) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ maxWidth: "560px" }}>
        <StatCard
          icon={Wallet}
          label="Portfolio Today"
          value={portfolioFormatted}
          sub="current market value"
        />
        <StatCard
          icon={BarChart3}
          label="Total Invested"
          value={investedFormatted}
          sub={`${totalPnlPercent >= 0 ? "+" : ""}${totalPnlPercent.toFixed(1)}% total return`}
        />
      </div>

      {/* ── Matrix section ── */}
      <div>
        <div style={{ marginBottom: "16px" }}>
          <h2 className="text-sm font-semibold text-foreground" style={{ marginBottom: "4px" }}>
            Compound Growth Matrix
          </h2>
          <p className="text-xs text-muted-foreground">
            Each cell shows projected wealth at that CAGR over that many years.
            Darker green = stronger compounding effect.
          </p>
        </div>
        <GrowthMatrix portfolioValue={totalValue} />
      </div>

      {/* ── Colour legend ── */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
          Multiple of today:
        </span>
        {[
          { label: "1×",   bg: "rgba(16,185,129,0.04)" },
          { label: "1.5×", bg: "rgba(16,185,129,0.13)" },
          { label: "2×",   bg: "rgba(16,185,129,0.22)" },
          { label: "3×",   bg: "rgba(16,185,129,0.34)" },
          { label: "5×",   bg: "rgba(16,185,129,0.48)" },
          { label: "8×+",  bg: "rgba(16,185,129,0.64)" },
        ].map(({ label, bg }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span
              className="inline-block rounded"
              style={{ width: "20px", height: "14px", backgroundColor: bg, border: "1px solid hsl(var(--border))" }}
            />
            <span className="text-xs text-muted-foreground font-mono">{label}</span>
          </div>
        ))}
      </div>

      {/* ── Line charts ── */}
      <GrowthChart portfolioValue={totalValue} />

      {/* ── Footnote ── */}
      <p
        className="text-xs text-muted-foreground border-t"
        style={{ paddingTop: "16px" }}
      >
        * Projections use the current portfolio value as the starting point. No new contributions,
        withdrawals, or dividend reinvestment are modelled. Returns are compounded annually.
        Past performance is not indicative of future results. All values in INR.
      </p>

    </div>
  );
}
