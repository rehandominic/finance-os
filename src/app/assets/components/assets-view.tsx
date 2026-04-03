"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, Wallet, TrendingUp, BarChart3, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AssetWithValuations } from "@/lib/types";
import { ASSET_TYPE_LABELS } from "@/lib/types";
import { AssetType, Currency } from "@/lib/enums";
import { useCurrency } from "@/app/investments/components/investments-shell";
import { AssetDonutChart, AssetAreaChart } from "./assets-charts";
import { AssetsTable } from "./assets-table";

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

const ALL_TYPES: (AssetType | "ALL")[] = ["ALL", ...Object.values(AssetType)];

interface Props {
  initialAssets: AssetWithValuations[];
}

export function AssetsView({ initialAssets }: Props) {
  const router = useRouter();
  const { toDisplay, fmt, displayCurrency } = useCurrency();

  const [assets, setAssets] = useState<AssetWithValuations[]>(initialAssets);
  const [typeFilter, setTypeFilter] = useState<AssetType | "ALL">("ALL");
  const [search, setSearch] = useState("");

  // ── Computed summary (in display currency) ────────────────────────────────
  const totalValue = assets.reduce((s, a) => s + toDisplay(a.currentValue, a.currency as Currency), 0);
  const totalCost  = assets.reduce((s, a) => s + toDisplay(a.purchasePrice, a.currency as Currency), 0);
  const totalAppreciation    = totalValue - totalCost;
  const totalAppreciationPct = totalCost > 0 ? (totalAppreciation / totalCost) * 100 : 0;

  // ── Filter ────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return assets.filter((a) => {
      const matchType = typeFilter === "ALL" || a.type === typeFilter;
      const matchSearch = !search || a.name.toLowerCase().includes(search.toLowerCase());
      return matchType && matchSearch;
    });
  }, [assets, typeFilter, search]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleAssetDeleted(id: string) {
    setAssets((prev) => prev.filter((a) => a.id !== id));
  }

  function handleAssetUpdated(updated: AssetWithValuations) {
    setAssets((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
  }

  const sym = displayCurrency === Currency.INR ? "₹" : "$";

  function fmtDisplay(v: number, fromCurrency: Currency): string {
    return fmt(v, fromCurrency);
  }

  // Compact for summary cards
  function fmtCompact(v: number): string {
    if (displayCurrency === Currency.INR) {
      if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)}Cr`;
      if (v >= 1e5) return `₹${(v / 1e5).toFixed(2)}L`;
      return `₹${Math.round(v).toLocaleString("en-IN")}`;
    }
    if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
    if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
    return `$${v.toFixed(2)}`;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>

      {/* ── Page header ── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground" style={{ marginBottom: "4px" }}>Finance OS</p>
        <h1 className="font-semibold tracking-tight text-foreground" style={{ fontSize: "28px", lineHeight: "1.2" }}>
          Assets
        </h1>
        <p className="text-muted-foreground" style={{ fontSize: "15px", lineHeight: "1.6", marginTop: "6px" }}>
          Track property, vehicles, gold, cash deposits, and other physical or financial assets.
        </p>
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={Wallet}     label="Total Value"  value={fmtCompact(totalValue)} sub="current market value" />
        <StatCard icon={BarChart3}  label="Cost Basis"   value={fmtCompact(totalCost)}  sub="total purchase price" />
        <StatCard
          icon={TrendingUp}
          label="Appreciation"
          value={`${totalAppreciation >= 0 ? "+" : ""}${fmtCompact(Math.abs(totalAppreciation))}`}
          sub={`${totalAppreciationPct >= 0 ? "+" : ""}${totalAppreciationPct.toFixed(1)}% overall`}
          valueClass={totalAppreciation >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}
        />
        <StatCard icon={Package}    label="Asset Count"  value={String(assets.length)} sub="tracked assets" />
      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2">
          <AssetAreaChart assets={assets} />
        </div>
        <div>
          <AssetDonutChart assets={assets} />
        </div>
      </div>

      {/* ── Filter bar (matches HoldingsFilterBar pattern) ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* Type tabs */}
        <div className="overflow-x-auto pb-0.5 max-w-full">
          <div className="flex gap-0.5 bg-muted/60 rounded-lg p-0.5 min-w-max h-8 items-center">
            {ALL_TYPES.map((t) => {
              const isActive = typeFilter === t;
              const label = t === "ALL" ? "All" : ASSET_TYPE_LABELS[t as AssetType];
              return (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`h-7 px-3 text-xs rounded-sm whitespace-nowrap transition-colors font-medium ${
                    isActive
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Search + Add */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-52">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search assets…"
              className="pl-8 h-8 text-sm w-full rounded-md border border-input bg-background px-3 py-1 text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <Button size="sm" className="h-8 gap-1.5 text-xs shrink-0" onClick={() => router.push("/assets/add")}>
            <Plus className="h-3.5 w-3.5" />
            Add Asset
          </Button>
        </div>
      </div>

      {/* ── Table ── */}
      <AssetsTable
        assets={filtered}
        onAssetDeleted={handleAssetDeleted}
        onAssetUpdated={handleAssetUpdated}
        fmtDisplay={fmtDisplay}
      />
    </div>
  );
}
