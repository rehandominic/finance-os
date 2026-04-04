"use client";

import React, { useState } from "react";

export const CURRENT_YEAR = new Date().getFullYear();
// 11 columns: current year + 10 two-year steps → covers 20 years
export const YEARS = Array.from({ length: 11 }, (_, i) => CURRENT_YEAR + i * 2);
// 11 rows: 5% → 25% in 2% steps
export const RATES = [5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25];

export type AssetProjection = {
  id: string;
  name: string;
  currentValue: number;
  expectedCagr: number | null;
};

/** Compound assets independently at their own CAGRs */
export function projectAssets(assets: AssetProjection[], yearsAhead: number): number {
  return assets.reduce((sum, a) => {
    const cagr = a.expectedCagr ?? 0;
    return sum + a.currentValue * Math.pow(1 + cagr / 100, yearsAhead);
  }, 0);
}

/** Investment portfolio with annual contributions + yearly step-up */
export function projectInvestments(
  base: number,
  ratePercent: number,
  yearsAhead: number,
  monthlyContrib: number,
  stepUpPercent: number,
): number {
  if (yearsAhead === 0) return base;
  let value = base;
  let annualContrib = monthlyContrib * 12;
  for (let y = 1; y <= yearsAhead; y++) {
    value = value * (1 + ratePercent / 100) + annualContrib;
    annualContrib = annualContrib * (1 + stepUpPercent / 100);
  }
  return value;
}

/** Combined: investments (at scenario rate) + assets (at their own rates) */
export function projectValue(
  investmentsBase: number,
  rate: number,
  year: number,
  monthlyContrib: number,
  stepUp: number,
  assets: AssetProjection[],
): number {
  const yearsAhead = year - CURRENT_YEAR;
  return (
    projectInvestments(investmentsBase, rate, yearsAhead, monthlyContrib, stepUp) +
    projectAssets(assets, yearsAhead)
  );
}

