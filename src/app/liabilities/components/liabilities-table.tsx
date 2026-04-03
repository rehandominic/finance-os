"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, Plus, Trash2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LiabilityWithPayments, SerializedPaymentEntry } from "@/lib/types";
import { LIABILITY_TYPE_LABELS, LIABILITY_TYPE_COLORS } from "@/lib/types";
import { Currency } from "@/lib/enums";
import { deleteLiability, deletePaymentEntry } from "@/app/liabilities/actions";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function hasBalanceIncreased(lib: LiabilityWithPayments): boolean {
  if (lib.type !== "CREDIT_CARD") return false;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const old = lib.payments
    .filter((p) => p.date.slice(0, 10) <= cutoffStr)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  if (!old) return false;
  return lib.outstandingBalance > old.balanceAfter;
}

// ─── Payment entry row in expanded panel ─────────────────────────────────────

function PaymentRow({
  payment,
  onDelete,
  deleting,
  fmtDisplay,
  currency,
}: {
  payment: SerializedPaymentEntry;
  onDelete: (id: string) => void;
  deleting: boolean;
  fmtDisplay: (v: number, c: Currency) => string;
  currency: Currency;
}) {
  const isInitial = payment.amount === 0;
  const isCharge = payment.amount < 0;

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "7px 10px",
      borderRadius: "6px",
      backgroundColor: "hsl(var(--card))",
      border: "1px solid hsl(var(--border))",
    }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {isInitial ? (
            <span className="font-mono text-xs text-muted-foreground">Opening balance</span>
          ) : isCharge ? (
            <span className="font-mono text-xs font-medium text-rose-600 dark:text-rose-400">
              +{fmtDisplay(Math.abs(payment.amount), currency)} added
            </span>
          ) : (
            <span className="font-mono text-xs font-medium text-emerald-600 dark:text-emerald-400">
              −{fmtDisplay(payment.amount, currency)} paid
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "2px" }}>
          <span className="text-xs text-muted-foreground">{fmtDate(payment.date)}</span>
          {payment.notes && (
            <span className="text-xs text-muted-foreground" style={{ opacity: 0.7 }}>· {payment.notes}</span>
          )}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span className="font-mono text-xs font-medium text-foreground">
          {fmtDisplay(payment.balanceAfter, currency)}
        </span>
        {!isInitial && (
          <button
            onClick={() => onDelete(payment.id)}
            disabled={deleting}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "2px",
              opacity: deleting ? 0.4 : 1,
            }}
          >
            <Trash2 className="h-3 w-3 text-muted-foreground" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Expanded row ─────────────────────────────────────────────────────────────

