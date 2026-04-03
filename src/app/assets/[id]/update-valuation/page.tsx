"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAsset, createValuationEntry } from "@/app/assets/actions";
import { ValuationSource } from "@/lib/enums";
import type { AssetWithValuations } from "@/lib/types";

// ─── Shared design tokens (same as all other form pages) ─────────────────────

function Label({ children, optional }: { children: React.ReactNode; optional?: boolean }) {
  return (
    <span className="text-sm font-medium text-foreground">
      {children}
      {optional && <span className="text-xs text-muted-foreground font-normal ml-1">(optional)</span>}
    </span>
  );
}

function Field({
  label, optional, error, hint, children,
}: {
  label: string; optional?: boolean; error?: string; hint?: string; children: React.ReactNode;
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

export default function UpdateValuationPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [isPending, startTransition] = useTransition();
  const [asset, setAsset] = useState<AssetWithValuations | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [newValue, setNewValue] = useState("");
  const [newRate, setNewRate]   = useState("");  // metals only: rate per unit
  const [date, setDate]         = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes]       = useState("");
  const [errors, setErrors]     = useState<Record<string, string>>({});

  useEffect(() => {
    getAsset(id).then((a) => {
      setAsset(a);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-lg mx-auto pb-10" style={{ paddingTop: "24px" }}>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="max-w-lg mx-auto pb-10" style={{ paddingTop: "24px" }}>
        <p className="text-sm text-destructive">Asset not found.</p>
      </div>
    );
  }

  const isMetals = asset.type === "GOLD_METALS";
  const sym = asset.currency === "USD" ? "$" : "₹";

  // Parse metal type and purchase rate from description ("Gold 24K|7500")
  let metalType = "";
  let purchaseRate = 0;
  if (isMetals && asset.description) {
    const parts = asset.description.split("|");
    metalType = parts[0] ?? "";
    purchaseRate = parseFloat(parts[1] ?? "0") || 0;
  }

  const qty = asset.areaQty ?? 0;
  const unit = asset.areaUnit ?? "grams";

  // Derived: what the new total value will be
  const computedValue = isMetals && newRate
    ? qty * (parseFloat(newRate) || 0)
    : parseFloat(newValue) || 0;

  const diff = computedValue - asset.currentValue;
  const diffPct = asset.currentValue > 0 ? (diff / asset.currentValue) * 100 : 0;

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!date) errs.date = "Required";
    if (isMetals) {
      if (!newRate || parseFloat(newRate) <= 0) errs.newRate = "Enter a positive rate";
    } else {
      if (!newValue || parseFloat(newValue) < 0) errs.newValue = "Enter a valid value";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    startTransition(async () => {
      try {
        const finalValue = isMetals ? qty * parseFloat(newRate) : parseFloat(newValue);
        await createValuationEntry({
          assetId: asset!.id,
          date: new Date(date),
          value: finalValue,
          source: ValuationSource.MANUAL,
          notes: notes.trim() || undefined,
        });
        toast.success("Valuation updated");
        router.push("/assets");
      } catch {
        toast.error("Failed to save valuation. Please try again.");
      }
    });
  }

  return (
    <div className="max-w-lg mx-auto pb-10" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

      {/* ── Page header ── */}
      <div className="flex items-center gap-3 pt-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0 -ml-1"
          onClick={() => router.push("/assets")}
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Back to assets</span>
        </Button>
        <div className="min-w-0">
          <h1 className="text-lg font-semibold leading-snug truncate">
            {asset.name}
          </h1>
          <p className="text-xs text-muted-foreground">Update valuation</p>
        </div>
      </div>

      {/* ── Current snapshot ── */}
      <SectionCard title="Current Value">
        <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
          <span className="text-sm text-muted-foreground">
            {isMetals ? `${qty} ${unit} @ ${fmtCurrency(purchaseRate, asset.currency)}/${unit} (purchase)` : "Current value"}
          </span>
          <span className="font-mono text-sm font-semibold">
            {fmtCurrency(asset.currentValue, asset.currency)}
          </span>
        </div>
        {isMetals && purchaseRate > 0 && (
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span>Current rate per {unit}</span>
            <span className="font-mono">{fmtCurrency(asset.currentValue / qty, asset.currency)}</span>
          </div>
        )}
      </SectionCard>

      {/* ── New valuation ── */}
      <SectionCard title={isMetals ? "New Rate" : "New Value"}>

        {isMetals ? (
          <>
            <Field
              label={`New Rate per ${unit} (${sym})`}
              error={errors.newRate}
              hint={`${metalType} — ${qty} ${unit} total`}
            >
              <Input
                type="number"
                min="0"
                step="any"
                value={newRate}
                onChange={(e) => { setNewRate(e.target.value); setErrors({}); }}
                placeholder="0.00"
                className={`h-10 font-mono ${errors.newRate ? "border-destructive" : ""}`}
                autoFocus
              />
            </Field>

            {/* Computed total preview */}
            {computedValue > 0 && (
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
                <span className="text-sm text-muted-foreground">
                  {qty} {unit} × {sym}{parseFloat(newRate).toLocaleString(asset.currency === "INR" ? "en-IN" : "en-US")}
                </span>
                <span className="font-mono text-sm font-semibold">
                  = {fmtCurrency(computedValue, asset.currency)}
                </span>
              </div>
            )}
          </>
        ) : (
          <Field label={`New Value (${sym})`} error={errors.newValue}>
            <Input
              type="number"
              min="0"
              step="any"
              value={newValue}
              onChange={(e) => { setNewValue(e.target.value); setErrors({}); }}
              placeholder="0.00"
              className={`h-10 font-mono ${errors.newValue ? "border-destructive" : ""}`}
              autoFocus
            />
          </Field>
        )}

        {/* Change indicator */}
        {computedValue > 0 && (
          <p className={`text-xs font-mono ${diff >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
            {diff >= 0 ? "▲" : "▼"} {fmtCurrency(Math.abs(diff), asset.currency)} ({diff >= 0 ? "+" : ""}{diffPct.toFixed(1)}%) vs current
          </p>
        )}

        <Field label="Valuation Date" error={errors.date}>
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
            placeholder="e.g. Based on current spot price"
            className="h-10"
          />
        </Field>
      </SectionCard>

      {/* ── Action buttons ── */}
      <div className="flex flex-col" style={{ gap: "12px", paddingTop: "8px" }}>
        <Button
          className="w-full"
          style={{ height: "48px", fontSize: "15px" }}
          onClick={handleSubmit}
          disabled={isPending}
        >
          {isPending ? "Saving…" : "Save Valuation"}
        </Button>
        <Button
          variant="outline"
          className="w-full"
          style={{ height: "48px", fontSize: "15px" }}
          onClick={() => router.push("/assets")}
          disabled={isPending}
        >
          Cancel
        </Button>
      </div>

    </div>
  );
}
