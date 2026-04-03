"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getLiability, createPaymentEntry } from "@/app/liabilities/actions";
import type { LiabilityWithPayments } from "@/lib/types";

// ─── Shared design components ─────────────────────────────────────────────────

function Label({ children, optional }: { children: React.ReactNode; optional?: boolean }) {
  return (
    <span className="text-sm font-medium text-foreground">
      {children}
      {optional && <span className="text-xs text-muted-foreground font-normal ml-1">(optional)</span>}
    </span>
  );
}

function Field({
  label,
  optional,
  error,
  hint,
  children,
}: {
  label: string;
  optional?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label optional={optional}>{label}</Label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card" style={{ padding: "24px" }}>
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground" style={{ marginBottom: "16px" }}>
        {title}
      </p>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function fmtCurrency(v: number, currency: string): string {
  const sym = currency === "USD" ? "$" : "₹";
  const locale = currency === "USD" ? "en-US" : "en-IN";
  if (currency === "INR") {
    if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)}Cr`;
    if (v >= 1e5) return `₹${(v / 1e5).toFixed(2)}L`;
  }
  return `${sym}${v.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type EntryType = "payment" | "charges";

export default function LogPaymentPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [isPending, startTransition] = useTransition();
  const [liability, setLiability] = useState<LiabilityWithPayments | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [entryType, setEntryType] = useState<EntryType>("payment");
  const [amount, setAmount] = useState("");
  const [balanceAfter, setBalanceAfter] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isCreditCard = liability?.type === "CREDIT_CARD";
  const sym = liability?.currency === "USD" ? "$" : "₹";

  useEffect(() => {
    getLiability(id).then((l) => {
      setLiability(l);
      setLoading(false);
    });
  }, [id]);

  // Compute balanceAfter whenever amount or entryType changes
  useEffect(() => {
    if (!liability) return;
    const parsed = parseFloat(amount) || 0;
    const computed =
      entryType === "charges"
        ? liability.outstandingBalance + parsed
        : Math.max(0, liability.outstandingBalance - parsed);
    setBalanceAfter(parsed > 0 ? computed.toFixed(2) : "");
  }, [amount, entryType, liability]);

  const parsedAmount = parseFloat(amount) || 0;
  const parsedBalance = parseFloat(balanceAfter) || 0;
  const diff = liability ? parsedBalance - liability.outstandingBalance : 0;
  const diffPct = liability && liability.outstandingBalance > 0
    ? (diff / liability.outstandingBalance) * 100
    : 0;

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!date) errs.date = "Required";
    if (!amount || parsedAmount <= 0) errs.amount = "Enter a positive amount";
    if (balanceAfter === "" || parseFloat(balanceAfter) < 0) errs.balanceAfter = "Enter the remaining balance";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit() {
    if (!validate() || !liability) return;
    startTransition(async () => {
      try {
        // For charges, store amount as negative
        const finalAmount = entryType === "charges" ? -parsedAmount : parsedAmount;
        const result = await createPaymentEntry({
          liabilityId: liability.id,
          date: new Date(date),
          amount: finalAmount,
          balanceAfter: parseFloat(balanceAfter),
          notes: notes.trim() || undefined,
        });
        if (result && "error" in result && result.error) {
          toast.error("Validation failed. Check the form.");
          return;
        }
        toast.success(entryType === "charges" ? "Charges logged" : "Payment logged");
        router.push("/liabilities");
      } catch {
        toast.error("Failed to save. Please try again.");
      }
    });
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto pb-10" style={{ paddingTop: "24px" }}>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!liability) {
    return (
      <div className="max-w-lg mx-auto pb-10" style={{ paddingTop: "24px" }}>
        <p className="text-sm text-destructive">Liability not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto pb-10" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

      {/* ── Header ── */}
      <div className="flex items-center gap-3 pt-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0 -ml-1"
          onClick={() => router.push("/liabilities")}
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Back</span>
        </Button>
        <div className="min-w-0">
          <h1 className="text-lg font-semibold leading-snug truncate">{liability.name}</h1>
          <p className="text-xs text-muted-foreground">Log payment or new charges</p>
        </div>
      </div>

      {/* ── Current snapshot ── */}
      <SectionCard title="Current Balance">
        <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
          <span className="text-sm text-muted-foreground">{liability.lender}</span>
          <span className="font-mono text-sm font-semibold text-rose-600 dark:text-rose-400">
            {fmtCurrency(liability.outstandingBalance, liability.currency)}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span>Original amount</span>
          <span className="font-mono">{fmtCurrency(liability.originalAmount, liability.currency)}</span>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span>Total paid so far</span>
          <span className="font-mono text-emerald-600 dark:text-emerald-400">
            {fmtCurrency(liability.totalPaid, liability.currency)}
          </span>
        </div>
      </SectionCard>

      {/* ── Entry type toggle (credit cards only) ── */}
      {isCreditCard && (
        <div className="flex rounded-lg border overflow-hidden" style={{ height: "40px" }}>
          <button
            onClick={() => setEntryType("payment")}
            className={`flex-1 text-sm font-medium transition-colors ${
              entryType === "payment"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            Payment
          </button>
          <button
            onClick={() => setEntryType("charges")}
            className={`flex-1 text-sm font-medium transition-colors ${
              entryType === "charges"
                ? "bg-rose-500 text-white"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            New Charges
          </button>
        </div>
      )}

      {/* ── Log entry form ── */}
      <SectionCard title={entryType === "charges" ? "New Charges" : "Payment Details"}>
        <Field
          label={`${entryType === "charges" ? "Charges Amount" : "Amount Paid"} (${sym})`}
          error={errors.amount}
        >
          <Input
            type="number"
            min="0"
            step="any"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setErrors({});
            }}
            placeholder="0.00"
            className={`h-10 font-mono ${errors.amount ? "border-destructive" : ""}`}
            autoFocus
          />
        </Field>

        {/* Computed balance preview */}
        {parsedAmount > 0 && (
          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
            <span className="text-sm text-muted-foreground">
              {entryType === "charges" ? "Balance will increase to" : "Balance will reduce to"}
            </span>
            <span className={`font-mono text-sm font-semibold ${entryType === "charges" ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
              {fmtCurrency(parseFloat(balanceAfter) || 0, liability.currency)}
            </span>
          </div>
        )}

        {/* Change indicator */}
        {parsedAmount > 0 && balanceAfter !== "" && liability && (
          <p className={`text-xs font-mono ${diff <= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
            {diff <= 0 ? "▼" : "▲"} {fmtCurrency(Math.abs(diff), liability.currency)} ({diff > 0 ? "+" : ""}{diffPct.toFixed(1)}%) vs current
          </p>
        )}

        <Field
          label={`Balance After (${sym})`}
          hint="Auto-computed — edit to correct if needed"
          error={errors.balanceAfter}
        >
          <Input
            type="number"
            min="0"
            step="any"
            value={balanceAfter}
            onChange={(e) => {
              setBalanceAfter(e.target.value);
              setErrors({});
            }}
            placeholder="0.00"
            className={`h-10 font-mono ${errors.balanceAfter ? "border-destructive" : ""}`}
          />
        </Field>

        <Field label="Date" error={errors.date}>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={`h-10 ${errors.date ? "border-destructive" : ""}`}
          />
        </Field>

        <Field label="Notes" optional>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={
              entryType === "charges"
                ? "e.g. Monthly purchases"
                : "e.g. Extra payment, minimum payment"
            }
            className="h-10"
          />
        </Field>
      </SectionCard>

      {/* ── Actions ── */}
      <div className="flex flex-col gap-3" style={{ paddingTop: "8px" }}>
        <Button
          className="w-full"
          style={{ height: "48px", fontSize: "15px" }}
          onClick={handleSubmit}
          disabled={isPending}
        >
          {isPending ? "Saving…" : entryType === "charges" ? "Log Charges" : "Log Payment"}
        </Button>
        <Button
          variant="outline"
          className="w-full"
          style={{ height: "48px", fontSize: "15px" }}
          onClick={() => router.push("/liabilities")}
          disabled={isPending}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
