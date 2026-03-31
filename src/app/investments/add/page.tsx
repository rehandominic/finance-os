"use client";

/**
 * Add Investment Page
 *
 * Design tokens (keep consistent across all form pages):
 *   Label          — text-sm font-medium text-foreground
 *   Optional hint  — text-xs text-muted-foreground font-normal (inline after label)
 *   Input / Select — h-10, rounded-lg, w-full
 *   Field gap      — gap-2 (label → control)
 *   Fields in row  — gap-4
 *   Section rows   — space-y-4
 *   Section card   — rounded-xl border bg-card p-6, title mb-4, content space-y-4
 *   Section head   — text-xs font-semibold uppercase tracking-widest text-muted-foreground
 *   Page sections  — space-y-6
 *   Button         — h-12, full width, mt-2 gap from last card
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StockSearchCombobox, SelectedInvestment } from "../components/stock-search-combobox";
import { createInvestmentWithTransaction } from "../actions";
import { InvestmentType, Geography, Currency, TransactionType } from "@/lib/enums";
import { INVESTMENT_TYPE_LABELS } from "@/lib/types";

// ─── Types & constants ────────────────────────────────────────────────────────

type FormState = {
  name: string;
  ticker: string;
  yahooTicker: string;
  type: InvestmentType;
  geography: Geography;
  currency: Currency;
  sector: string;
  currentPrice: string;
  notes: string;
  date: string;
  transactionType: TransactionType;
  quantity: string;
  pricePerUnit: string;
  fees: string;
};

const DEFAULT_FORM: FormState = {
  name: "",
  ticker: "",
  yahooTicker: "",
  type: InvestmentType.INDIA_STOCK,
  geography: Geography.INDIA,
  currency: Currency.INR,
  sector: "",
  currentPrice: "",
  notes: "",
  date: new Date().toISOString().split("T")[0],
  transactionType: TransactionType.BUY,
  quantity: "",
  pricePerUnit: "",
  fees: "0",
};

const SECTORS = [
  "Technology", "Finance", "Healthcare", "Energy",
  "Consumer", "Real Estate", "Metals", "Other",
];

const TX_TYPE_OPTIONS = [
  { value: TransactionType.BUY,  label: "Buy"  },
  { value: TransactionType.SIP,  label: "SIP"  },
];

// ─── Small shared components ──────────────────────────────────────────────────

function Label({
  children,
  optional,
}: {
  children: React.ReactNode;
  optional?: boolean;
}) {
  return (
    <span className="text-sm font-medium text-foreground">
      {children}
      {optional && (
        <span className="text-xs text-muted-foreground font-normal ml-1">(optional)</span>
      )}
    </span>
  );
}

function Field({
  label,
  optional,
  error,
  children,
}: {
  label: string;
  optional?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label optional={optional}>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl border bg-card"
      style={{ padding: "24px" }}
    >
      <p
        className="text-xs font-semibold uppercase tracking-widest text-muted-foreground"
        style={{ marginBottom: "16px" }}
      >
        {title}
      </p>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AddInvestmentPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<"search" | "form">("search");
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function handleSearchSelect(inv: SelectedInvestment) {
    setForm((prev) => ({
      ...prev,
      name: inv.name,
      ticker: inv.ticker,
      yahooTicker: inv.yahooTicker,
      type: inv.type,
      geography: inv.geography,
      currency: inv.currency,
      sector: inv.sector,
      currentPrice: inv.currentPrice > 0 ? String(inv.currentPrice) : "",
      pricePerUnit: inv.currentPrice > 0 ? String(inv.currentPrice) : "",
    }));
    setErrors({});
    setMode("form");
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim())                                                  errs.name = "Required";
    if (!form.currentPrice || Number(form.currentPrice) <= 0)               errs.currentPrice = "Enter a positive price";
    if (!form.quantity     || Number(form.quantity) <= 0)                   errs.quantity = "Enter a positive quantity";
    if (!form.pricePerUnit || Number(form.pricePerUnit) <= 0)               errs.pricePerUnit = "Enter a positive price";
    if (!form.date)                                                          errs.date = "Required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    startTransition(async () => {
      try {
        await createInvestmentWithTransaction({
          investment: {
            name: form.name.trim(),
            ticker: form.ticker.trim() || undefined,
            yahooTicker: form.yahooTicker.trim() || undefined,
            type: form.type,
            geography: form.geography,
            currency: form.currency,
            sector: form.sector.trim() || undefined,
            currentPrice: Number(form.currentPrice),
            previousClose: undefined,
            notes: form.notes.trim() || undefined,
          },
          transaction: {
            date: new Date(form.date),
            type: form.transactionType,
            quantity: Number(form.quantity),
            pricePerUnit: Number(form.pricePerUnit),
            fees: Number(form.fees) || 0,
          },
        });
        toast.success(`${form.name} added to portfolio`);
        router.push("/investments");
      } catch (err) {
        toast.error("Failed to add investment. Please check your inputs.");
        console.error(err);
      }
    });
  }

  const sym = form.currency === Currency.INR ? "₹" : "$";
  const total =
    Number(form.quantity) > 0 && Number(form.pricePerUnit) > 0
      ? Number(form.quantity) * Number(form.pricePerUnit) + (Number(form.fees) || 0)
      : null;

  return (
    <div className="max-w-lg mx-auto pb-10" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

      {/* ── Page header ── */}
      <div className="flex items-center gap-3 pt-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0 -ml-1"
          onClick={() => router.push("/investments")}
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Back to investments</span>
        </Button>
        <div className="min-w-0">
          <h1 className="text-lg font-semibold leading-snug truncate">
            {mode === "form" && form.name ? form.name : "Add Investment"}
          </h1>
          <p className="text-xs text-muted-foreground">
            {mode === "search" ? "Search for a security to get started" : "Fill in the details below"}
          </p>
        </div>
      </div>

      {/* ── Search mode ── */}
      {mode === "search" && (
        <SectionCard title="Find a Security">
          <StockSearchCombobox onSelect={handleSearchSelect} onManual={() => setMode("form")} />
        </SectionCard>
      )}

      {/* ── Form mode ── */}
      {mode === "form" && (
        <>
          {/* Investment Details */}
          <SectionCard title="Investment Details">

            <Field label="Name" error={errors.name}>
              <div className="flex gap-2">
                <Input
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="e.g. Reliance Industries"
                  className={`h-10 flex-1 ${errors.name ? "border-destructive" : ""}`}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-10 px-3 text-xs shrink-0"
                  onClick={() => setMode("search")}
                >
                  ← Search
                </Button>
              </div>
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Ticker" optional>
                <Input
                  value={form.ticker}
                  onChange={(e) => set("ticker", e.target.value)}
                  placeholder="RELIANCE.NS"
                  className="h-10 font-mono"
                />
              </Field>
              <Field label="Yahoo Ticker" optional>
                <Input
                  value={form.yahooTicker}
                  onChange={(e) => set("yahooTicker", e.target.value)}
                  placeholder="RELIANCE.NS"
                  className="h-10 font-mono"
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Type">
                <Select value={form.type} onValueChange={(v) => set("type", v as InvestmentType)}>
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(INVESTMENT_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Currency">
                <Select value={form.currency} onValueChange={(v) => set("currency", v as Currency)}>
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={Currency.INR}>INR (₹)</SelectItem>
                    <SelectItem value={Currency.USD}>USD ($)</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Sector" optional>
                <Select
                  value={form.sector || "none"}
                  onValueChange={(v) => set("sector", !v || v === "none" ? "" : v)}
                >
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder="Select sector" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {SECTORS.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label={`Current Price (${sym})`} error={errors.currentPrice}>
                <Input
                  type="number"
                  value={form.currentPrice}
                  onChange={(e) => set("currentPrice", e.target.value)}
                  placeholder="0.00"
                  className={`h-10 font-mono ${errors.currentPrice ? "border-destructive" : ""}`}
                />
              </Field>
            </div>

            <Field label="Notes" optional>
              <Input
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Any notes about this investment"
                className="h-10"
              />
            </Field>
          </SectionCard>

          {/* First Transaction */}
          <SectionCard title="First Transaction">

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Date" error={errors.date}>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => set("date", e.target.value)}
                  className={`h-10 ${errors.date ? "border-destructive" : ""}`}
                />
              </Field>
              <Field label="Transaction Type">
                <Select
                  value={form.transactionType}
                  onValueChange={(v) => set("transactionType", v as TransactionType)}
                >
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TX_TYPE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Quantity" error={errors.quantity}>
                <Input
                  type="number"
                  value={form.quantity}
                  onChange={(e) => set("quantity", e.target.value)}
                  placeholder="0"
                  className={`h-10 font-mono ${errors.quantity ? "border-destructive" : ""}`}
                />
              </Field>
              <Field label={`Price per Unit (${sym})`} error={errors.pricePerUnit}>
                <Input
                  type="number"
                  value={form.pricePerUnit}
                  onChange={(e) => set("pricePerUnit", e.target.value)}
                  placeholder="0.00"
                  className={`h-10 font-mono ${errors.pricePerUnit ? "border-destructive" : ""}`}
                />
              </Field>
            </div>

            <Field label={`Brokerage / Fees (${sym})`} optional>
              <Input
                type="number"
                value={form.fees}
                onChange={(e) => set("fees", e.target.value)}
                placeholder="0"
                className="h-10 font-mono"
              />
            </Field>

            {/* Live total summary */}
            {total !== null && (
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3 mt-1">
                <span className="text-sm text-muted-foreground">Total Amount</span>
                <span className="font-mono text-sm font-semibold">
                  {sym}{total.toLocaleString(
                    form.currency === Currency.INR ? "en-IN" : "en-US",
                    { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                  )}
                </span>
              </div>
            )}
          </SectionCard>

          {/* Action buttons */}
          <div className="flex flex-col" style={{ gap: "12px", paddingTop: "8px" }}>
            <Button
              className="w-full"
              style={{ height: "48px", fontSize: "15px" }}
              onClick={handleSubmit}
              disabled={isPending}
            >
              {isPending ? "Adding…" : "Add Investment"}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              style={{ height: "48px", fontSize: "15px" }}
              onClick={() => router.push("/investments")}
              disabled={isPending}
            >
              Cancel
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
