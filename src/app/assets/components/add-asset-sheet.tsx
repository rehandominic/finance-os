"use client";

import { useState } from "react";
import { X, Plus } from "lucide-react";
import { AssetType, Currency } from "@/lib/enums";
import { ASSET_TYPE_LABELS } from "@/lib/types";
import { createAsset } from "@/app/assets/actions";
import type { AssetWithValuations } from "@/lib/types";

const CURRENCIES = ["INR", "USD"];

const AREA_UNITS_BY_TYPE: Record<string, string[]> = {
  PROPERTY: ["sq.ft", "acres", "cents"],
  GOLD_METALS: ["grams", "kg", "oz", "tola"],
  ART_COLLECTIBLES: ["pieces"],
};

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (asset: AssetWithValuations) => void;
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <label className={LABEL_CLASS}>{label}</label>
      {children}
    </div>
  );
}

export function AddAssetSheet({ open, onClose, onCreated }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<string>(AssetType.PROPERTY);
  const [currency, setCurrency] = useState("INR");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [currentValue, setCurrentValue] = useState("");
  const [notes, setNotes] = useState("");

  // Property
  const [location, setLocation] = useState("");
  const [areaQty, setAreaQty] = useState("");
  const [areaUnit, setAreaUnit] = useState("");

  // Vehicle
  const [depreciationRate, setDepreciationRate] = useState("");

  // Cash / FD
  const [interestRate, setInterestRate] = useState("");
  const [maturityDate, setMaturityDate] = useState("");
  const [principal, setPrincipal] = useState("");

  function reset() {
    setName(""); setDescription(""); setType(AssetType.PROPERTY); setCurrency("INR");
    setPurchaseDate(""); setPurchasePrice(""); setCurrentValue(""); setNotes("");
    setLocation(""); setAreaQty(""); setAreaUnit("");
    setDepreciationRate("");
    setInterestRate(""); setMaturityDate(""); setPrincipal("");
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload: Record<string, unknown> = {
      name, description: description || undefined, type, currency,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined,
      purchasePrice: parseFloat(purchasePrice) || undefined,
      currentValue: currentValue ? parseFloat(currentValue) : (parseFloat(purchasePrice) || undefined),
      notes: notes || undefined,
    };

    if (type === AssetType.PROPERTY) {
      if (location) payload.location = location;
      if (areaQty) payload.areaQty = parseFloat(areaQty);
      if (areaUnit) payload.areaUnit = areaUnit;
    }
    if (type === AssetType.GOLD_METALS || type === AssetType.ART_COLLECTIBLES) {
      if (areaQty) payload.areaQty = parseFloat(areaQty);
      if (areaUnit) payload.areaUnit = areaUnit;
    }
    if (type === AssetType.VEHICLE) {
      if (depreciationRate) payload.depreciationRate = parseFloat(depreciationRate);
    }
    if (type === AssetType.CASH_FD) {
      if (interestRate) payload.interestRate = parseFloat(interestRate);
      if (maturityDate) payload.maturityDate = new Date(maturityDate);
      if (principal) payload.principal = parseFloat(principal);
    }

    const result = await createAsset(payload);
    setSaving(false);

    if (result.error) {
      setError("Please check the fields and try again.");
    } else if (result.data) {
      onCreated(result.data);
      reset();
      onClose();
    }
  }

  const areaUnits = AREA_UNITS_BY_TYPE[type] ?? [];
  const showArea = (["PROPERTY", "GOLD_METALS", "ART_COLLECTIBLES"] as string[]).includes(type);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        display: "flex", justifyContent: "flex-end",
      }}
    >
      {/* Backdrop */}
      <div
        style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.4)" }}
        onClick={handleClose}
      />

      {/* Sheet */}
      <div
        style={{
          position: "relative", zIndex: 51,
          width: "100%", maxWidth: "480px",
          backgroundColor: "hsl(var(--card))",
          borderLeft: "1px solid hsl(var(--border))",
          height: "100%", overflowY: "auto",
          padding: "24px",
          display: "flex", flexDirection: "column", gap: "0",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Assets</p>
            <h2 className="text-lg font-semibold text-foreground" style={{ marginTop: "2px" }}>Add Asset</h2>
          </div>
          <button onClick={handleClose} style={{ padding: "6px", borderRadius: "6px", cursor: "pointer", background: "none", border: "none" }}>
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Type selector */}
          <Field label="Asset Type">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {Object.entries(ASSET_TYPE_LABELS).map(([k, v]) => (
                <button
                  key={k} type="button"
                  onClick={() => { setType(k); setAreaUnit(""); }}
                  style={{
                    padding: "8px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: 500,
                    cursor: "pointer", textAlign: "left",
                    border: `1px solid ${type === k ? "hsl(var(--primary))" : "hsl(var(--border))"}`,
                    backgroundColor: type === k ? "hsl(var(--primary)/0.08)" : "hsl(var(--background))",
                    color: type === k ? "hsl(var(--primary))" : "hsl(var(--foreground))",
                  }}
                >
                  {v}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Name">
            <input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Flat in Kochi" style={FIELD_STYLE} />
          </Field>

          <Field label="Description (optional)">
            <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description" style={FIELD_STYLE} />
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <Field label="Currency">
              <select value={currency} onChange={e => setCurrency(e.target.value)} style={FIELD_STYLE}>
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Purchase Date">
              <input required type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} style={FIELD_STYLE} />
            </Field>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <Field label="Purchase Price">
              <input required type="number" min="0" step="any" value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)} placeholder="0" style={FIELD_STYLE} />
            </Field>
            <Field label="Current Value">
              <input type="number" min="0" step="any" value={currentValue} onChange={e => setCurrentValue(e.target.value)} placeholder="Leave blank = purchase price" style={FIELD_STYLE} />
            </Field>
          </div>

          {/* Property fields */}
          {type === AssetType.PROPERTY && (
            <Field label="Location (optional)">
              <input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Kochi, Kerala" style={FIELD_STYLE} />
            </Field>
          )}

          {/* Area / Quantity */}
          {showArea && areaUnits.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <Field label="Quantity">
                <input type="number" min="0" step="any" value={areaQty} onChange={e => setAreaQty(e.target.value)} placeholder="0" style={FIELD_STYLE} />
              </Field>
              <Field label="Unit">
                <select value={areaUnit} onChange={e => setAreaUnit(e.target.value)} style={FIELD_STYLE}>
                  <option value="">— select —</option>
                  {areaUnits.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </Field>
            </div>
          )}

          {/* Vehicle fields */}
          {type === AssetType.VEHICLE && (
            <Field label="Annual Depreciation Rate (%)">
              <input type="number" min="0" max="100" step="0.1" value={depreciationRate} onChange={e => setDepreciationRate(e.target.value)} placeholder="e.g. 15" style={FIELD_STYLE} />
            </Field>
          )}

          {/* Cash / FD fields */}
          {type === AssetType.CASH_FD && (
            <>
              <Field label="Principal Amount">
                <input type="number" min="0" step="any" value={principal} onChange={e => setPrincipal(e.target.value)} placeholder="0" style={FIELD_STYLE} />
              </Field>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <Field label="Interest Rate (% p.a.)">
                  <input type="number" min="0" step="0.01" value={interestRate} onChange={e => setInterestRate(e.target.value)} placeholder="e.g. 7.5" style={FIELD_STYLE} />
                </Field>
                <Field label="Maturity Date">
                  <input type="date" value={maturityDate} onChange={e => setMaturityDate(e.target.value)} style={FIELD_STYLE} />
                </Field>
              </div>
            </>
          )}

          <Field label="Notes (optional)">
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Any additional notes" style={{ ...FIELD_STYLE, resize: "vertical" }} />
          </Field>

          {error && <p style={{ fontSize: "12px", color: "hsl(var(--destructive))" }}>{error}</p>}

          <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
            <button type="button" onClick={handleClose} style={{ flex: 1, padding: "10px", borderRadius: "8px", fontSize: "13px", fontWeight: 500, cursor: "pointer", border: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))", color: "hsl(var(--foreground))" }}>
              Cancel
            </button>
            <button type="submit" disabled={saving} style={{ flex: 1, padding: "10px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", border: "none", backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", opacity: saving ? 0.7 : 1 }}>
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                <Plus className="h-3.5 w-3.5" />
                {saving ? "Saving…" : "Add Asset"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
