"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Wallet, TrendingUp, PiggyBank, ArrowDownUp, Sparkles, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { SerializedIncomeSource, SerializedBudgetBucket } from "@/lib/types";
import { BUCKET_TYPE_LABELS, BUCKET_TYPE_BADGE_COLORS, BUCKET_TYPE_CHART_COLORS } from "@/lib/types";
import { BucketType, Currency } from "@/lib/enums";
import { useCurrency } from "@/app/investments/components/investments-shell";
import { deleteIncomeSource, deleteBudgetBucket, importEMIsFromLiabilities } from "@/app/cashflow/actions";
import { CashflowBar } from "./cashflow-bar";

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

// ─── Section definitions ──────────────────────────────────────────────────────

const BUCKET_SECTIONS: {
  type: BucketType;
  label: string;
  icon: React.ElementType;
  description: string;
}[] = [
  { type: BucketType.EMI,               label: "EMIs",                icon: ArrowDownUp,  description: "Loan repayments and credit card minimum payments" },
  { type: BucketType.SAVINGS,           label: "Savings",             icon: PiggyBank,    description: "Emergency fund, fixed deposits, short-term goals" },
  { type: BucketType.INVESTING,         label: "Investing",           icon: TrendingUp,   description: "SIPs, stocks, ETFs, and long-term wealth building" },
  { type: BucketType.RECURRING_EXPENSE, label: "Recurring Expenses",  icon: Wallet,       description: "Rent, utilities, subscriptions, insurance" },
  { type: BucketType.ESSENTIAL,         label: "Essential Expenses",  icon: Sparkles,     description: "Groceries, fuel, medicines, and other necessities" },
  { type: BucketType.DISCRETIONARY,     label: "Discretionary",       icon: Sparkles,     description: "Dining out, entertainment, travel, shopping" },
  { type: BucketType.OTHER,             label: "Other",               icon: Wallet,       description: "Miscellaneous allocations" },
];

// ─── Budget section card ──────────────────────────────────────────────────────