export function fmtCompact(v: number): string {
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(1)}Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(1)}L`;
  if (v >= 1000) return `₹${Math.round(v).toLocaleString("en-IN")}`;
  return `₹${Math.round(v)}`;
}

function cellBg(multiple: number): React.CSSProperties {
  if (multiple <= 1.0) return {};
  if (multiple <= 1.5) return { backgroundColor: "rgba(16,185,129,0.06)" };
  if (multiple <= 2.0) return { backgroundColor: "rgba(16,185,129,0.13)" };
  if (multiple <= 3.0) return { backgroundColor: "rgba(16,185,129,0.22)" };
  if (multiple <= 5.0) return { backgroundColor: "rgba(16,185,129,0.34)" };
  if (multiple <= 8.0) return { backgroundColor: "rgba(16,185,129,0.48)" };
  return { backgroundColor: "rgba(16,185,129,0.64)" };
}

function cellTextClass(multiple: number): string {
  if (multiple >= 8) return "text-emerald-950 dark:text-emerald-50 font-semibold";
  if (multiple >= 5) return "text-emerald-900 dark:text-emerald-100";
  if (multiple >= 3) return "text-emerald-800 dark:text-emerald-200";
  if (multiple >= 2) return "text-emerald-700 dark:text-emerald-300";
  return "";
}

interface Props {
  portfolioValue: number;
  monthlyContrib: number;
  stepUp: number;
  assets: AssetProjection[];
  currentAge: number | null;
}

export function GrowthMatrix({ portfolioValue, monthlyContrib, stepUp, assets, currentAge }: Props) {
  const [hovered, setHovered] = useState<{ row: number; col: number } | null>(null);

  const cardBg = "hsl(var(--card))";
  const borderColor = "hsl(var(--border))";
  const CELL_PAD = "7px 10px";
  const HEADER_PAD = "8px 10px";

  // Base value = investments + assets at year 0
  const assetsCurrentTotal = assets.reduce((s, a) => s + a.currentValue, 0);
  const baseTotal = portfolioValue + assetsCurrentTotal;

  const thStyle: React.CSSProperties = {
    padding: HEADER_PAD,
    fontSize: "10px",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: "hsl(var(--muted-foreground))",
    whiteSpace: "nowrap",
    borderBottom: `1px solid ${borderColor}`,
    borderRight: `1px solid ${borderColor}`,
  };

  const cornerStyle: React.CSSProperties = {
    ...thStyle,
    position: "sticky",
    left: 0,
    top: 0,
    zIndex: 30,
    backgroundColor: cardBg,
    minWidth: "62px",
  };

  const colHeaderStyle: React.CSSProperties = {
    ...thStyle,
    position: "sticky",
    top: 0,
    zIndex: 20,
    backgroundColor: cardBg,
    textAlign: "right",
  };

  const rowHeaderStyle = (rateIdx: number): React.CSSProperties => ({
    padding: CELL_PAD,
    fontSize: "11px",
    fontWeight: 600,
    fontFamily: "var(--font-geist-mono), monospace",
    color: "hsl(var(--foreground))",
    whiteSpace: "nowrap",
    position: "sticky",
    left: 0,
    zIndex: 10,
    backgroundColor: cardBg,
    borderRight: `1px solid ${borderColor}`,
    borderBottom: rateIdx < RATES.length - 1 ? `1px solid ${borderColor}` : "none",
    textAlign: "right",
    minWidth: "48px",
  });

  return (
    <div style={{ overflowX: "auto", borderRadius: "0.75rem", border: `1px solid ${borderColor}` }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
        <thead>
          <tr>
            <th style={cornerStyle}>
              <span style={{ fontSize: "9px" }}>CAGR / Yr</span>
            </th>
            {YEARS.map((year) => (
              <th key={year} style={colHeaderStyle}>
                {year}
                <span style={{ display: "block", fontSize: "8px", fontWeight: 400, opacity: 0.55, marginTop: "1px" }}>
                  {year === CURRENT_YEAR ? "now" : currentAge != null ? `age ${currentAge + (year - CURRENT_YEAR)}` : ""}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {RATES.map((rate, ri) => (
            <tr key={rate}>
              <td style={rowHeaderStyle(ri)}>{rate}%</td>
              {YEARS.map((year, ci) => {
                const value = projectValue(portfolioValue, rate, year, monthlyContrib, stepUp, assets);
                const multiple = baseTotal > 0 ? value / baseTotal : 1;
                const isHovered = hovered?.row === ri && hovered?.col === ci;
                const isCurrentYear = year === CURRENT_YEAR;

                const cellStyle: React.CSSProperties = {
                  padding: CELL_PAD,
                  textAlign: "right",
                  fontFamily: "var(--font-geist-mono), monospace",
                  fontVariantNumeric: "tabular-nums",
                  whiteSpace: "nowrap",
                  cursor: "default",
                  borderBottom: ri < RATES.length - 1 ? `1px solid ${borderColor}` : "none",
                  borderRight: ci < YEARS.length - 1 ? `1px solid ${borderColor}` : "none",
                  transition: "background-color 0.1s",
                  outline: isHovered ? "2px solid rgba(16,185,129,0.55)" : "none",
                  outlineOffset: "-2px",
                  position: "relative",
                  zIndex: isHovered ? 5 : "auto",
                  ...(isCurrentYear ? { backgroundColor: "rgba(16,185,129,0.04)" } : cellBg(multiple)),
                };

                return (
                  <td
                    key={year}
                    style={cellStyle}
                    className={cellTextClass(multiple)}
                    onMouseEnter={() => setHovered({ row: ri, col: ci })}
                    onMouseLeave={() => setHovered(null)}
                  >
                    {fmtCompact(value)}
                    {isCurrentYear && (
                      <span style={{ display: "block", fontSize: "8px", opacity: 0.4, fontWeight: 400, marginTop: "1px" }}>
                        base
                      </span>
                    )}
                    {!isCurrentYear && multiple >= 2 && (
                      <span style={{ display: "block", fontSize: "8px", opacity: 0.5, fontWeight: 500, marginTop: "1px" }}>
                        {multiple.toFixed(1)}×
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
