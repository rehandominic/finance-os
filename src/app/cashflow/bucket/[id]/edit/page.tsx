"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { getBudgetBucket, updateBudgetBucket } from "@/app/cashflow/actions";
import { BucketType, Currency } from "@/lib/enums";
import { BUCKET_TYPE_LABELS, BUCKET_TYPE_CHART_COLORS } from "@/lib/types";
import type { SerializedBudgetBucket } from "@/lib/types";

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

const COLOR_OPTIONS = [
  { value: "", label: "Use type default" },
  { value: "#f43f5e", label: "Rose" },
  { value: "#3b82f6", label: "Blue" },
  { value: "#8b5cf6", label: "Violet" },
  { value: "#f97316", label: "Orange" },
  { value: "#f59e0b", label: "Amber" },
  { value: "#10b981", label: "Emerald" },
  { value: "#14b8a6", label: "Teal" },
  { value: "#64748b", label: "Slate" },
];

export default function EditBucketPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [isPending, startTransition] = useTransition();
  const [bucket, setBucket] = useState<SerializedBudgetBucket | null>(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [type, setType] = useState<BucketType>(BucketType.OTHER);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>(Currency.INR);
  const [color, setColor] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    getBudgetBucket(id).then((b) => {
      if (b) {
        setBucket(b);
        setName(b.name);
        setType(b.type);
        setAmount(String(b.amount));
        setCurrency(b.currency);
        setColor(b.color ?? "");
        setNotes(b.notes ?? "");
      }
      setLoading(false);
    });
  }, [id]);

  if (loading) return <div className="max-w-lg mx-auto pb-10 pt-6"><p className="text-sm text-muted-foreground">Loading…</p></div>;
  if (!bucket) return <div className="max-w-lg mx-auto pb-10 pt-6"><p className="text-sm text-destructive">Not found.</p></div>;

  const dotColor = color || BUCKET_TYPE_CHART_COLORS[type];
  const sym = currency === Currency.USD ? "$" : "₹";

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
        const result = await updateBudgetBucket(id, {
          name: name.trim(),
          type,
          amount: parseFloat(amount),
          currency,
          color: color || undefined,
          order: bucket?.order ?? 0,
          notes: notes.trim() || undefined,
        });
        if (result && "error" in result && result.error) {
          toast.error("Validation failed.");
          return;
        }
        toast.success("Bucket updated");
        router.push("/cashflow");
      } catch {
        toast.error("Failed to save.");
      }
    });
  }

  return (
    <div className="max-w-lg mx-auto pb-10" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div className="flex items-center gap-3 pt-1">
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 -ml-1" onClick={() => router.push("/cashflow")}>
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Back</span>
        </Button>
        <div className="min-w-0">
          <h1 className="text-lg font-semibold leading-snug truncate">{bucket.name}</h1>
          <p className="text-xs text-muted-foreground">Edit budget bucket</p>
        </div>
      </div>

      <SectionCard title="Bucket Details">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Category">
            <Select value={type} onValueChange={(v) => setType(v as BucketType)}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.values(BucketType).map((t) => (
                  <SelectItem key={t} value={t}>{BUCKET_TYPE_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Currency">
            <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={Currency.INR}>₹ INR</SelectItem>
                <SelectItem value={Currency.USD}>$ USD</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Field label="Name" error={errors.name}>
          <Input value={name} onChange={(e) => { setName(e.target.value); setErrors({}); }} className={`h-10 ${errors.name ? "border-destructive" : ""}`} autoFocus />
        </Field>

        <Field label={`Monthly Amount (${sym})`} error={errors.amount}>
          <Input type="number" min="0" step="any" value={amount} onChange={(e) => { setAmount(e.target.value); setErrors({}); }} className={`h-10 font-mono ${errors.amount ? "border-destructive" : ""}`} />
        </Field>

        <Field label="Colour" optional hint="Overrides the category default colour on the allocation bar">
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            {COLOR_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setColor(opt.value)}
                title={opt.label}
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  backgroundColor: opt.value || dotColor,
                  border: color === opt.value ? "2px solid hsl(var(--foreground))" : "2px solid transparent",
                  cursor: "pointer",
                  flexShrink: 0,
                  opacity: opt.value === "" ? 0.4 : 1,
                  outline: "1px solid hsl(var(--border))",
                }}
              />
            ))}
          </div>
        </Field>

        <Field label="Notes" optional>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} className="h-10" />
        </Field>
      </SectionCard>

      <div className="flex flex-col gap-3" style={{ paddingTop: "8px" }}>
        <Button className="w-full" style={{ height: "48px", fontSize: "15px" }} onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Saving…" : "Save Changes"}
        </Button>
        <Button variant="outline" className="w-full" style={{ height: "48px", fontSize: "15px" }} onClick={() => router.push("/cashflow")} disabled={isPending}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
