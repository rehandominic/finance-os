"use client";

import { useState } from "react";
import { Wallet, BarChart3, TrendingUp, Landmark, Settings2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { GrowthMatrix, type AssetProjection } from "./growth-matrix";
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
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</span>
      </div>
      <p className={`font-mono text-2xl font-semibold tracking-tight ${valueClass ?? ""}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground font-mono mt-1">{sub}</p>}
    </div>
  );
}

interface Props {
  summary: Summary;
  monthlyInvesting: number;
  assetProjections: AssetProjection[];
}

export function ProjectorView({ summary, monthlyInvesting, assetProjections }: Props) {
  const { totalValue, totalInvested, totalPnlPercent } = summary;
  const [stepUp, setStepUp] = useState(10);
  const [currentAge, setCurrentAge] = useState<number | "">(30);

  const assetsTotal = assetProjections.reduce((s, a) => s + a.currentValue, 0);
  const assetsWithCagr = assetProjections.filter((a) => a.expectedCagr != null && a.expectedCagr > 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>

      {/* ── Page header ── */}
      <div style={{ maxWidth: "640px" }}>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Finance OS</p>
        <h1 className="font-semibold tracking-tight text-foreground" style={{ fontSize: "28px", lineHeight: "1.2", marginBottom: "12px" }}>
          Wealth Projector
        </h1>
        <p className="text-muted-foreground" style={{ fontSize: "15px", lineHeight: "1.6" }}>
          Your investment portfolio today —{" "}
          <span className="font-mono font-semibold text-foreground">{fmtCompact(totalValue)}</span>
          {assetsTotal > 0 && (
            <>
              {" "}plus{" "}
              <span className="font-mono font-semibold text-foreground">{fmtCompact(assetsTotal)}</span>
              {" "}in assets
            </>
          )}
          {monthlyInvesting > 0 && (
            <>
              , with{" "}
              <span className="font-mono font-semibold text-foreground">{fmtCompact(monthlyInvesting)}/mo</span>
              {" "}in contributions stepping up {stepUp}%/yr
            </>
          )}
          {" "}— projected across 20 years and 11 return scenarios.
        </p>
      </div>

      {/* ── Stat bar ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          icon={TrendingUp}
          label="Portfolio Today"
          value={fmtCompact(totalValue)}
          sub="investments market value"
        />
        <StatCard
          icon={BarChart3}
          label="Total Invested"
          value={fmtCompact(totalInvested)}
          sub={`${totalPnlPercent >= 0 ? "+" : ""}${totalPnlPercent.toFixed(1)}% total return`}
        />
        <StatCard
          icon={Wallet}
          label="Monthly SIP"
          value={monthlyInvesting > 0 ? fmtCompact(monthlyInvesting) : "—"}
          sub="from cash flow plan"
          valueClass={monthlyInvesting > 0 ? "text-emerald-600 dark:text-emerald-400" : undefined}
        />
        <StatCard
          icon={Landmark}
          label="Assets"
          value={assetsTotal > 0 ? fmtCompact(assetsTotal) : "—"}
          sub={assetsWithCagr.length > 0 ? `${assetsWithCagr.length} with CAGR set` : "no CAGR set"}
        />
      </div>

      {/* ── Settings nudge ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <Settings2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="text-xs text-muted-foreground">
          Projections use a {stepUp}% annual SIP step-up{currentAge !== "" ? ` · age ${currentAge} in ${new Date().getFullYear()}` : ""} — adjust in{" "}
          <button
            onClick={() => document.getElementById("projection-settings")?.scrollIntoView({ behavior: "smooth" })}
            className="underline underline-offset-2 hover:text-foreground transition-colors"
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: "inherit" }}
          >
            Projection Settings
          </button>{" "}below.
        </span>
      </div>

      {/* ── Matrix ── */}
      <div>
        <div style={{ marginBottom: "16px" }}>
          <h2 className="text-sm font-semibold text-foreground" style={{ marginBottom: "4px" }}>
            Compound Growth Matrix
          </h2>
          <p className="text-xs text-muted-foreground">
            Each cell = investments compounding at that CAGR (with contributions) + assets at their own rates.
            Multiples relative to combined portfolio today.
          </p>
        </div>
        <GrowthMatrix
          portfolioValue={totalValue}
          monthlyContrib={monthlyInvesting}
          stepUp={stepUp}
          assets={assetProjections}
          currentAge={currentAge === "" ? null : currentAge}
        />
      </div>

      {/* ── Colour legend ── */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Multiple of today:</span>
        {[
          { label: "1×",   bg: "rgba(16,185,129,0.04)" },
          { label: "1.5×", bg: "rgba(16,185,129,0.13)" },
          { label: "2×",   bg: "rgba(16,185,129,0.22)" },
          { label: "3×",   bg: "rgba(16,185,129,0.34)" },
          { label: "5×",   bg: "rgba(16,185,129,0.48)" },
          { label: "8×+",  bg: "rgba(16,185,129,0.64)" },
        ].map(({ label, bg }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className="inline-block rounded" style={{ width: "20px", height: "14px", backgroundColor: bg, border: "1px solid rgba(100,116,139,0.2)" }} />
            <span className="text-xs text-muted-foreground font-mono">{label}</span>
          </div>
        ))}
      </div>

      {/* ── Line charts ── */}
      <GrowthChart
        portfolioValue={totalValue}
        monthlyContrib={monthlyInvesting}
        stepUp={stepUp}
        assets={assetProjections}
        currentAge={currentAge === "" ? null : currentAge}
      />

      {/* ── Projection Settings ── */}
      <div id="projection-settings" className="rounded-xl border bg-card" style={{ padding: "20px 24px" }}>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground" style={{ marginBottom: "16px" }}>
          Projection Settings
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1, minWidth: "200px" }}>
              <span className="text-sm font-medium text-foreground">Annual SIP Step-Up (%)</span>
              <p className="text-xs text-muted-foreground">By how much your monthly investment grows each year</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
              <Input
                type="number"
                min="0"
                max="50"
                step="1"
                value={stepUp}
                onChange={(e) => setStepUp(Math.max(0, Math.min(50, Number(e.target.value) || 0)))}
                className="h-9 font-mono text-sm"
                style={{ width: "80px" }}
              />
              <span className="text-sm text-muted-foreground">% / year</span>
            </div>
          </div>
          <div style={{ borderTop: "1px solid rgba(100,116,139,0.2)", paddingTop: "16px", display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1, minWidth: "200px" }}>
              <span className="text-sm font-medium text-foreground">Your Age This Year</span>
              <p className="text-xs text-muted-foreground">Shows your age at each year in the projection table and chart</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
              <Input
                type="number"
                min="1"
                max="100"
                step="1"
                value={currentAge}
                onChange={(e) => setCurrentAge(e.target.value === "" ? "" : Math.max(1, Math.min(100, Number(e.target.value))))}
                className="h-9 font-mono text-sm"
                style={{ width: "80px" }}
                placeholder="30"
              />
              <span className="text-sm text-muted-foreground">years old</span>
            </div>
          </div>
        </div>
        {assetsTotal > 0 && assetsWithCagr.length < assetProjections.length && (
          <p className="text-xs text-muted-foreground" style={{ marginTop: "12px" }}>
            {assetProjections.length - assetsWithCagr.length} asset{assetProjections.length - assetsWithCagr.length !== 1 ? "s" : ""} have no CAGR set — included at today&apos;s value with 0% growth. Set a CAGR on the Assets page to project them.
          </p>
        )}
      </div>

      {/* ── Footnote ── */}
      <p className="text-xs text-muted-foreground border-t" style={{ paddingTop: "16px" }}>
        * Investment projections use the current portfolio value as base, compounding at each scenario CAGR with monthly contributions stepping up {stepUp}% per year.
        Asset projections use each asset&apos;s individually set CAGR (0% if not set), compounded independently.
        Returns are compounded annually. No withdrawals or tax modelled. All values in INR.
      </p>

    </div>
  );
}
