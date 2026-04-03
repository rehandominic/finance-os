"use client";

/**
 * Add Asset Page
 *
 * Design tokens (same as Add Investment page):
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
import { createAsset } from "@/app/assets/actions";
import { AssetType, Currency } from "@/lib/enums";
import { ASSET_TYPE_LABELS } from "@/lib/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const AREA_UNITS: Record<string, string[]> = {
  PROPERTY: ["sq.ft", "acres", "cents"],
  GOLD_METALS: ["grams", "kg", "oz", "tola"],
  ART_COLLECTIBLES: ["pieces"],
};

const METAL_TYPES = [
  "Gold 24K", "Gold 22K", "Gold 18K",
  "Silver", "Platinum", "Palladium", "Other Metal",
];

// ─── Shared components (exact tokens from investments/add) ────────────────────

function Label({ children, optional }: { children: React.ReactNode; optional?: boolean }) {
  return (
    <span className="text-sm font-medium text-foreground">
      {children}
      {optional && <span className="text-xs text-muted-foreground font-normal ml-1">(optional)</span>}
    </span>
  );
}

function Field({
  label, optional, error, children,
}: {
  label: string; optional?: boolean; error?: string; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label optional={optional}>{label}</Label>
      {children}
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

// ─── Form state ───────────────────────────────────────────────────────────────

type FormState = {
  name: string;
  description: string;
  type: AssetType;
  currency: Currency;
  purchaseDate: string;
  purchasePrice: string;
  currentValue: string;
  notes: string;
  // Property
  location: string;
  areaQty: string;
  areaUnit: string;
  // Vehicle
  depreciationRate: string;
  // Cash / FD
  principal: string;
  interestRate: string;
  maturityDate: string;
  // Gold / Metals
  metalType: string;
  ratePerUnit: string;
};

const DEFAULT_FORM: FormState = {
  name: "",
  description: "",
  type: AssetType.PROPERTY,
  currency: Currency.INR,
  purchaseDate: new Date().toISOString().split("T")[0],
  purchasePrice: "",
  currentValue: "",
  notes: "",
  location: "",
  areaQty: "",
  areaUnit: "grams",
  depreciationRate: "",
  principal: "",
  interestRate: "",
  maturityDate: "",
  metalType: "Gold 24K",
  ratePerUnit: "",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AddAssetPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim())                                          errs.name = "Required";
    if (!form.purchaseDate)                                         errs.purchaseDate = "Required";
    if (form.type === AssetType.GOLD_METALS) {
      if (!form.areaQty || Number(form.areaQty) <= 0)              errs.areaQty = "Enter a positive quantity";
      if (!form.ratePerUnit || Number(form.ratePerUnit) <= 0)      errs.ratePerUnit = "Enter a positive rate";
    } else {
      if (!form.purchasePrice || Number(form.purchasePrice) <= 0)  errs.purchasePrice = "Enter a positive price";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    startTransition(async () => {
      try {
        // For metals: purchasePrice and currentValue are derived from qty × rate
        const isMetals = form.type === AssetType.GOLD_METALS;
        const metalTotal = isMetals
          ? Number(form.areaQty) * Number(form.ratePerUnit)
          : 0;

        const payload: Record<string, unknown> = {
          name: form.name.trim(),
          // For metals: store "metalType|ratePerUnit" in description so update-valuation can read rate
          description: isMetals
            ? `${form.metalType}|${form.ratePerUnit}`
            : (form.description.trim() || undefined),
          type: form.type,
          currency: form.currency,
          purchaseDate: new Date(form.purchaseDate),
          purchasePrice: isMetals ? metalTotal : Number(form.purchasePrice),
          currentValue: isMetals ? metalTotal : (form.currentValue ? Number(form.currentValue) : Number(form.purchasePrice)),
          notes: form.notes.trim() || undefined,
        };

        if (form.type === AssetType.PROPERTY) {
          if (form.location) payload.location = form.location;
          if (form.areaQty)  payload.areaQty  = Number(form.areaQty);
          if (form.areaUnit) payload.areaUnit  = form.areaUnit;
        }
        if (form.type === AssetType.GOLD_METALS || form.type === AssetType.ART_COLLECTIBLES) {
          if (form.areaQty)  payload.areaQty  = Number(form.areaQty);
          if (form.areaUnit) payload.areaUnit  = form.areaUnit;
        }
        if (form.type === AssetType.VEHICLE) {
          if (form.depreciationRate) payload.depreciationRate = Number(form.depreciationRate);
        }
        if (form.type === AssetType.CASH_FD) {
          if (form.principal)     payload.principal    = Number(form.principal);
          if (form.interestRate)  payload.interestRate = Number(form.interestRate);
          if (form.maturityDate)  payload.maturityDate = new Date(form.maturityDate);
        }

        const result = await createAsset(payload);
        if (result.error) {
          toast.error("Please check your inputs and try again.");
          return;
        }
        toast.success(`${form.name} added to assets`);
        router.push("/assets");
      } catch (err) {
        toast.error("Failed to add asset. Please check your inputs.");
        console.error(err);
      }
    });
  }

  const sym = form.currency === Currency.INR ? "₹" : "$";
  const areaUnits = AREA_UNITS[form.type] ?? [];

  // Metals: auto-calculate total
  const metalQty = Number(form.areaQty) || 0;
  const metalRate = Number(form.ratePerUnit) || 0;
  const metalTotal = metalQty > 0 && metalRate > 0 ? metalQty * metalRate : null;

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
            {form.name || "Add Asset"}
          </h1>
          <p className="text-xs text-muted-foreground">Fill in the details below</p>
        </div>
      </div>

      {/* ── Asset Details ── */}
      <SectionCard title="Asset Details">

        {/* Type selector */}
        <Field label="Asset Type">
          <Select value={form.type} onValueChange={(v) => { set("type", v as AssetType); set("areaUnit", ""); }}>
            <SelectTrigger className="h-10 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ASSET_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Name" error={errors.name}>
          <Input
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder={
              form.type === AssetType.PROPERTY ? "e.g. Flat in Kochi" :
              form.type === AssetType.VEHICLE  ? "e.g. Toyota Innova" :
              form.type === AssetType.CASH_FD  ? "e.g. SBI Fixed Deposit" :
              form.type === AssetType.GOLD_METALS ? "e.g. Physical Gold" :
              "Asset name"
            }
            className={`h-10 ${errors.name ? "border-destructive" : ""}`}
          />
        </Field>

        <Field label="Description" optional>
          <Input
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Brief description"
            className="h-10"
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          <Field label="Purchase Date" error={errors.purchaseDate}>
            <Input
              type="date"
              value={form.purchaseDate}
              onChange={(e) => set("purchaseDate", e.target.value)}
              className={`h-10 ${errors.purchaseDate ? "border-destructive" : ""}`}
            />
          </Field>
        </div>

        {form.type !== AssetType.GOLD_METALS && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={`Purchase Price (${sym})`} error={errors.purchasePrice}>
              <Input
                type="number"
                min="0"
                step="any"
                value={form.purchasePrice}
                onChange={(e) => set("purchasePrice", e.target.value)}
                placeholder="0.00"
                className={`h-10 font-mono ${errors.purchasePrice ? "border-destructive" : ""}`}
              />
            </Field>
            <Field label={`Current Value (${sym})`} optional>
              <Input
                type="number"
                min="0"
                step="any"
                value={form.currentValue}
                onChange={(e) => set("currentValue", e.target.value)}
                placeholder="Defaults to purchase price"
                className="h-10 font-mono"
              />
            </Field>
          </div>
        )}

        <Field label="Notes" optional>
          <Input
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Any notes about this asset"
            className="h-10"
          />
        </Field>
      </SectionCard>

      {/* ── Type-specific Details ── */}

      {/* Property */}
      {form.type === AssetType.PROPERTY && (
        <SectionCard title="Property Details">
          <Field label="Location" optional>
            <Input
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
              placeholder="e.g. Kochi, Kerala"
              className="h-10"
            />
          </Field>
          {areaUnits.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Area" optional>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={form.areaQty}
                  onChange={(e) => set("areaQty", e.target.value)}
                  placeholder="0"
                  className="h-10 font-mono"
                />
              </Field>
              <Field label="Unit" optional>
                <Select value={form.areaUnit || "none"} onValueChange={(v) => set("areaUnit", !v || v === "none" ? "" : v)}>
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {areaUnits.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          )}
        </SectionCard>
      )}

      {/* Vehicle */}
      {form.type === AssetType.VEHICLE && (
        <SectionCard title="Vehicle Details">
          <Field label="Annual Depreciation Rate (%)" optional>
            <Input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={form.depreciationRate}
              onChange={(e) => set("depreciationRate", e.target.value)}
              placeholder="e.g. 15"
              className="h-10 font-mono"
            />
          </Field>
          <p className="text-xs text-muted-foreground -mt-1">
            If set, current value will be auto-calculated daily using straight-line depreciation.
          </p>
        </SectionCard>
      )}

      {/* Cash / FD */}
      {form.type === AssetType.CASH_FD && (
        <SectionCard title="Deposit Details">
          <Field label={`Principal Amount (${sym})`} optional>
            <Input
              type="number"
              min="0"
              step="any"
              value={form.principal}
              onChange={(e) => set("principal", e.target.value)}
              placeholder="0.00"
              className="h-10 font-mono"
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Interest Rate (% p.a.)" optional>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.interestRate}
                onChange={(e) => set("interestRate", e.target.value)}
                placeholder="e.g. 7.5"
                className="h-10 font-mono"
              />
            </Field>
            <Field label="Maturity Date" optional>
              <Input
                type="date"
                value={form.maturityDate}
                onChange={(e) => set("maturityDate", e.target.value)}
                className="h-10"
              />
            </Field>
          </div>
          <p className="text-xs text-muted-foreground -mt-1">
            If interest rate is set, accrued value will be auto-calculated daily using compound interest.
          </p>
        </SectionCard>
      )}

      {/* Gold / Metals */}
      {form.type === AssetType.GOLD_METALS && (
        <SectionCard title="Metal Details">
          <Field label="Metal Type">
            <Select value={form.metalType} onValueChange={(v) => set("metalType", v ?? form.metalType)}>
              <SelectTrigger className="h-10 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METAL_TYPES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Quantity" error={errors.areaQty}>
              <Input
                type="number"
                min="0"
                step="any"
                value={form.areaQty}
                onChange={(e) => set("areaQty", e.target.value)}
                placeholder="0"
                className={`h-10 font-mono ${errors.areaQty ? "border-destructive" : ""}`}
              />
            </Field>
            <Field label="Unit">
              <Select value={form.areaUnit || "grams"} onValueChange={(v) => set("areaUnit", v ?? "grams")}>
                <SelectTrigger className="h-10 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {areaUnits.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label={`Purchase Rate per ${form.areaUnit || "gram"} (${sym})`} error={errors.ratePerUnit}>
            <Input
              type="number"
              min="0"
              step="any"
              value={form.ratePerUnit}
              onChange={(e) => set("ratePerUnit", e.target.value)}
              placeholder="0.00"
              className={`h-10 font-mono ${errors.ratePerUnit ? "border-destructive" : ""}`}
            />
          </Field>

          {/* Live total */}
          {metalTotal !== null && (
            <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
              <span className="text-sm text-muted-foreground">Total Value</span>
              <span className="font-mono text-sm font-semibold">
                {sym}{metalTotal.toLocaleString(
                  form.currency === Currency.INR ? "en-IN" : "en-US",
                  { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                )}
              </span>
            </div>
          )}
        </SectionCard>
      )}

      {/* Art / Collectibles */}
      {form.type === AssetType.ART_COLLECTIBLES && (
        <SectionCard title="Collectible Details">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Quantity" optional>
              <Input
                type="number"
                min="0"
                step="1"
                value={form.areaQty}
                onChange={(e) => set("areaQty", e.target.value)}
                placeholder="1"
                className="h-10 font-mono"
              />
            </Field>
            <Field label="Unit" optional>
              <Select value={form.areaUnit || "none"} onValueChange={(v) => set("areaUnit", !v || v === "none" ? "" : v)}>
                <SelectTrigger className="h-10 w-full">
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {areaUnits.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </SectionCard>
      )}

      {/* ── Action buttons ── */}
      <div className="flex flex-col" style={{ gap: "12px", paddingTop: "8px" }}>
        <Button
          className="w-full"
          style={{ height: "48px", fontSize: "15px" }}
          onClick={handleSubmit}
          disabled={isPending}
        >
          {isPending ? "Adding…" : "Add Asset"}
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