function BucketSection({
  type,
  label,
  icon: Icon,
  description,
  buckets,
  onDelete,
  fmtCompact,
  router,
}: {
  type: BucketType;
  label: string;
  icon: React.ElementType;
  description: string;
  buckets: SerializedBudgetBucket[];
  onDelete: (id: string) => Promise<void>;
  fmtCompact: (v: number, fromCurrency: Currency) => string;
  router: ReturnType<typeof useRouter>;
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const sectionBuckets = buckets.filter((b) => b.type === type);
  const subtotal = sectionBuckets.reduce((s, b) => s + b.amount, 0);
  const dotColor = BUCKET_TYPE_CHART_COLORS[type];

  return (
    <div className="rounded-xl border bg-card" style={{ padding: "20px 24px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: dotColor, flexShrink: 0, marginTop: "2px" }} />
          <div>
            <p className="text-sm font-semibold text-foreground">{label}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
          {subtotal > 0 && (
            <span className="font-mono text-sm font-semibold text-foreground">
              {fmtCompact(subtotal, Currency.INR)}
            </span>
          )}
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1 text-xs"
            onClick={() => router.push(`/cashflow/bucket/add?type=${type}`)}
          >
            <Plus className="h-3 w-3" />
            Add
          </Button>
        </div>
      </div>

      {sectionBuckets.length === 0 ? (
        <p className="text-xs text-muted-foreground" style={{ paddingTop: "4px" }}>
          No {label.toLowerCase()} added yet
        </p>
      ) : (
        <div style={{ borderTop: "1px solid rgba(100,116,139,0.2)", marginTop: "4px" }}>
          {sectionBuckets.map((b, i) => (
            <div
              key={b.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 4px",
                borderBottom: i < sectionBuckets.length - 1 ? "1px solid rgba(100,116,139,0.2)" : "none",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                <span style={{ width: "4px", height: "4px", borderRadius: "50%", backgroundColor: "rgba(100,116,139,0.35)", flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <span className="text-sm font-medium text-foreground" style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {b.name}
                  </span>
                  {b.notes && (
                    <span className="text-xs text-muted-foreground" style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: "1px" }}>
                      {b.notes}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
                <span className="font-mono text-sm font-semibold text-foreground">
                  {fmtCompact(b.amount, b.currency as Currency)}
                </span>
                <div style={{ display: "flex", gap: "2px" }}>
                  <button
                    onClick={() => router.push(`/cashflow/bucket/${b.id}/edit`)}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", opacity: 0.5 }}
                    className="hover:opacity-100 transition-opacity"
                  >
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                  <button
                    onClick={async () => {
                      if (!confirm(`Remove "${b.name}"?`)) return;
                      setDeletingId(b.id);
                      await onDelete(b.id);
                      setDeletingId(null);
                    }}
                    disabled={deletingId === b.id}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", opacity: deletingId === b.id ? 0.3 : 0.5 }}
                    className="hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Income section card ──────────────────────────────────────────────────────

function IncomeSection({
  incomeSources,
  onDelete,
  fmtCompact,
  router,
}: {
  incomeSources: SerializedIncomeSource[];
  onDelete: (id: string) => Promise<void>;
  fmtCompact: (v: number, fromCurrency: Currency) => string;
  router: ReturnType<typeof useRouter>;
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const subtotal = incomeSources.reduce((s, src) => s + src.amount, 0);

  return (
    <div className="rounded-xl border bg-card" style={{ padding: "20px 24px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#22c55e", flexShrink: 0, marginTop: "2px" }} />
          <div>
            <p className="text-sm font-semibold text-foreground">Income Sources</p>
            <p className="text-xs text-muted-foreground">Salary, freelance, rental income, and other recurring inflows</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
          {subtotal > 0 && (
            <span className="font-mono text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              {fmtCompact(subtotal, Currency.INR)}
            </span>
          )}
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1 text-xs"
            onClick={() => router.push("/cashflow/income/add")}
          >
            <Plus className="h-3 w-3" />
            Add
          </Button>
        </div>
      </div>

      {incomeSources.length === 0 ? (
        <p className="text-xs text-muted-foreground" style={{ paddingTop: "4px" }}>
          Add your first income source to start planning
        </p>
      ) : (
        <div style={{ borderTop: "1px solid rgba(100,116,139,0.2)", marginTop: "4px" }}>
          {incomeSources.map((src, i) => (
            <div
              key={src.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 4px",
                borderBottom: i < incomeSources.length - 1 ? "1px solid rgba(100,116,139,0.2)" : "none",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                <span style={{ width: "4px", height: "4px", borderRadius: "50%", backgroundColor: "rgba(100,116,139,0.35)", flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <span className="text-sm font-medium text-foreground" style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {src.name}
                  </span>
                  {src.notes && (
                    <span className="text-xs text-muted-foreground" style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: "1px" }}>
                      {src.notes}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
                <span className="font-mono text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  +{fmtCompact(src.amount, src.currency as Currency)}
                </span>
                <div style={{ display: "flex", gap: "2px" }}>
                  <button
                    onClick={() => router.push(`/cashflow/income/${src.id}/edit`)}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", opacity: 0.5 }}
                    className="hover:opacity-100 transition-opacity"
                  >
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                  <button
                    onClick={async () => {
                      if (!confirm(`Remove "${src.name}"?`)) return;
                      setDeletingId(src.id);
                      await onDelete(src.id);
                      setDeletingId(null);
                    }}
                    disabled={deletingId === src.id}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", opacity: deletingId === src.id ? 0.3 : 0.5 }}
                    className="hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

interface Props {
  initialIncomeSources: SerializedIncomeSource[];
  initialBudgetBuckets: SerializedBudgetBucket[];
}

export function CashflowView({ initialIncomeSources, initialBudgetBuckets }: Props) {
  const router = useRouter();
  const { toDisplay, displayCurrency } = useCurrency();
  const [isPending, startTransition] = useTransition();

  const [incomeSources, setIncomeSources] = useState<SerializedIncomeSource[]>(initialIncomeSources);
  const [buckets, setBuckets] = useState<SerializedBudgetBucket[]>(initialBudgetBuckets);

  // ── Computed stats ────────────────────────────────────────────────────────────
  const totalIncome = incomeSources.reduce(
    (s, src) => s + toDisplay(src.amount, src.currency as Currency), 0
  );
  const totalAllocated = buckets.reduce(
    (s, b) => s + toDisplay(b.amount, b.currency as Currency), 0
  );
  const unallocated = totalIncome - totalAllocated;
  const savingsAndInvesting = buckets
    .filter((b) => b.type === BucketType.SAVINGS || b.type === BucketType.INVESTING)
    .reduce((s, b) => s + toDisplay(b.amount, b.currency as Currency), 0);
  const savingsRate = totalIncome > 0 ? (savingsAndInvesting / totalIncome) * 100 : 0;
  const totalEMIs = buckets
    .filter((b) => b.type === BucketType.EMI)
    .reduce((s, b) => s + toDisplay(b.amount, b.currency as Currency), 0);

  // ── Formatters ────────────────────────────────────────────────────────────────
  function fmtCompact(v: number, fromCurrency: Currency = Currency.INR): string {
    const converted = toDisplay(v, fromCurrency);
    if (displayCurrency === Currency.INR) {
      if (converted >= 1e7) return `₹${(converted / 1e7).toFixed(2)}Cr`;
      if (converted >= 1e5) return `₹${(converted / 1e5).toFixed(2)}L`;
      return `₹${Math.round(converted).toLocaleString("en-IN")}`;
    }
    if (converted >= 1e6) return `$${(converted / 1e6).toFixed(2)}M`;
    if (converted >= 1e3) return `$${(converted / 1e3).toFixed(1)}K`;
    return `$${converted.toFixed(2)}`;
  }

  function fmtCompactDisplay(v: number): string {
    if (displayCurrency === Currency.INR) {
      if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)}Cr`;
      if (v >= 1e5) return `₹${(v / 1e5).toFixed(2)}L`;
      return `₹${Math.round(v).toLocaleString("en-IN")}`;
    }
    if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
    if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
    return `$${v.toFixed(2)}`;
  }

  // ── Handlers ──────────────────────────────────────────────────────────────────
  async function handleDeleteIncome(id: string) {
    await deleteIncomeSource(id);
    setIncomeSources((prev) => prev.filter((s) => s.id !== id));
  }

  async function handleDeleteBucket(id: string) {
    await deleteBudgetBucket(id);
    setBuckets((prev) => prev.filter((b) => b.id !== id));
  }

  function handleImportEMIs() {
    startTransition(async () => {
      const result = await importEMIsFromLiabilities();
      if (result.count === 0) {
        toast.info("No new EMIs to import — all active liabilities are already in your plan.");
      } else {
        toast.success(`Imported ${result.count} EMI bucket${result.count !== 1 ? "s" : ""} from Liabilities`);
        router.refresh();
      }
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>

      {/* ── Page header ── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground" style={{ marginBottom: "4px" }}>Finance OS</p>
        <h1 className="font-semibold tracking-tight text-foreground" style={{ fontSize: "28px", lineHeight: "1.2" }}>
          Cash Flow
        </h1>
        <p className="text-muted-foreground" style={{ fontSize: "15px", lineHeight: "1.6", marginTop: "6px" }}>
          Plan where every rupee goes each month. Set your income, then allocate to every bucket until nothing is unaccounted for.
        </p>
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <StatCard
          icon={TrendingUp}
          label="Monthly Income"
          value={fmtCompactDisplay(totalIncome)}
          sub="total inflows"
          valueClass="text-emerald-600 dark:text-emerald-400"
        />
        <StatCard
          icon={Wallet}
          label="Allocated"
          value={fmtCompactDisplay(totalAllocated)}
          sub={totalIncome > 0 ? `${((totalAllocated / totalIncome) * 100).toFixed(0)}% of income` : "of income"}
        />
        <StatCard
          icon={PiggyBank}
          label="Free / Unallocated"
          value={fmtCompactDisplay(Math.abs(unallocated))}
          sub={unallocated >= 0 ? "available to allocate" : "over budget!"}
          valueClass={unallocated >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}
        />
        <StatCard
          icon={Sparkles}
          label="Savings Rate"
          value={`${savingsRate.toFixed(1)}%`}
          sub="savings + investing"
          valueClass={savingsRate >= 20 ? "text-emerald-600 dark:text-emerald-400" : undefined}
        />
        <StatCard
          icon={ArrowDownUp}
          label="Monthly EMIs"
          value={totalEMIs > 0 ? fmtCompactDisplay(totalEMIs) : "—"}
          sub="loan repayments"
        />
      </div>

      {/* ── Allocation bar ── */}
      <CashflowBar
        incomeSources={incomeSources}
        buckets={buckets}
        toDisplay={toDisplay}
        fmtCompact={fmtCompactDisplay}
      />

      {/* ── Income section ── */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground" style={{ whiteSpace: "nowrap" }}>Income</span>
          <div className="border-t border-border" style={{ flex: 1 }} />
        </div>
        <IncomeSection
          incomeSources={incomeSources}
          onDelete={handleDeleteIncome}
          fmtCompact={fmtCompact}
          router={router}
        />
      </div>

      {/* ── Allocation section divider ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground" style={{ whiteSpace: "nowrap" }}>Allocation</span>
        <div className="border-t border-border" style={{ flex: 1 }} />
      </div>

      {/* EMI section with Import button */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <BucketSection
          type={BucketType.EMI}
          label="EMIs"
          icon={ArrowDownUp}
          description="Loan repayments and credit card minimum payments"
          buckets={buckets}
          onDelete={handleDeleteBucket}
          fmtCompact={fmtCompact}
          router={router}
        />
        <div>
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={handleImportEMIs}
            disabled={isPending}
          >
            <Download className="h-3 w-3" />
            {isPending ? "Importing…" : "Import from Liabilities"}
          </Button>
        </div>
      </div>

      {/* Remaining bucket sections */}
      {BUCKET_SECTIONS.filter((s) => s.type !== BucketType.EMI).map((section) => (
        <BucketSection
          key={section.type}
          type={section.type}
          label={section.label}
          icon={section.icon}
          description={section.description}
          buckets={buckets}
          onDelete={handleDeleteBucket}
          fmtCompact={fmtCompact}
          router={router}
        />
      ))}
    </div>
  );
}
