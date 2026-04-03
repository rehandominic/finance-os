"use client";

import { useState } from "react";
import { X, TrendingUp } from "lucide-react";
import { ValuationSource } from "@/lib/enums";
import { createValuationEntry } from "@/app/assets/actions";
import type { AssetWithValuations } from "@/lib/types";

interface Props {
  asset: AssetWithValuations | null;
  onClose: () => void;
  onSaved: (updatedAsset: AssetWithValuations) => void;
}

const FIELD_STYLE: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  fontSize: "13px",
  borderRadius: "8px",
  border: "1px solid hsl(var(--border))",
  backgroundColor: "hsl(var(--background))",
  color: "hsl(var(--foreground))",
  outline: "none",
};

const LABEL_CLASS = "text-xs font-semibold uppercase tracking-wider text-muted-foreground";

function fmtINR(v: number) {
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)}Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(2)}L`;
  return `₹${Math.round(v).toLocaleString("en-IN")}`;
}

export function UpdateValuationSheet({ asset, onClose, onSaved }: Props) {
  const [value, setValue] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    setValue(""); setDate(new Date().toISOString().slice(0, 10));
    setNotes(""); setError(null);
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!asset) return;
    setSaving(true);
    setError(null);

    const result = await createValuationEntry({
      assetId: asset.id,
      date: new Date(date),
      value: parseFloat(value),
      source: ValuationSource.MANUAL,
      notes: notes || undefined,
    });

    setSaving(false);
    if (result.error) {
      setError("Please check the values and try again.");
    } else {
      // Build updated asset with new currentValue and prepended valuation
      const newEntry = result.data!;
      const updated: AssetWithValuations = {
        ...asset,
        currentValue: parseFloat(value),
        appreciation: parseFloat(value) - asset.purchasePrice,
        appreciationPercent: ((parseFloat(value) - asset.purchasePrice) / asset.purchasePrice) * 100,
        valuations: [
          {
            id: newEntry.id,
            assetId: newEntry.assetId,
            date: newEntry.date instanceof Date ? newEntry.date.toISOString() : String(newEntry.date),
            value: newEntry.value,
            source: newEntry.source as AssetWithValuations["valuations"][0]["source"],
            notes: newEntry.notes ?? null,
            createdAt: newEntry.createdAt instanceof Date ? newEntry.createdAt.toISOString() : String(newEntry.createdAt),
          },
          ...asset.valuations,
        ],
      };
      onSaved(updated);
      handleClose();
    }
  }

  if (!asset) return null;

  const newVal = parseFloat(value) || 0;
  const diff = newVal - asset.currentValue;
  const diffPct = asset.currentValue > 0 ? (diff / asset.currentValue) * 100 : 0;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", justifyContent: "flex-end" }}>
      <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.4)" }} onClick={handleClose} />
      <div style={{
        position: "relative", zIndex: 51,
        width: "100%", maxWidth: "400px",
        backgroundColor: "hsl(var(--card))",
        borderLeft: "1px solid hsl(var(--border))",
        height: "100%", overflowY: "auto",
        padding: "24px",
        display: "flex", flexDirection: "column", gap: "0",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Update Value</p>
            <h2 className="text-base font-semibold text-foreground" style={{ marginTop: "2px", maxWidth: "280px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {asset.name}
            </h2>
          </div>
          <button onClick={handleClose} style={{ padding: "6px", borderRadius: "6px", cursor: "pointer", background: "none", border: "none" }}>
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Current value chip */}
        <div style={{ padding: "12px 16px", borderRadius: "10px", border: "1px solid hsl(var(--border))", marginBottom: "20px" }}>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold" style={{ marginBottom: "4px" }}>Current Value</p>
          <p className="font-mono text-xl font-semibold text-foreground">{fmtINR(asset.currentValue)}</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label className={LABEL_CLASS}>New Value ({asset.currency})</label>
            <input required type="number" min="0" step="any" value={value} onChange={e => setValue(e.target.value)} placeholder="Enter updated value" style={{ ...FIELD_STYLE, fontSize: "16px", fontWeight: 600 }} />
            {newVal > 0 && (
              <p style={{ fontSize: "11px", color: diff >= 0 ? "hsl(142,70%,45%)" : "hsl(0,70%,55%)", fontFamily: "var(--font-geist-mono), monospace" }}>
                {diff >= 0 ? "▲" : "▼"} {fmtINR(Math.abs(diff))} ({diffPct >= 0 ? "+" : ""}{diffPct.toFixed(1)}%) vs current
              </p>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label className={LABEL_CLASS}>Valuation Date</label>
            <input required type="date" value={date} onChange={e => setDate(e.target.value)} style={FIELD_STYLE} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label className={LABEL_CLASS}>Notes (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="e.g. Based on recent market rates" style={{ ...FIELD_STYLE, resize: "vertical" }} />
          </div>

          {error && <p style={{ fontSize: "12px", color: "hsl(var(--destructive))" }}>{error}</p>}

          <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
            <button type="button" onClick={handleClose} style={{ flex: 1, padding: "10px", borderRadius: "8px", fontSize: "13px", fontWeight: 500, cursor: "pointer", border: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))", color: "hsl(var(--foreground))" }}>
              Cancel
            </button>
            <button type="submit" disabled={saving} style={{ flex: 1, padding: "10px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", border: "none", backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", opacity: saving ? 0.7 : 1 }}>
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                <TrendingUp className="h-3.5 w-3.5" />
                {saving ? "Saving…" : "Update Value"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
