"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, TrendingUp, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AssetWithValuations } from "@/lib/types";
import { ASSET_TYPE_LABELS, ASSET_TYPE_COLORS } from "@/lib/types";
import { Currency } from "@/lib/enums";
import { deleteAsset, deleteValuationEntry } from "@/app/assets/actions";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";

function fmtINR(v: number): string {
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)}Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(2)}L`;
  return `₹${Math.round(v).toLocaleString("en-IN")}`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// ─── Expanded row ─────────────────────────────────────────────────────────────

function ExpandedRow({
  asset,
  onAssetDeleted,
  onAssetUpdated,
}: {
  asset: AssetWithValuations;
  onAssetDeleted: (id: string) => void;
  onAssetUpdated: (a: AssetWithValuations) => void;
}) {
  const router = useRouter();
  const [deletingValId, setDeletingValId] = useState<string | null>(null);
  const [deletingAsset, setDeletingAsset] = useState(false);

  const chartData = asset.valuations
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((v) => ({
      label: new Date(v.date).toLocaleDateString("en-IN", { month: "short", year: "2-digit" }),
      value: v.value,
    }));

  async function handleDeleteVal(id: string) {
    if (!confirm("Remove this valuation entry?")) return;
    setDeletingValId(id);
    await deleteValuationEntry(id, asset.id);
    setDeletingValId(null);
    const updated: AssetWithValuations = {
      ...asset,
      valuations: asset.valuations.filter((v) => v.id !== id),
    };
    const latest = updated.valuations[0];
    if (latest) {
      updated.currentValue = latest.value;
      updated.appreciation = latest.value - asset.purchasePrice;
      updated.appreciationPercent = ((latest.value - asset.purchasePrice) / asset.purchasePrice) * 100;
    }
    onAssetUpdated(updated);
  }

  async function handleDeleteAsset() {
    if (!confirm(`Delete "${asset.name}" and all its valuations? This cannot be undone.`)) return;
    setDeletingAsset(true);
    await deleteAsset(asset.id);
    onAssetDeleted(asset.id);
  }

  const isProperty = asset.type === "PROPERTY";
  const isVehicle = asset.type === "VEHICLE";
  const isFD = asset.type === "CASH_FD";
  const isGold = asset.type === "GOLD_METALS";

  return (
    <tr>
      <td colSpan={8} style={{ padding: 0, borderBottom: "1px solid hsl(var(--border))" }}>
        <div style={{ backgroundColor: "hsl(var(--muted)/0.3)", padding: "20px 24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>

          {/* Left: Valuation history */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground" style={{ marginBottom: "12px" }}>
              Valuation History
            </p>

            {chartData.length >= 2 && (
              <div style={{ marginBottom: "16px" }}>
                <ResponsiveContainer width="100%" height={100}>
                  <AreaChart data={chartData} margin={{ top: 2, right: 4, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id={`grad-${asset.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="label" tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                    <YAxis hide />
                    <Tooltip
                      content={({ active, payload }) =>
                        active && payload?.length ? (
                          <div className="rounded border bg-popover text-xs shadow" style={{ padding: "6px 10px" }}>
                            <p className="font-mono font-medium">{fmtINR(payload[0].value as number)}</p>
                          </div>
                        ) : null
                      }
                    />
                    <Area type="step" dataKey="value" stroke="#10b981" strokeWidth={1.5} fill={`url(#grad-${asset.id})`} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {asset.valuations.slice(0, 8).map((v) => (
                <div key={v.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px", borderRadius: "6px", backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
                  <div>
                    <span className="font-mono text-xs font-medium text-foreground">{fmtINR(v.value)}</span>
                    <span className="text-xs text-muted-foreground" style={{ marginLeft: "8px" }}>{fmtDate(v.date)}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "9px", padding: "2px 6px", borderRadius: "4px", backgroundColor: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))", fontWeight: 500 }}>
                      {v.source.replace(/_/g, " ")}
                    </span>
                    {v.source === "MANUAL" && (
                      <button
                        onClick={() => handleDeleteVal(v.id)}
                        disabled={deletingValId === v.id}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: "2px", opacity: deletingValId === v.id ? 0.4 : 1 }}
                      >
                        <Trash2 className="h-3 w-3 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {asset.valuations.length > 8 && (
                <p className="text-xs text-muted-foreground" style={{ paddingLeft: "4px" }}>+{asset.valuations.length - 8} more entries</p>
              )}
            </div>
          </div>

          {/* Right: Asset details */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground" style={{ marginBottom: "12px" }}>
              Asset Details
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <DetailRow label="Purchase Date" value={fmtDate(asset.purchaseDate)} />
              <DetailRow label="Purchase Price" value={fmtINR(asset.purchasePrice)} />
              <DetailRow label="Current Value" value={fmtINR(asset.currentValue)} />
              <DetailRow
                label="Appreciation"
                value={`${fmtINR(Math.abs(asset.appreciation))} (${asset.appreciation >= 0 ? "+" : "-"}${Math.abs(asset.appreciationPercent).toFixed(1)}%)`}
                valueClass={asset.appreciation >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}
              />
              {asset.currency !== "INR" && <DetailRow label="Currency" value={asset.currency} />}
              {isProperty && asset.location && <DetailRow label="Location" value={asset.location} />}
              {(isProperty || isGold) && asset.areaQty && asset.areaUnit && (
                <DetailRow label="Quantity" value={`${asset.areaQty} ${asset.areaUnit}`} />
              )}
              {isVehicle && asset.depreciationRate && (
                <DetailRow label="Depreciation Rate" value={`${asset.depreciationRate}% p.a.`} />
              )}
              {isFD && asset.principal && <DetailRow label="Principal" value={fmtINR(asset.principal)} />}
              {isFD && asset.interestRate && <DetailRow label="Interest Rate" value={`${asset.interestRate}% p.a.`} />}
              {isFD && asset.maturityDate && <DetailRow label="Maturity Date" value={fmtDate(asset.maturityDate)} />}
              {asset.notes && <DetailRow label="Notes" value={asset.notes} />}
            </div>

            {/* Actions */}
            <div style={{ marginTop: "16px", display: "flex", gap: "8px" }}>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => router.push(`/assets/${asset.id}/update-valuation`)}
              >
                <TrendingUp className="h-3.5 w-3.5" />
                Update Value
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => router.push(`/assets/${asset.id}/edit`)}
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-destructive hover:text-destructive border-destructive/30 hover:border-destructive/60 hover:bg-destructive/5"
                onClick={handleDeleteAsset}
                disabled={deletingAsset}
              >
                <Trash2 className="h-3.5 w-3.5" />
                {deletingAsset ? "Deleting…" : "Delete Asset"}
              </Button>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}

