"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarIcon } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createTransaction } from "../actions";
import { Currency, TransactionType } from "@/lib/enums";
import { InvestmentWithStats } from "@/lib/types";

interface Props {
  investment: InvestmentWithStats | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type FormState = {
  date: string;
  type: TransactionType;
  quantity: string;
  pricePerUnit: string;
  fees: string;
  notes: string;
};

const DEFAULT_FORM: FormState = {
  date: new Date().toISOString().split("T")[0],
  type: TransactionType.BUY,
  quantity: "",
  pricePerUnit: "",
  fees: "0",
  notes: "",
};

const TX_TYPE_OPTIONS = [
  { value: TransactionType.BUY, label: "Buy" },
  { value: TransactionType.SELL, label: "Sell" },
  { value: TransactionType.SIP, label: "SIP" },
  { value: TransactionType.DIVIDEND, label: "Dividend" },
];

const TX_TYPE_COLORS: Record<TransactionType, string> = {
  BUY: "text-emerald-500",
  SIP: "text-blue-500",
  SELL: "text-red-500",
  DIVIDEND: "text-purple-500",
};

export function AddTransactionSheet({ investment, open, onOpenChange }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  function reset() {
    setForm({
      ...DEFAULT_FORM,
      pricePerUnit: investment?.currentPrice ? String(investment.currentPrice) : "",
    });
    setErrors({});
  }

  function handleOpenChange(val: boolean) {
    if (val) reset();
    if (!val) setForm(DEFAULT_FORM);
    onOpenChange(val);
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validate(): boolean {
    if (!investment) return false;
    const errs: Partial<Record<keyof FormState, string>> = {};
    if (!form.date) errs.date = "Required";
    const isDividend = form.type === TransactionType.DIVIDEND;
    if (!isDividend) {
      if (!form.quantity || Number(form.quantity) <= 0) errs.quantity = "Must be positive";
      if (form.type === TransactionType.SELL && Number(form.quantity) > investment.totalQty) {
        errs.quantity = `Cannot sell more than ${investment.totalQty} held`;
      }
    }
    if (!form.pricePerUnit || Number(form.pricePerUnit) <= 0) errs.pricePerUnit = "Must be positive";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit() {
    if (!investment || !validate()) return;
    startTransition(async () => {
      try {
        await createTransaction({
          investmentId: investment.id,
          date: new Date(form.date),
          type: form.type,
          quantity: form.type === TransactionType.DIVIDEND ? 0 : Number(form.quantity),
          pricePerUnit: Number(form.pricePerUnit),
          fees: Number(form.fees) || 0,
          notes: form.notes.trim() || undefined,
        });
        toast.success("Transaction added");
        handleOpenChange(false);
        router.refresh();
      } catch {
        toast.error("Failed to add transaction");
      }
    });
  }

  if (!investment) return null;

  const isDividend = form.type === TransactionType.DIVIDEND;
  const currencySymbol = investment.currency === Currency.INR ? "₹" : "$";
  const total =
    !isDividend && Number(form.quantity) > 0 && Number(form.pricePerUnit) > 0
      ? Number(form.quantity) * Number(form.pricePerUnit) + (Number(form.fees) || 0)
      : isDividend && Number(form.pricePerUnit) > 0
      ? Number(form.pricePerUnit)
      : null;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="sm:max-w-md w-full flex flex-col gap-0 p-0">
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle>{investment.name}</SheetTitle>
          <SheetDescription className="flex items-center gap-2">
            <span className="font-mono">
              {currencySymbol}{investment.currentPrice.toLocaleString()}
            </span>
            {investment.ticker && (
              <span className="text-muted-foreground/60">·</span>
            )}
            {investment.ticker && (
              <span className="font-mono text-xs">{investment.ticker}</span>
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Date + Type */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
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
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Type</label>
              <Select
                value={form.type}
                onValueChange={(v) => v && set("type", v as TransactionType)}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TX_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      <span className={TX_TYPE_COLORS[o.value]}>{o.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Quantity — hidden for dividend */}
          {!isDividend && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Quantity</label>
              <Input
                type="number"
                value={form.quantity}
                onChange={(e) => set("quantity", e.target.value)}
                placeholder="0"
                className={`h-9 font-mono ${errors.quantity ? "border-destructive" : ""}`}
              />
              {errors.quantity && <p className="text-xs text-destructive">{errors.quantity}</p>}
              {form.type === TransactionType.SELL && (
                <p className="text-xs text-muted-foreground">
                  Available: {investment.totalQty} units
                </p>
              )}
            </div>
          )}

          {/* Price / Amount */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              {isDividend
                ? `Dividend Amount (${currencySymbol})`
                : `Price per Unit (${currencySymbol})`}
            </label>
            <Input
              type="number"
              value={form.pricePerUnit}
              onChange={(e) => set("pricePerUnit", e.target.value)}
              placeholder="0.00"
              className={`h-9 font-mono ${errors.pricePerUnit ? "border-destructive" : ""}`}
            />
            {errors.pricePerUnit && (
              <p className="text-xs text-destructive">{errors.pricePerUnit}</p>
            )}
          </div>

          {/* Fees — hidden for dividend */}
          {!isDividend && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Fees ({currencySymbol}) <span className="text-muted-foreground/50">optional</span>
              </label>
              <Input
                type="number"
                value={form.fees}
                onChange={(e) => set("fees", e.target.value)}
                placeholder="0"
                className="h-9 font-mono"
              />
            </div>
          )}

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Notes <span className="text-muted-foreground/50">optional</span>
            </label>
            <Input
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="e.g. Monthly SIP installment"
              className="h-9"
            />
          </div>

          {/* Live total */}
          {total !== null && (
            <div className="rounded-lg bg-muted/60 px-3 py-2.5 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {isDividend ? "Dividend Received" : "Total Amount"}
              </span>
              <span className="font-mono text-sm font-semibold">
                {currencySymbol}
                {total.toLocaleString(
                  investment.currency === Currency.INR ? "en-IN" : "en-US",
                  { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                )}
              </span>
            </div>
          )}
        </div>

        <SheetFooter className="border-t px-5 py-4 flex flex-row gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button className="flex-1" onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Adding…" : "Add Transaction"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
