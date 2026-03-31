"use client";

import { useMemo } from "react";
import { TrendingUp, TrendingDown, DollarSign, BarChart2, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { InvestmentWithStats } from "@/lib/types";
import { useCurrency } from "./investments-shell";
import { calculateXIRR } from "@/lib/calculations";

interface Props {
  investments: InvestmentWithStats[];
}

function PnlBadge({ value, percent }: { value: number; percent?: number }) {
  const positive = value >= 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  return (
    <span className={`flex items-center gap-1 text-sm font-mono ${positive ? "text-emerald-500" : "text-red-500"}`}>
      <Icon className="h-3.5 w-3.5" />
      {positive ? "+" : ""}
      {percent !== undefined
        ? `${percent.toFixed(2)}%`
        : value.toFixed(2)}
    </span>
  );
}

export function PortfolioSummaryCards({ investments }: Props) {
  const { displayCurrency, toDisplay, fmt } = useCurrency();

  const summary = useMemo(() => {
    let totalValue = 0;
    let totalInvested = 0;
    let todayChange = 0;

    // Build portfolio-wide cashflows for XIRR
    const allCashflows: { date: Date; amount: number }[] = [];

    for (const inv of investments) {
      const value = toDisplay(inv.currentValue, inv.currency);
      const invested = toDisplay(inv.totalInvested, inv.currency);
      totalValue += value;
      totalInvested += invested;

      if (inv.previousClose != null) {
        const priceChange = inv.currentPrice - inv.previousClose;
        todayChange += toDisplay(priceChange * inv.totalQty, inv.currency);
      }

      // Cashflows for this investment in display currency
      for (const t of inv.transactions) {
        const date = new Date(t.date);
        let amount: number;
        if (t.type === "BUY" || t.type === "SIP") {
          amount = -toDisplay(t.quantity * t.pricePerUnit + t.fees, inv.currency);
        } else if (t.type === "SELL") {
          amount = toDisplay(t.quantity * t.pricePerUnit - t.fees, inv.currency);
        } else {
          amount = toDisplay(t.pricePerUnit, inv.currency); // DIVIDEND
        }
        allCashflows.push({ date, amount });
      }
    }

    // Add current value as final positive cashflow
    allCashflows.push({ date: new Date(), amount: totalValue });
    allCashflows.sort((a, b) => a.date.getTime() - b.date.getTime());

    const xirr = calculateXIRR(allCashflows);
    const totalPnl = totalValue - totalInvested;
    const totalPnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;
    const prevValue = totalValue - todayChange;
    const todayChangePct = prevValue > 0 ? (todayChange / prevValue) * 100 : 0;

    return { totalValue, totalInvested, totalPnl, totalPnlPct, todayChange, todayChangePct, xirr };
  }, [investments, displayCurrency, toDisplay]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Portfolio Value */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <DollarSign className="h-3.5 w-3.5" />
            Total Portfolio Value
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="font-mono text-2xl font-semibold tracking-tight">
            {fmt(summary.totalValue, displayCurrency)}
          </div>
          <div className="mt-1 text-xs text-muted-foreground font-mono">
            Invested: {fmt(summary.totalInvested, displayCurrency)}
          </div>
        </CardContent>
      </Card>

      {/* Total P&L */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <BarChart2 className="h-3.5 w-3.5" />
            Total P&amp;L
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className={`font-mono text-2xl font-semibold tracking-tight ${summary.totalPnl >= 0 ? "text-emerald-500" : "text-red-500"}`}>
            {summary.totalPnl >= 0 ? "+" : ""}
            {fmt(summary.totalPnl, displayCurrency)}
          </div>
          <div className="mt-1">
            <PnlBadge value={summary.totalPnlPct} percent={summary.totalPnlPct} />
          </div>
        </CardContent>
      </Card>

      {/* XIRR */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            Annualised Return
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-3 w-3 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-56 text-xs">
                XIRR — Extended Internal Rate of Return. Annualised return accounting for the exact timing of each investment.
              </TooltipContent>
            </Tooltip>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className={`font-mono text-2xl font-semibold tracking-tight ${(summary.xirr ?? 0) >= 0 ? "text-emerald-500" : "text-red-500"}`}>
            {summary.xirr != null
              ? `${summary.xirr >= 0 ? "+" : ""}${summary.xirr.toFixed(1)}%`
              : "—"}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">XIRR (annualised)</div>
        </CardContent>
      </Card>

      {/* Today's Change */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Today&apos;s Change
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className={`font-mono text-2xl font-semibold tracking-tight ${summary.todayChange >= 0 ? "text-emerald-500" : "text-red-500"}`}>
            {summary.todayChange >= 0 ? "+" : ""}
            {fmt(summary.todayChange, displayCurrency)}
          </div>
          <div className="mt-1">
            <PnlBadge value={summary.todayChangePct} percent={summary.todayChangePct} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