function DetailRow({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-xs font-medium text-foreground font-mono ${valueClass ?? ""}`} style={{ textAlign: "right", maxWidth: "200px" }}>{value}</span>
    </div>
  );
}

// ─── Main table ───────────────────────────────────────────────────────────────

interface Props {
  assets: AssetWithValuations[];
  onAssetDeleted: (id: string) => void;
  onAssetUpdated: (a: AssetWithValuations) => void;
  fmtDisplay: (v: number, fromCurrency: Currency) => string;
}

const TH_STYLE: React.CSSProperties = {
  padding: "10px 14px",
  fontSize: "10px",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: "hsl(var(--muted-foreground))",
  textAlign: "left",
  borderBottom: "1px solid hsl(var(--border))",
  whiteSpace: "nowrap",
  backgroundColor: "hsl(var(--card))",
};

const TD_STYLE: React.CSSProperties = {
  padding: "12px 14px",
  fontSize: "13px",
  borderBottom: "1px solid hsl(var(--border))",
  verticalAlign: "middle",
};

export function AssetsTable({ assets, onAssetDeleted, onAssetUpdated, fmtDisplay }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function toggle(id: string) {
    setExpandedId((cur) => (cur === id ? null : id));
  }

  if (assets.length === 0) {
    return (
      <div style={{ padding: "48px", textAlign: "center" }}>
        <p className="text-sm text-muted-foreground">No assets found. Add your first asset to get started.</p>
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto", borderRadius: "0.75rem", border: "1px solid hsl(var(--border))" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
        <thead>
          <tr>
            <th style={{ ...TH_STYLE, width: "32px" }} />
            <th style={{ ...TH_STYLE }}>Name</th>
            <th style={{ ...TH_STYLE }}>Type</th>
            <th style={{ ...TH_STYLE }}>Purchase Date</th>
            <th style={{ ...TH_STYLE, textAlign: "right" }}>Cost Basis</th>
            <th style={{ ...TH_STYLE, textAlign: "right" }}>Current Value</th>
            <th style={{ ...TH_STYLE, textAlign: "right" }}>Appreciation</th>
            <th style={{ ...TH_STYLE }}>Last Updated</th>
          </tr>
        </thead>
        <tbody>
          {assets.map((asset) => {
            const isExpanded = expandedId === asset.id;
            return (
              <React.Fragment key={asset.id}>
                <tr
                  style={{ cursor: "pointer", backgroundColor: isExpanded ? "hsl(var(--muted)/0.3)" : undefined }}
                  onClick={() => toggle(asset.id)}
                >
                  <td style={{ ...TD_STYLE, width: "32px", paddingRight: "4px" }}>
                    {isExpanded ? (
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </td>
                  <td style={TD_STYLE}>
                    <span className="font-medium text-foreground" style={{ display: "block", maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={asset.name}>
                      {asset.name}
                    </span>
                    {asset.description && (
                      <span className="text-xs text-muted-foreground" style={{ display: "block", maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {asset.description}
                      </span>
                    )}
                  </td>
                  <td style={TD_STYLE}>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ASSET_TYPE_COLORS[asset.type]}`}>
                      {ASSET_TYPE_LABELS[asset.type]}
                    </span>
                  </td>
                  <td style={{ ...TD_STYLE, color: "hsl(var(--muted-foreground))", fontSize: "12px" }}>
                    {fmtDate(asset.purchaseDate)}
                  </td>
                  <td style={{ ...TD_STYLE, textAlign: "right", fontFamily: "var(--font-geist-mono), monospace" }}>
                    {fmtDisplay(asset.purchasePrice, asset.currency as Currency)}
                  </td>
                  <td style={{ ...TD_STYLE, textAlign: "right", fontFamily: "var(--font-geist-mono), monospace", fontWeight: 600 }}>
                    {fmtDisplay(asset.currentValue, asset.currency as Currency)}
                  </td>
                  <td style={{ ...TD_STYLE, textAlign: "right", fontFamily: "var(--font-geist-mono), monospace" }}>
                    <span style={{ color: asset.appreciation >= 0 ? "hsl(142,70%,45%)" : "hsl(0,70%,55%)" }}>
                      {asset.appreciation >= 0 ? "+" : ""}
                      {asset.appreciationPercent.toFixed(1)}%
                    </span>
                    <span className="text-muted-foreground" style={{ display: "block", fontSize: "11px" }}>
                      {asset.appreciation >= 0 ? "+" : ""}{fmtDisplay(Math.abs(asset.appreciation), asset.currency as Currency)}
                    </span>
                  </td>
                  <td style={{ ...TD_STYLE, color: "hsl(var(--muted-foreground))", fontSize: "12px" }}>
                    {fmtDate(asset.valuations[0]?.date ?? asset.updatedAt)}
                  </td>
                </tr>
                {isExpanded && (
                  <ExpandedRow
                    asset={asset}
                    onAssetDeleted={onAssetDeleted}
                    onAssetUpdated={onAssetUpdated}
                  />
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
