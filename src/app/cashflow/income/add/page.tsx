"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { createIncomeSource } from "@/app/cashflow/actions";
import { Currency } from "@/lib/enums";

function Label({ children, optional }: { children: React.ReactNode; optional?: boolean }) {
  return (
    <span className="text-sm font-medium text-foreground">
      {children}
      {optional && <span className="text-xs text-muted-foreground font-normal ml-1">(optional)</span>}
    </span>
  );
}

function Field({ label, optional, error, hint, children }: {
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

export default function AddIncomeSourcePage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>(Currency.INR);
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Required";
    if (!amount || parseFloat(amount) <= 0) errs.amount = "Must be a positive number";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    startTransition(async () => {
      try {
        const result = await createIncomeSource({
          name: name.trim(),
          amount: parseFloat(amount),
          currency,
          notes: notes.trim() || undefined,
        });
        if (result && "error" in result && result.error) {
          toast.error("Validation failed.");
          return;
        }
        toast.success("Income source added");
        router.push("/cashflow");
      } catch {
        toast.error("Failed to save. Please try again.");
      }
    });
  }

  const sym = currency === Currency.USD ? "$" : "₹";

  return (
    <div className="max-w-lg mx-auto pb-10" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div className="flex items-center gap-3 pt-1">
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 -ml-1" onClick={() => router.push("/cashflow")}>
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Back</span>
        </Button>
        <div>
          <h1 className="text-lg font-semibold leading-snug">Add Income Source</h1>
          <p className="text-xs text-muted-foreground">Salary, freelance, rental, or any recurring inflow</p>
        </div>
      </div>

      <SectionCard title="Income Details">
        <Field label="Name" error={errors.name}>
          <Input
            value={name}
            onChange={(e) => { setName(e.target.value); setErrors({}); }}
            placeholder="e.g. Salary — Acme Corp, Freelance, Rental Income"
            className={`h-10 ${errors.name ? "border-destructive" : ""}`}
            autoFocus
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label={`Monthly Amount (${sym})`} error={errors.amount}>
            <Input
              type="number"
              min="0"
              step="any"
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setErrors({}); }}
              placeholder="0.00"
              className={`h-10 font-mono ${errors.amount ? "border-destructive" : ""}`}
            />
          </Field>

          <Field label="Currency">
            <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
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

        <Field label="Notes" optional>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Net take-home after tax"
            className="h-10"
          />
        </Field>
      </SectionCard>

      <div className="flex flex-col gap-3" style={{ paddingTop: "8px" }}>
        <Button className="w-full" style={{ height: "48px", fontSize: "15px" }} onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Saving…" : "Add Income Source"}
        </Button>
        <Button variant="outline" className="w-full" style={{ height: "48px", fontSize: "15px" }} onClick={() => router.push("/cashflow")} disabled={isPending}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