function ExpandedRow({
  liability,
  onLiabilityDeleted,
  onLiabilityUpdated,
  fmtDisplay,
}: {
  liability: LiabilityWithPayments;
  onLiabilityDeleted: (id: string) => void;
  onLiabilityUpdated: (l: LiabilityWithPayments) => void;
  fmtDisplay: (v: number, c: Currency) => string;
}) {
  const router = useRouter();
  const [deletingPayId, setDeletingPayId] = useState<string | null>(null);
  const [deletingLiability, setDeletingLiability] = useState(false);

  const currency = liability.currency as Currency;

  // Chart data: balanceAfter over time
  const chartData = liability.payments
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((p) => ({
      label: new Date(p.date + "T12:00:00").toLocaleDateString("en-IN", { month: "short", year: "2-digit" }),
      value: p.balanceAfter,
    }));

  async function handleDeletePayment(id: string) {
    if (!confirm("Remove this payment entry?")) return;
    setDeletingPayId(id);
    await deletePaymentEntry(id, liability.id);
    setDeletingPayId(null);
    const updated: LiabilityWithPayments = {
      ...liability,
      payments: liability.payments.filter((p) => p.id !== id),
    };
    const latest = updated.payments.sort((a, b) => b.date.localeCompare(a.date))[0];
    if (latest) {
      updated.outstandingBalance = latest.balanceAfter;
      updated.totalPaid = Math.max(0, updated.originalAmount - updated.outstandingBalance);
      updated.paidPercent = updated.originalAmount > 0 ? (updated.totalPaid / updated.originalAmount) * 100 : 0;
    }
    onLiabilityUpdated(updated);
  }

  async function handleDeleteLiability() {
    if (!confirm(`Delete "${liability.name}" and all its payment history? This cannot be undone.`)) return;
    setDeletingLiability(true);
    await deleteLiability(liability.id);
    onLiabilityDeleted(liability.id);
  }

  // Compute months remaining and projected payoff
  const monthsRemaining = liability.monthlyEMI && liability.monthlyEMI > 0
    ? Math.ceil(liability.outstandingBalance / liability.monthlyEMI)
    : null;
  const projectedPayoff = monthsRemaining !== null
    ? (() => {
        const d = new Date();
        d.setMonth(d.getMonth() + monthsRemaining);
        return d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
      })()
    : liability.endDate
    ? new Date(liability.endDate).toLocaleDateString("en-IN", { month: "short", year: "numeric" })
    : null;

  return (
    <tr>
      <td colSpan={8} style={{ padding: 0, borderBottom: "1px solid hsl(var(--border))" }}>
        <div style={{
          backgroundColor: "hsl(var(--muted)/0.3)",
          padding: "20px 24px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "20px",
        }}>

          {/* Left: Payment history */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground" style={{ marginBottom: "12px" }}>
              Payment History
            </p>

            {chartData.length >= 2 && (
              <div style={{ marginBottom: "16px" }}>
                <ResponsiveContainer width="100%" height={90}>
                  <AreaChart data={chartData} margin={{ top: 2, right: 4, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id={`debt-grad-${liability.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.18} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis hide />
                    <Tooltip
                      content={({ active, payload }) =>
                        active && payload?.length ? (
                          <div className="rounded border bg-popover text-xs shadow" style={{ padding: "6px 10px" }}>
                            <p className="font-mono font-medium text-rose-600 dark:text-rose-400">
                              {fmtDisplay(payload[0].value as number, currency)}
                            </p>
                          </div>
                        ) : null
                      }
                    />
                    <Area
                      type="step"
                      dataKey="value"
                      stroke="#ef4444"
                      strokeWidth={1.5}
                      fill={`url(#debt-grad-${liability.id})`}
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {liability.payments.slice(0, 8).map((p) => (
                <PaymentRow
                  key={p.id}
                  payment={p}
                  onDelete={handleDeletePayment}
                  deleting={deletingPayId === p.id}
                  fmtDisplay={fmtDisplay}
                  currency={currency}
                />
              ))}
              {liability.payments.length > 8 && (
                <p className="text-xs text-muted-foreground" style={{ paddingLeft: "4px" }}>
                  +{liability.payments.length - 8} more entries
                </p>
              )}
            </div>

            <div style={{ marginTop: "12px" }}>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => router.push(`/liabilities/${liability.id}/log-payment`)}
              >
                <Plus className="h-3.5 w-3.5" />
                Log Payment
              </Button>
            </div>
          </div>

          {/* Right: Liability details */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground" style={{ marginBottom: "12px" }}>
              Liability Details
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <DetailRow label="Lender" value={liability.lender} />
              <DetailRow label="Start Date" value={fmtDate(liability.startDate)} />
              <DetailRow label="Original Amount" value={fmtDisplay(liability.originalAmount, currency)} />
              <DetailRow
                label="Outstanding"
                value={fmtDisplay(liability.outstandingBalance, currency)}
                valueClass={liability.outstandingBalance > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}
              />
              <DetailRow
                label="Total Paid"
                value={fmtDisplay(liability.totalPaid, currency)}
                valueClass="text-emerald-600 dark:text-emerald-400"
              />
              <DetailRow label="Paid Off" value={`${liability.paidPercent.toFixed(1)}%`} />
              {liability.monthlyEMI != null && (
                <DetailRow label="Monthly EMI" value={fmtDisplay(liability.monthlyEMI, currency)} />
              )}
              {liability.interestRate != null && (
                <DetailRow label="Interest Rate" value={`${liability.interestRate}% p.a.`} />
              )}
              {liability.endDate && (
                <DetailRow label="Expected End" value={fmtDate(liability.endDate)} />
              )}
              {monthsRemaining !== null && (
                <DetailRow label="Months Remaining" value={String(monthsRemaining)} />
              )}
              {projectedPayoff && (
                <DetailRow label="Projected Payoff" value={projectedPayoff} />
              )}
              {liability.currency !== "INR" && (
                <DetailRow label="Currency" value={liability.currency} />
              )}
              {liability.notes && <DetailRow label="Notes" value={liability.notes} />}
            </div>

            {/* Actions */}
            <div style={{ marginTop: "16px", display: "flex", gap: "8px" }}>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-destructive hover:text-destructive border-destructive/30 hover:border-destructive/60 hover:bg-destructive/5"
                onClick={handleDeleteLiability}
                disabled={deletingLiability}
              >
                <Trash2 className="h-3.5 w-3.5" />
                {deletingLiability ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}

function DetailRow({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-xs font-medium text-foreground font-mono ${valueClass ?? ""}`} style={{ textAlign: "right", maxWidth: "200px" }}>
        {value}
      </span>
    </div>
  );
}

// ─── Main table ───────────────────────────────────────────────────────────────

interface Props {
  liabilities: LiabilityWithPayments[];
  onLiabilityDeleted: (id: string) => void;
  onLiabilityUpdated: (l: LiabilityWithPayments) => void;
  fmtDisplay: (v: number, fromCurrency: Currency) => string;
}

const TH_STYLE: React.CSSProperties = {
  padding: "10px 14px",
  fontSize: "10px",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: "hsl(var(--muted-foreground))",
  textAlign: "left",
  borderBottom: "1px solid hsl(var(--border))",
  whiteSpace: "nowrap",
  backgroundColor: "hsl(var(--card))",
};

const TD_STYLE: React.CSSProperties = {
  padding: "12px 14px",
  fontSize: "13px",
  borderBottom: "1px solid hsl(var(--border))",
  verticalAlign: "middle",
};

export function LiabilitiesTable({ liabilities, onLiabilityDeleted, onLiabilityUpdated, fmtDisplay }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function toggle(id: string) {
    setExpandedId((cur) => (cur === id ? null : id));
  }

  if (liabilities.length === 0) {
    return (
      <div style={{ padding: "48px", textAlign: "center" }}>
        <p className="text-sm text-muted-foreground">No liabilities found. Add your first liability to start tracking debt.</p>
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto", borderRadius: "0.75rem", border: "1px solid hsl(var(--border))" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
        <thead>
          <tr>
            <th style={{ ...TH_STYLE, width: "32px" }} />
            <th style={{ ...TH_STYLE }}>Name</th>
            <th style={{ ...TH_STYLE }}>Type</th>
            <th style={{ ...TH_STYLE, textAlign: "right" }}>Original</th>
            <th style={{ ...TH_STYLE, textAlign: "right" }}>Outstanding</th>
            <th style={{ ...TH_STYLE, textAlign: "right" }}>Monthly EMI</th>
            <th style={{ ...TH_STYLE, minWidth: "140px" }}>Progress</th>
          </tr>
        </thead>
        <tbody>
          {liabilities.map((lib) => {
            const isExpanded = expandedId === lib.id;
            const isPaidOff = lib.outstandingBalance === 0;
            const isIncreased = hasBalanceIncreased(lib);
            const currency = lib.currency as Currency;
            const emiDisplay = lib.monthlyEMI
              ? fmtDisplay(lib.monthlyEMI, currency)
              : lib.type === "CREDIT_CARD"
              ? "Varies"
              : "—";

            return (
              <React.Fragment key={lib.id}>
                <tr
                  style={{
                    cursor: "pointer",
                    backgroundColor: isExpanded ? "hsl(var(--muted)/0.3)" : undefined,
                    opacity: isPaidOff ? 0.65 : 1,
                  }}
                  onClick={() => toggle(lib.id)}
                >
                  {/* Expand chevron */}
                  <td style={{ ...TD_STYLE, width: "32px", paddingRight: "4px" }}>
                    {isExpanded ? (
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </td>

                  {/* Name + Lender */}
                  <td style={TD_STYLE}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span
                        className="font-medium text-foreground"
                        style={{ display: "block", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                        title={lib.name}
                      >
                        {lib.name}
                      </span>
                      {isPaidOff && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {lib.lender}
                    </span>
                  </td>

                  {/* Type + warning */}
                  <td style={TD_STYLE}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${LIABILITY_TYPE_COLORS[lib.type]}`}>
                        {LIABILITY_TYPE_LABELS[lib.type]}
                      </span>
                      {isIncreased && (
                        <span title="Balance increased in last 30 days">
                          <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Original Amount */}
                  <td style={{ ...TD_STYLE, textAlign: "right", fontFamily: "var(--font-geist-mono), monospace" }}>
                    {fmtDisplay(lib.originalAmount, currency)}
                  </td>

                  {/* Outstanding */}
                  <td style={{ ...TD_STYLE, textAlign: "right", fontFamily: "var(--font-geist-mono), monospace", fontWeight: 600 }}>
                    {isPaidOff ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-mono text-xs font-medium">Paid Off</span>
                    ) : (
                      <span style={{ color: "hsl(0,70%,55%)" }}>
                        {fmtDisplay(lib.outstandingBalance, currency)}
                      </span>
                    )}
                  </td>

                  {/* Monthly EMI */}
                  <td style={{ ...TD_STYLE, textAlign: "right", fontFamily: "var(--font-geist-mono), monospace", color: "hsl(var(--muted-foreground))", fontSize: "12px" }}>
                    {emiDisplay}
                  </td>

                  {/* Progress bar */}
                  <td style={{ ...TD_STYLE, minWidth: "140px" }}>
                    {isPaidOff ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <div style={{ flex: 1, height: "6px", backgroundColor: "hsl(var(--muted))", borderRadius: "3px", overflow: "hidden" }}>
                          <div style={{ width: "100%", height: "100%", backgroundColor: "#10b981", borderRadius: "3px" }} />
                        </div>
                        <span className="font-mono text-xs text-emerald-600 dark:text-emerald-400">100%</span>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <div style={{ height: "6px", backgroundColor: "hsl(var(--muted))", borderRadius: "3px", overflow: "hidden" }}>
                          <div style={{
                            width: `${Math.min(100, Math.max(0, lib.paidPercent))}%`,
                            height: "100%",
                            backgroundColor: "#10b981",
                            borderRadius: "3px",
                          }} />
                        </div>
                        <span className="font-mono text-xs text-muted-foreground">
                          {lib.paidPercent.toFixed(0)}% paid
                        </span>
                      </div>
                    )}
                  </td>
                </tr>

                {isExpanded && (
                  <ExpandedRow
                    liability={lib}
                    onLiabilityDeleted={onLiabilityDeleted}
                    onLiabilityUpdated={onLiabilityUpdated}
                    fmtDisplay={fmtDisplay}
                  />
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
