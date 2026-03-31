"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal, RefreshCw, Pencil, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InvestmentWithStats, INVESTMENT_TYPE_LABELS, INVESTMENT_TYPE_COLORS } from "@/lib/types";
import { Currency } from "@/lib/enums";

type ColumnContext = {
  displayCurrency: Currency;
  toDisplay: (amount: number, fromCurrency: Currency) => number;
  fmt: (amount: number, fromCurrency: Currency) => string;
  onDelete: (id: string) => void;
  onRefreshPrice: (id: string, ticker: string) => void;
  onAddTransaction: (inv: InvestmentWithStats) => void;
};

// Use a plain button with onClick passed directly — avoids complex generic types on Column
function SortHeader({
  onClick,
  label,
}: {
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      onClick={onClick}
    >
      {label}
      <ArrowUpDown className="h-3 w-3" />
    </button>
  );
}

export function getColumns(ctx: ColumnContext): ColumnDef<InvestmentWithStats>[] {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <SortHeader
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          label="Name"
        />
      ),
      cell: ({ row }) => {
        const inv = row.original;
        return (
          <div className="flex flex-col gap-0.5 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm truncate">{inv.name}</span>
              <Badge
                variant="secondary"
                className={`text-[10px] px-1.5 py-0 shrink-0 ${INVESTMENT_TYPE_COLORS[inv.type]}`}
              >
                {INVESTMENT_TYPE_LABELS[inv.type]}
              </Badge>
            </div>
            {inv.ticker && (
              <span className="text-xs text-muted-foreground font-mono">{inv.ticker}</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "totalQty",
      header: ({ column }) => (
        <SortHeader
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          label="Qty"
        />
      ),
      cell: ({ row }) => (
        <span className="font-mono text-sm tabular-nums">
          {row.original.totalQty % 1 === 0
            ? row.original.totalQty.toLocaleString()
            : row.original.totalQty.toFixed(4).replace(/\.?0+$/, "")}
        </span>
      ),
    },
    {
      accessorKey: "avgPrice",
      header: ({ column }) => (
        <SortHeader
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          label="Avg Price"
        />
      ),
      cell: ({ row }) => (
        <span className="font-mono text-sm tabular-nums">
          {ctx.fmt(row.original.avgPrice, row.original.currency)}
        </span>
      ),
    },
    {
      accessorKey: "currentPrice",
      header: ({ column }) => (
        <SortHeader
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          label="CMP"
        />
      ),
      cell: ({ row }) => {
        const inv = row.original;
        return (
          <div className="flex items-center gap-1">
            <span className="font-mono text-sm tabular-nums">
              {ctx.fmt(inv.currentPrice, inv.currency)}
            </span>
            {inv.yahooTicker && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  ctx.onRefreshPrice(inv.id, inv.yahooTicker!);
                }}
                className="text-muted-foreground hover:text-foreground transition-colors"
                title="Refresh price"
              >
                <RefreshCw className="h-3 w-3" />
              </button>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "totalInvested",
      header: ({ column }) => (
        <SortHeader
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          label="Invested"
        />
      ),
      cell: ({ row }) => (
        <span className="font-mono text-sm tabular-nums">
          {ctx.fmt(row.original.totalInvested, row.original.currency)}
        </span>
      ),
    },
    {
      accessorKey: "currentValue",
      header: ({ column }) => (
        <SortHeader
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          label="Value"
        />
      ),
      cell: ({ row }) => (
        <span className="font-mono text-sm tabular-nums">
          {ctx.fmt(row.original.currentValue, row.original.currency)}
        </span>
      ),
    },
    {
      accessorKey: "pnl",
      header: ({ column }) => (
        <SortHeader
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          label="P&L"
        />
      ),
      cell: ({ row }) => {
        const { pnl, currency } = row.original;
        return (
          <span className={`font-mono text-sm tabular-nums ${pnl >= 0 ? "text-emerald-500" : "text-red-500"}`}>
            {pnl >= 0 ? "+" : ""}{ctx.fmt(pnl, currency)}
          </span>
        );
      },
    },
    {
      accessorKey: "pnlPercent",
      header: ({ column }) => (
        <SortHeader
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          label="P&L %"
        />
      ),
      cell: ({ row }) => {
        const pct = row.original.pnlPercent;
        return (
          <span className={`font-mono text-sm tabular-nums ${pct >= 0 ? "text-emerald-500" : "text-red-500"}`}>
            {pct >= 0 ? "+" : ""}{pct.toFixed(2)}%
          </span>
        );
      },
    },
    {
      accessorKey: "xirr",
      header: ({ column }) => (
        <SortHeader
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          label="XIRR"
        />
      ),
      cell: ({ row }) => {
        const xirr = row.original.xirr;
        if (xirr == null) return <span className="text-muted-foreground font-mono text-sm">—</span>;
        return (
          <span className={`font-mono text-sm tabular-nums ${xirr >= 0 ? "text-emerald-500" : "text-red-500"}`}>
            {xirr >= 0 ? "+" : ""}{xirr.toFixed(1)}%
          </span>
        );
      },
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => {
        const inv = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger render={
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            } />
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => ctx.onAddTransaction(inv)}>
                <PlusCircle className="h-3.5 w-3.5 mr-2" />
                Add Transaction
              </DropdownMenuItem>
              {inv.yahooTicker && (
                <DropdownMenuItem onClick={() => ctx.onRefreshPrice(inv.id, inv.yahooTicker!)}>
                  <RefreshCw className="h-3.5 w-3.5 mr-2" />
                  Refresh Price
                </DropdownMenuItem>
              )}
              <DropdownMenuItem>
                <Pencil className="h-3.5 w-3.5 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => ctx.onDelete(inv.id)}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
      enableSorting: false,
    },
  ];
}
