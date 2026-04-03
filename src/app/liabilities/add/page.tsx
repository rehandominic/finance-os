"use client";

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
import { createLiability } from "@/app/liabilities/actions";
import { LiabilityType, Currency } from "@/lib/enums";
import { LIABILITY_TYPE_LABELS } from "@/lib/types";

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

// ─── Form state ───────────────────────────────────────────────────────────────

type FormState = {
  name: string;
  type: LiabilityType | "";
  currency: Currency;
  lender: string;
  originalAmount: string;
  outstandingBalance: string;
  interestRate: string;
  monthlyEMI: string;
  startDate: string;
  endDate: string;
  notes: string;
};

const INITIAL_FORM: FormState = {
  name: "",
  type: "",
  currency: Currency.INR,
  lender: "",
  originalAmount: "",
  outstandingBalance: "",
  interestRate: "",
  monthlyEMI: "",
  startDate: new Date().toISOString().slice(0, 10),
  endDate: "",
  notes: "",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AddLiabilityPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const isCreditCard = form.type === LiabilityType.CREDIT_CARD;
  const isInformal = form.type === LiabilityType.INFORMAL;

  function set(key: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) errs.name = "Required";
    if (!form.type) errs.type = "Required";
    if (!form.lender.trim()) errs.lender = "Required";
    if (!form.originalAmount || parseFloat(form.originalAmount) <= 0)
      errs.originalAmount = "Must be a positive number";
    if (form.outstandingBalance !== "" && parseFloat(form.outstandingBalance) < 0)
      errs.outstandingBalance = "Must be non-negative";
    if (!form.startDate) errs.startDate = "Required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    startTransition(async () => {
      try {
        const origAmt = parseFloat(form.originalAmount);
        const outstanding =
          form.outstandingBalance !== "" ? parseFloat(form.outstandingBalance) : origAmt;

        const result = await createLiability({
          name: form.name.trim(),
          type: form.type,
          currency: form.currency,
          lender: form.lender.trim(),
          originalAmount: origAmt,
          outstandingBalance: outstanding,
          interestRate: form.interestRate ? parseFloat(form.interestRate) : undefined,
          monthlyEMI: form.monthlyEMI ? parseFloat(form.monthlyEMI) : undefined,
          startDate: new Date(form.startDate),
          endDate: form.endDate ? new Date(form.endDate) : undefined,
          notes: form.notes.trim() || undefined,
        });

        if (result && "error" in result && result.error) {
          toast.error("Validation failed. Check the form.");
          return;
        }
        toast.success("Liability added");
        router.push("/liabilities");
      } catch {
        toast.error("Failed to save. Please try again.");
      }
    });
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
        <div>
          <h1 className="text-lg font-semibold leading-snug">Add Liability</h1>
          <p className="text-xs text-muted-foreground">Track a new loan, credit card, or debt</p>
        </div>
      </div>

      {/* ── Basic info ── */}
      <SectionCard title="Basic Info">
        <Field label="Liability Name" error={errors.name}>
          <Input
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="e.g. Home Loan — SBI, HDFC Credit Card"
            className={`h-10 ${errors.name ? "border-destructive" : ""}`}
            autoFocus
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Type" error={errors.type}>
            <Select
              value={form.type || "none"}
              onValueChange={(v) => set("type", !v || v === "none" ? "" : v)}
            >
              <SelectTrigger className={`h-10 ${errors.type ? "border-destructive" : ""}`}>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(LiabilityType).map((t) => (
                  <SelectItem key={t} value={t}>
                    {LIABILITY_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Currency">
            <Select
              value={form.currency}
              onValueChange={(v) => set("currency", v ?? Currency.INR)}
            >
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={Currency.INR}>₹ INR</SelectItem>
                <SelectItem value={Currency.USD}>$ USD</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Field label="Lender / Creditor" error={errors.lender}>
          <Input
            value={form.lender}
            onChange={(e) => set("lender", e.target.value)}
            placeholder={isInformal ? "e.g. John (friend)" : "e.g. SBI, HDFC Bank"}
            className={`h-10 ${errors.lender ? "border-destructive" : ""}`}
          />
        </Field>
      </SectionCard>

      {/* ── Amounts ── */}
      <SectionCard title="Amounts">
        <div className="grid grid-cols-2 gap-4">
          <Field
            label={`${isCreditCard ? "Credit Limit" : "Original Amount"} (${form.currency === Currency.USD ? "$" : "₹"})`}
            error={errors.originalAmount}
          >
            <Input
              type="number"
              min="0"
              step="any"
              value={form.originalAmount}
              onChange={(e) => set("originalAmount", e.target.value)}
              placeholder="0.00"
              className={`h-10 font-mono ${errors.originalAmount ? "border-destructive" : ""}`}
            />
          </Field>

          <Field
            label="Outstanding Balance"
            optional
            hint="Defaults to original amount if blank"
            error={errors.outstandingBalance}
          >
            <Input
              type="number"
              min="0"
              step="any"
              value={form.outstandingBalance}
              onChange={(e) => set("outstandingBalance", e.target.value)}
              placeholder={form.originalAmount || "0.00"}
              className={`h-10 font-mono ${errors.outstandingBalance ? "border-destructive" : ""}`}
            />
          </Field>
        </div>

        {/* Live preview when outstanding < original */}
        {form.originalAmount && form.outstandingBalance &&
          parseFloat(form.outstandingBalance) < parseFloat(form.originalAmount) && (
          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
            <span className="text-sm text-muted-foreground">Already paid</span>
            <span className="font-mono text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              {form.currency === Currency.USD ? "$" : "₹"}
              {(parseFloat(form.originalAmount) - parseFloat(form.outstandingBalance)).toLocaleString(
                form.currency === Currency.USD ? "en-US" : "en-IN",
                { maximumFractionDigits: 0 }
              )}
            </span>
          </div>
        )}
      </SectionCard>

      {/* ── Terms ── */}
      <SectionCard title="Terms">
        <div className="grid grid-cols-2 gap-4">
          <Field
            label={`Interest Rate (% p.a.)`}
            optional
            hint={isInformal ? "Often not applicable for informal loans" : undefined}
          >
            <Input
              type="number"
              min="0"
              max="100"
              step="any"
              value={form.interestRate}
              onChange={(e) => set("interestRate", e.target.value)}
              placeholder="e.g. 8.5"
              className="h-10 font-mono"
            />
          </Field>

          <Field
            label={`Monthly EMI (${form.currency === Currency.USD ? "$" : "₹"})`}
            optional
            hint={isCreditCard ? "Leave blank for revolving credit" : undefined}
          >
            <Input
              type="number"
              min="0"
              step="any"
              value={form.monthlyEMI}
              onChange={(e) => set("monthlyEMI", e.target.value)}
              placeholder="0.00"
              className="h-10 font-mono"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Start Date" error={errors.startDate}>
            <Input
              type="date"
              value={form.startDate}
              onChange={(e) => set("startDate", e.target.value)}
              className={`h-10 ${errors.startDate ? "border-destructive" : ""}`}
            />
          </Field>

          <Field label="Expected End Date" optional>
            <Input
              type="date"
              value={form.endDate}
              onChange={(e) => set("endDate", e.target.value)}
              className="h-10"
            />
          </Field>
        </div>
      </SectionCard>

      {/* ── Notes ── */}
      <SectionCard title="Notes">
        <Field label="Notes" optional>
          <Input
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="e.g. Consolidated loan, variable rate after 3 years"
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
          {isPending ? "Saving…" : "Add Liability"}
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
