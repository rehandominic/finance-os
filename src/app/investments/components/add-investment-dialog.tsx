"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StockSearchCombobox, SelectedInvestment } from "./stock-search-combobox";
import { createInvestmentWithTransaction } from "../actions";
import { InvestmentType, Geography, Currency, TransactionType } from "@/lib/enums";
import { INVESTMENT_TYPE_LABELS } from "@/lib/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type FormState = {
  // Investment
  name: string;
  ticker: string;
  yahooTicker: string;
  type: InvestmentType;
  geography: Geography;
  currency: Currency;
  sector: string;
  currentPrice: string;
  notes: string;
  // Transaction
  date: string;
  transactionType: TransactionType;
  quantity: string;
  pricePerUnit: string;
  fees: string;
  txNotes: string;
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
  txNotes: "",
};

const SECTORS = [
  "Technology", "Finance", "Healthcare", "Energy",
  "Consumer", "Real Estate", "Metals", "Other",
];

const CURRENCY_OPTIONS = [
  { value: Currency.INR, label: "INR (₹)" },
  { value: Currency.USD, label: "USD ($)" },
];

const TX_TYPE_OPTIONS = [
  { value: TransactionType.BUY, label: "Buy" },
  { value: TransactionType.SIP, label: "SIP" },
];

export function AddInvestmentDialog({ open, onOpenChange }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<"search" | "form">("search");
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  function reset() {
    setForm(DEFAULT_FORM);
    setErrors({});
    setMode("search");
  }

  function handleOpenChange(val: boolean) {
    if (!val) reset();
    onOpenChange(val);
  }

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
    if (!form.name.trim()) errs.name = "Required";
    if (!form.currentPrice || isNaN(Number(form.currentPrice)) || Number(form.currentPrice) <= 0)
      errs.currentPrice = "Must be a positive number";
    if (!form.quantity || isNaN(Number(form.quantity)) || Number(form.quantity) <= 0)
      errs.quantity = "Must be a positive number";
    if (!form.pricePerUnit || isNaN(Number(form.pricePerUnit)) || Number(form.pricePerUnit) <= 0)
      errs.pricePerUnit = "Must be a positive number";
    if (!form.date) errs.date = "Required";
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
            notes: form.txNotes.trim() || undefined,
          },
        });
        toast.success(`${form.name} added to portfolio`);
        handleOpenChange(false);
        router.refresh();
      } catch (err) {
        toast.error("Failed to add investment. Please check your inputs.");
        console.error(err);
      }
    });
  }

  const currencySymbol = form.currency === Currency.INR ? "₹" : "$";
  const totalAmount =
    Number(form.quantity) > 0 && Number(form.pricePerUnit) > 0
      ? Number(form.quantity) * Number(form.pricePerUnit) + (Number(form.fees) || 0)
      : null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Investment</DialogTitle>
          <DialogDescription>
            {mode === "search"
              ? "Search for a stock, ETF, mutual fund, or crypto."
              : "Review and complete the details below."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-1">
          {/* ── Search / Name ── */}
          {mode === "search" ? (
            <StockSearchCombobox
              onSelect={handleSearchSelect}
              onManual={() => setMode("form")}
            />
          ) : (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Name</label>
              <div className="flex gap-2">
                <Input
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="e.g. Reliance Industries"
                  className={`flex-1 h-9 ${errors.name ? "border-destructive" : ""}`}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 text-xs text-muted-foreground shrink-0"
                  onClick={() => setMode("search")}
                >
                  ← Search
                </Button>
              </div>
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
          )}

          {/* ── Form fields (shown after search selection or in manual mode) ── */}
          {mode === "form" && (
            <>
              {/* Row: Ticker + Yahoo Ticker */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">Ticker</label>
                  <Input
                    value={form.ticker}
                    onChange={(e) => set("ticker", e.target.value)}
                    placeholder="RELIANCE.NS"
                    className="h-9 font-mono text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">Yahoo Ticker</label>
                  <Input
                    value={form.yahooTicker}
                    onChange={(e) => set("yahooTicker", e.target.value)}
                    placeholder="RELIANCE.NS"
                    className="h-9 font-mono text-sm"
                  />
                </div>
              </div>

              {/* Row: Type + Geography */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">Type</label>
                  <Select value={form.type} onValueChange={(v) => set("type", v as InvestmentType)}>
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(INVESTMENT_TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">Currency</label>
                  <Select value={form.currency} onValueChange={(v) => set("currency", v as Currency)}>
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCY_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row: Sector + Current Price */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">Sector</label>
                  <Select value={form.sector || "none"} onValueChange={(v) => set("sector", !v || v === "none" ? "" : v)}>
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue placeholder="Optional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {SECTORS.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Current Price ({currencySymbol})
                  </label>
                  <Input
                    type="number"
                    value={form.currentPrice}
                    onChange={(e) => set("currentPrice", e.target.value)}
                    placeholder="0.00"
                    className={`h-9 font-mono text-sm ${errors.currentPrice ? "border-destructive" : ""}`}
                  />
                  {errors.currentPrice && <p className="text-xs text-destructive">{errors.currentPrice}</p>}
                </div>
              </div>

              {/* Notes */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Notes (optional)</label>
                <Input
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  placeholder="Any notes about this investment"
                  className="h-9"
                />
              </div>

              {/* ── Divider ── */}
              <div className="flex items-center gap-3 my-1">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  First Transaction
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>

              {/* Row: Date + Transaction Type */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">Date</label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      type="date"
                      value={form.date}
                      onChange={(e) => set("date", e.target.value)}
                      className={`h-9 pl-8 ${errors.date ? "border-destructive" : ""}`}
                    />
                  </div>
                  {errors.date && <p className="text-xs text-destructive">{errors.date}</p>}
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">Type</label>
                  <Select
                    value={form.transactionType}
                    onValueChange={(v) => set("transactionType", v as TransactionType)}
                  >
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TX_TYPE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row: Quantity + Price per Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">Quantity</label>
                  <Input
                    type="number"
                    value={form.quantity}
                    onChange={(e) => set("quantity", e.target.value)}
                    placeholder="0"
                    className={`h-9 font-mono text-sm ${errors.quantity ? "border-destructive" : ""}`}
                  />
                  {errors.quantity && <p className="text-xs text-destructive">{errors.quantity}</p>}
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Price per Unit ({currencySymbol})
                  </label>
                  <Input
                    type="number"
                    value={form.pricePerUnit}
                    onChange={(e) => set("pricePerUnit", e.target.value)}
                    placeholder="0.00"
                    className={`h-9 font-mono text-sm ${errors.pricePerUnit ? "border-destructive" : ""}`}
                  />
                  {errors.pricePerUnit && <p className="text-xs text-destructive">{errors.pricePerUnit}</p>}
                </div>
              </div>

              {/* Fees */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Fees ({currencySymbol}) <span className="text-muted-foreground/60">optional</span>
                </label>
                <Input
                  type="number"
                  value={form.fees}
                  onChange={(e) => set("fees", e.target.value)}
                  placeholder="0"
                  className="h-9 font-mono text-sm"
                />
              </div>

              {/* Live total */}
              {totalAmount !== null && (
                <div className="rounded-lg bg-muted/60 px-3 py-2.5 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Total Amount</span>
                  <span className="font-mono text-sm font-semibold">
                    {currencySymbol}
                    {totalAmount.toLocaleString(
                      form.currency === Currency.INR ? "en-IN" : "en-US",
                      { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                    )}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {mode === "form" && (
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? "Adding…" : "Add Investment"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
