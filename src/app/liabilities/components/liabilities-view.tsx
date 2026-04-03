"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, TrendingDown, TrendingUp, Wallet, CalendarCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LiabilityWithPayments } from "@/lib/types";
import { LIABILITY_TYPE_LABELS } from "@/lib/types";
import { LiabilityType, Currency } from "@/lib/enums";
import { useCurrency } from "@/app/investments/components/investments-shell";
import { LiabilityPaydownChart, LiabilityDonutChart } from "./liabilities-charts";
import { LiabilitiesTable } from "./liabilities-table";

// ─── Stat card ────────────────────────────────────────────────────────────────

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

// ─── Debt-free date computation ───────────────────────────────────────────────

function calcDebtFreeDate(active: LiabilityWithPayments[]): string {
  if (active.length === 0) return "Debt Free!";

  // If all active liabilities have an endDate, use the latest one
  const withEnd = active.filter((l) => l.endDate);
  if (withEnd.length === active.length) {
    const latest = Math.max(...withEnd.map((l) => new Date(l.endDate!).getTime()));
    return new Date(latest).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
  }

  // Otherwise compute from total outstanding ÷ total monthly EMI
  const totalEMI = active.reduce((s, l) => s + (l.monthlyEMI ?? 0), 0);
  if (totalEMI <= 0) return "No fixed EMIs";
  const totalOutstanding = active.reduce((s, l) => s + l.outstandingBalance, 0);
  const monthsLeft = Math.ceil(totalOutstanding / totalEMI);
  const date = new Date();
  date.setMonth(date.getMonth() + monthsLeft);
  return date.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_TYPES: (LiabilityType | "ALL")[] = ["ALL", ...Object.values(LiabilityType)];

// ─── View ─────────────────────────────────────────────────────────────────────

interface Props {
  initialLiabilities: LiabilityWithPayments[];
}

export function LiabilitiesView({ initialLiabilities }: Props) {
  const router = useRouter();
  const { toDisplay, fmt, displayCurrency } = useCurrency();

  const [liabilities, setLiabilities] = useState<LiabilityWithPayments[]>(initialLiabilities);
  const [typeFilter, setTypeFilter] = useState<LiabilityType | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [showPaidOff, setShowPaidOff] = useState(false);

  // ── Computed summary ─────────────────────────────────────────────────────────
  const activeLiabilities = liabilities.filter((l) => l.outstandingBalance > 0);

  const totalOutstanding = activeLiabilities.reduce(
    (s, l) => s + toDisplay(l.outstandingBalance, l.currency as Currency), 0
  );
  const totalMonthlyEMI = activeLiabilities.reduce(
    (s, l) => s + (l.monthlyEMI ? toDisplay(l.monthlyEMI, l.currency as Currency) : 0), 0
  );
  const totalPaid = liabilities.reduce(
    (s, l) => s + toDisplay(l.totalPaid, l.currency as Currency), 0
  );
  const debtFreeDate = calcDebtFreeDate(activeLiabilities);

  // ── Filter ───────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return liabilities.filter((l) => {
      if (!showPaidOff && l.outstandingBalance === 0) return false;
      const matchType = typeFilter === "ALL" || l.type === typeFilter;
      const matchSearch =
        !search ||
        l.name.toLowerCase().includes(search.toLowerCase()) ||
        l.lender.toLowerCase().includes(search.toLowerCase());
      return matchType && matchSearch;
    });
  }, [liabilities, typeFilter, search, showPaidOff]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  function handleLiabilityDeleted(id: string) {
    setLiabilities((prev) => prev.filter((l) => l.id !== id));
  }
  function handleLiabilityUpdated(updated: LiabilityWithPayments) {
    setLiabilities((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
  }

  // ── Formatters ───────────────────────────────────────────────────────────────
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

  function fmtDisplay(v: number, fromCurrency: Currency): string {
    return fmt(v, fromCurrency);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>

      {/* ── Page header ── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground" style={{ marginBottom: "4px" }}>Finance OS</p>
        <h1 className="font-semibold tracking-tight text-foreground" style={{ fontSize: "28px", lineHeight: "1.2" }}>
          Liabilities
        </h1>
        <p className="text-muted-foreground" style={{ fontSize: "15px", lineHeight: "1.6", marginTop: "6px" }}>
          Track your loans, credit cards, and other debts. Every payment gets you closer to debt-free.
        </p>
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          icon={TrendingDown}
          label="Total Outstanding"
          value={fmtCompact(totalOutstanding)}
          sub="remaining debt"
          valueClass="text-rose-600 dark:text-rose-400"
        />
        <StatCard
          icon={Wallet}
          label="Monthly EMI"
          value={totalMonthlyEMI > 0 ? fmtCompact(totalMonthlyEMI) : "—"}
          sub="fixed monthly payments"
        />
        <StatCard
          icon={TrendingUp}
          label="Total Paid"
          value={fmtCompact(totalPaid)}
          sub="principal repaid"
          valueClass={totalPaid > 0 ? "text-emerald-600 dark:text-emerald-400" : undefined}
        />
        <StatCard
          icon={CalendarCheck}
          label="Debt-Free"
          value={debtFreeDate}
          sub={activeLiabilities.length > 0 ? "projected payoff" : "all clear!"}
          valueClass={activeLiabilities.length === 0 ? "text-emerald-600 dark:text-emerald-400" : undefined}
        />
      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2">
          <LiabilityPaydownChart liabilities={liabilities} />
        </div>
        <div>
          <LiabilityDonutChart
            liabilities={liabilities}
            activeType={typeFilter}
            onTypeSelect={(t) => setTypeFilter(t)}
          />
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* Type tabs */}
        <div className="overflow-x-auto pb-0.5 max-w-full">
          <div className="flex gap-0.5 bg-muted/60 rounded-lg p-0.5 min-w-max h-8 items-center">
            {ALL_TYPES.map((t) => {
              const isActive = typeFilter === t;
              const label = t === "ALL" ? "All" : LIABILITY_TYPE_LABELS[t as LiabilityType];
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

        {/* Right: Show Paid Off + Search + Add */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowPaidOff((s) => !s)}
            className={`h-8 px-3 text-xs rounded-md border whitespace-nowrap transition-colors ${
              showPaidOff
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                : "border-input text-muted-foreground hover:text-foreground hover:bg-muted/60"
            }`}
          >
            Paid Off
          </button>

          <div className="relative flex-1 sm:w-52">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search liabilities…"
              className="pl-8 h-8 text-sm w-full rounded-md border border-input bg-background px-3 py-1 text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <Button size="sm" className="h-8 gap-1.5 text-xs shrink-0" onClick={() => router.push("/liabilities/add")}>
            <Plus className="h-3.5 w-3.5" />
            Add Liability
          </Button>
        </div>
      </div>

      {/* ── Table ── */}
      <LiabilitiesTable
        liabilities={filtered}
        onLiabilityDeleted={handleLiabilityDeleted}
        onLiabilityUpdated={handleLiabilityUpdated}
        fmtDisplay={fmtDisplay}
      />
    </div>
  );
}
