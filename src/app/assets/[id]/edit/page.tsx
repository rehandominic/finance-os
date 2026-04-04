"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAsset, updateAsset } from "@/app/assets/actions";
import type { AssetWithValuations } from "@/lib/types";

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

export default function EditAssetPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [isPending, startTransition] = useTransition();
  const [asset, setAsset] = useState<AssetWithValuations | null>(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [expectedCagr, setExpectedCagr] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    getAsset(id).then((a) => {
      if (a) {
        setAsset(a);
        setName(a.name);
        setDescription(a.description ?? "");
        setNotes(a.notes ?? "");
        setExpectedCagr(a.expectedCagr != null ? String(a.expectedCagr) : "");
      }
      setLoading(false);
    });
  }, [id]);

  if (loading) return <div className="max-w-lg mx-auto pb-10 pt-6"><p className="text-sm text-muted-foreground">Loading…</p></div>;
  if (!asset) return <div className="max-w-lg mx-auto pb-10 pt-6"><p className="text-sm text-destructive">Not found.</p></div>;

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    startTransition(async () => {
      try {
        const result = await updateAsset(id, {
          name: name.trim(),
          description: description.trim() || undefined,
          type: asset!.type,
          currency: asset!.currency,
          purchaseDate: new Date(asset!.purchaseDate),
          purchasePrice: asset!.purchasePrice,
          currentValue: asset!.currentValue,
          notes: notes.trim() || undefined,
          location: asset!.location ?? undefined,
          areaQty: asset!.areaQty ?? undefined,
          areaUnit: asset!.areaUnit ?? undefined,
          depreciationRate: asset!.depreciationRate ?? undefined,
          interestRate: asset!.interestRate ?? undefined,
          maturityDate: asset!.maturityDate ? new Date(asset!.maturityDate) : undefined,
          principal: asset!.principal ?? undefined,
          expectedCagr: expectedCagr ? Number(expectedCagr) : undefined,
        });
        if (result && "error" in result && result.error) {
          toast.error("Validation failed.");
          return;
        }
        toast.success("Asset updated");
        router.push("/assets");
      } catch {
        toast.error("Failed to save.");
      }
    });
  }

  return (
    <div className="max-w-lg mx-auto pb-10" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div className="flex items-center gap-3 pt-1">
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 -ml-1" onClick={() => router.push("/assets")}>
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Back</span>
        </Button>
        <div className="min-w-0">
          <h1 className="text-lg font-semibold leading-snug truncate">{asset.name}</h1>
          <p className="text-xs text-muted-foreground">Edit asset details</p>
        </div>
      </div>

      <SectionCard title="Asset Details">
        <Field label="Name" error={errors.name}>
          <Input
            value={name}
            onChange={(e) => { setName(e.target.value); setErrors({}); }}
            className={`h-10 ${errors.name ? "border-destructive" : ""}`}
            autoFocus
          />
        </Field>

        <Field label="Description" optional>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} className="h-10" />
        </Field>

        <Field label="Notes" optional>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} className="h-10" />
        </Field>

        <Field
          label="Expected Annual Growth (% CAGR)"
          optional
          hint="Used in the Wealth Projector to compound this asset independently of your investment portfolio"
        >
          <Input
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={expectedCagr}
            onChange={(e) => setExpectedCagr(e.target.value)}
            placeholder="e.g. 8 for property, 7 for gold"
            className="h-10 font-mono"
          />
        </Field>
      </SectionCard>

      <div className="flex flex-col gap-3" style={{ paddingTop: "8px" }}>
        <Button className="w-full" style={{ height: "48px", fontSize: "15px" }} onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Saving…" : "Save Changes"}
        </Button>
        <Button variant="outline" className="w-full" style={{ height: "48px", fontSize: "15px" }} onClick={() => router.push("/assets")} disabled={isPending}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
