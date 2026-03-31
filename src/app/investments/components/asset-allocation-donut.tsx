"use client";

import { useMemo, useState } from "react";
import { PieChart, Pie, Sector, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InvestmentWithStats, INVESTMENT_TYPE_LABELS } from "@/lib/types";
import { InvestmentType, Currency } from "@/lib/enums";
import { useCurrency } from "./investments-shell";
import type { PieSectorShapeProps } from "recharts/types/polar/Pie";

const TYPE_CHART_COLORS: Record<InvestmentType, string> = {
  INDIA_STOCK: "#f97316",
  INDIA_MF:   "#8b5cf6",
  US_STOCK:   "#3b82f6",
  US_ETF:     "#06b6d4",
  CRYPTO:     "#f59e0b",
  PRIVATE:    "#ec4899",
};

interface AllocationSlice {
  type: InvestmentType;
  label: string;
  value: number;
  percent: number;
  color: string;
}

interface Props {
  investments: InvestmentWithStats[];
  onTypeFilter?: (type: InvestmentType | null) => void;
}

export function AssetAllocationDonut({ investments, onTypeFilter }: Props) {
  const { displayCurrency, toDisplay, fmt } = useCurrency();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const slices: AllocationSlice[] = useMemo(() => {
    const map: Partial<Record<InvestmentType, number>> = {};
    let total = 0;
    for (const inv of investments) {
      const v = toDisplay(inv.currentValue, inv.currency);
      map[inv.type] = (map[inv.type] ?? 0) + v;
      total += v;
    }
    return (Object.entries(map) as [InvestmentType, number][])
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([type, value]) => ({
        type,
        label: INVESTMENT_TYPE_LABELS[type],
        value,
        percent: total > 0 ? (value / total) * 100 : 0,
        color: TYPE_CHART_COLORS[type],
      }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [investments, displayCurrency]);

  const totalValue = slices.reduce((s, sl) => s + sl.value, 0);
  const currencySymbol = displayCurrency === Currency.INR ? "₹" : "$";

  // Build shape renderer — uses closure over activeIndex so legend clicks re-render sectors
  function makeSectorShape(slices: AllocationSlice[], activeIndex: number | null) {
    return function SectorShape(props: PieSectorShapeProps, index: number) {
      const { cx, cy, innerRadius, outerRadius, startAngle, endAngle } = props;
      const isActive = index === activeIndex;
      const isDimmed = activeIndex !== null && !isActive;
      const color = slices[index]?.color ?? "#888";
      return (
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={isActive ? (innerRadius as number) - 3 : (innerRadius as number)}
          outerRadius={isActive ? (outerRadius as number) + 7 : (outerRadius as number)}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={color}
          fillOpacity={isDimmed ? 0.25 : 1}
          stroke="hsl(var(--card))"
          strokeWidth={2}
        />
      );
    };
  }

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: { payload: AllocationSlice }[];
  }) => {
    if (!active || !payload?.length) return null;
    const sl = payload[0].payload;
    return (
      <div className="rounded-lg border bg-popover px-3 py-2 shadow-md text-xs space-y-1">
        <p className="font-medium" style={{ color: sl.color }}>{sl.label}</p>
        <p className="font-mono">{fmt(sl.value, displayCurrency)}</p>
        <p className="text-muted-foreground">{sl.percent.toFixed(1)}% of portfolio</p>
      </div>
    );
  };

  function handlePieClick(_: unknown, index: number) {
    const next = activeIndex === index ? null : index;
    setActiveIndex(next);
    onTypeFilter?.(next !== null ? slices[next].type : null);
  }

  function handleLegendClick(i: number) {
    const next = activeIndex === i ? null : i;
    setActiveIndex(next);
    onTypeFilter?.(next !== null ? slices[next].type : null);
  }

  return (
    <Card className="lg:col-span-1 flex flex-col">
      <CardHeader className="pb-2 shrink-0">
        <CardTitle className="text-base">Allocation</CardTitle>
        <CardDescription>By investment type</CardDescription>
      </CardHeader>

      <CardContent className="pt-0 flex-1 flex flex-col min-h-0">
        {slices.length === 0 ? (
          <div className="flex items-center justify-center flex-1 text-sm text-muted-foreground">
            No data
          </div>
        ) : (
          <div className="flex-1 flex flex-row gap-2 min-h-0">

            {/* Donut — stretches to fill card height */}
            <div className="flex-1 relative min-h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={slices}
                    cx="50%"
                    cy="50%"
                    innerRadius="52%"
                    outerRadius="76%"
                    dataKey="value"
                    onClick={handlePieClick}
                    shape={makeSectorShape(slices, activeIndex)}
                    style={{ cursor: "pointer" }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>

              {/* Centre label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                {activeIndex !== null ? (
                  <>
                    <span className="text-[10px] text-muted-foreground leading-tight text-center px-2">
                      {slices[activeIndex]?.label}
                    </span>
                    <span className="font-mono text-sm font-semibold leading-tight">
                      {slices[activeIndex]?.percent.toFixed(1)}%
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[10px] text-muted-foreground">Total</span>
                    <span className="font-mono text-sm font-semibold leading-tight">
                      {currencySymbol}
                      {totalValue >= 10000000
                        ? `${(totalValue / 10000000).toFixed(1)}Cr`
                        : totalValue >= 100000
                        ? `${(totalValue / 100000).toFixed(1)}L`
                        : totalValue >= 1000
                        ? `${(totalValue / 1000).toFixed(0)}K`
                        : totalValue.toFixed(0)}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Legend */}
            <div className="w-[42%] shrink-0 flex flex-col justify-center gap-0.5">
              {slices.map((sl, i) => (
                <button
                  key={sl.type}
                  onClick={() => handleLegendClick(i)}
                  className={`w-full flex items-center gap-2 px-1.5 py-1.5 rounded-md transition-colors text-left ${
                    activeIndex === i ? "bg-muted" : "hover:bg-muted/60"
                  }`}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: sl.color }}
                  />
                  <span
                    className={`text-xs flex-1 truncate leading-tight transition-colors ${
                      activeIndex !== null && activeIndex !== i
                        ? "text-muted-foreground/40"
                        : "text-muted-foreground"
                    }`}
                  >
                    {sl.label}
                  </span>
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    {sl.percent.toFixed(1)}%
                  </span>
                </button>
              ))}
            </div>

          </div>
        )}
      </CardContent>
    </Card>
  );
}
