"use client";

import { useMemo, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Sector } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InvestmentWithStats, INVESTMENT_TYPE_LABELS } from "@/lib/types";
import { InvestmentType, Currency } from "@/lib/enums";
import { useCurrency } from "./investments-shell";

// Chart colors keyed to investment type (matching --chart-1 through --chart-6)
const TYPE_CHART_COLORS: Record<InvestmentType, string> = {
  INDIA_STOCK: "hsl(var(--chart-1))",
  INDIA_MF: "hsl(var(--chart-2))",
  US_STOCK: "hsl(var(--chart-3))",
  US_ETF: "hsl(var(--chart-4))",
  CRYPTO: "hsl(var(--chart-5))",
  PRIVATE: "hsl(var(--chart-6))",
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ActiveShape(props: any) {
  const {
    cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill,
  } = props;
  return (
    <g>
      <Sector
        cx={cx} cy={cy}
        innerRadius={innerRadius - 4}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
    </g>
  );
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

  const CustomTooltip = ({
    active, payload,
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

  function handleClick(_: unknown, index: number) {
    const slice = slices[index];
    if (activeIndex === index) {
      setActiveIndex(null);
      onTypeFilter?.(null);
    } else {
      setActiveIndex(index);
      onTypeFilter?.(slice.type);
    }
  }

  return (
    <Card className="lg:col-span-1">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Allocation</CardTitle>
        <CardDescription>By investment type</CardDescription>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        {slices.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
            No data
          </div>
        ) : (
          <>
            {/* Donut */}
            <div className="relative">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={slices.map((sl, i) => ({
                      ...sl,
                      opacity: activeIndex === null || activeIndex === i ? 1 : 0.4,
                    }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={62}
                    outerRadius={88}
                    dataKey="value"
                    strokeWidth={2}
                    stroke="hsl(var(--background))"
                    onClick={handleClick}
                    style={{ cursor: "pointer" }}
                  >
                    {slices.map((sl, i) => (
                      <Cell
                        key={sl.type}
                        fill={sl.color}
                        opacity={activeIndex === null || activeIndex === i ? 1 : 0.4}
                        outerRadius={activeIndex === i ? 94 : 88}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>

              {/* Center label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                {activeIndex !== null ? (
                  <>
                    <span className="text-[10px] text-muted-foreground">
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
                      {totalValue >= 1000000
                        ? `${(totalValue / 1000000).toFixed(1)}M`
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
            <div className="space-y-1.5">
              {slices.map((sl, i) => (
                <button
                  key={sl.type}
                  onClick={() => handleClick(null, i)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors text-left ${
                    activeIndex === i
                      ? "bg-muted"
                      : "hover:bg-muted/60"
                  }`}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: sl.color }}
                  />
                  <span className="text-xs flex-1 truncate text-muted-foreground">
                    {sl.label}
                  </span>
                  <span className="font-mono text-xs font-medium tabular-nums">
                    {fmt(sl.value, displayCurrency)}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground tabular-nums w-10 text-right">
                    {sl.percent.toFixed(1)}%
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
