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
  onEdit: (id: string) => void;
};

function SortHeader({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      onClick={onClick}
    >
      {label}
      <ArrowUpDown className="h-3 w-3 shrink-0" />
    </button>
  );
}

export function getColumns(ctx: ColumnContext): ColumnDef<InvestmentWithStats>[] {
  return [
    // ── Name (text + ticker only, no badge) ──────────────────────────────────
    {
      accessorKey: "name",
      size: 160,
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
            <span
              className="font-medium text-sm truncate block"
              title={inv.name}
            >
              {inv.name}
            </span>
            {inv.ticker && (
              <span className="text-xs text-muted-foreground font-mono truncate block">
                {inv.ticker}
              </span>
            )}
          </div>
        );
      },
    },

    // ── Type (badge only) ────────────────────────────────────────────────────
    {
      accessorKey: "type",
      size: 82,
      header: () => (
        <span className="text-xs font-medium text-muted-foreground">Type</span>
      ),
      cell: ({ row }) => {
        const inv = row.original;
        return (
          <Badge
            variant="secondary"
            className={`text-[10px] px-1.5 py-0 whitespace-nowrap ${INVESTMENT_TYPE_COLORS[inv.type]}`}
          >
            {INVESTMENT_TYPE_LABELS[inv.type]}
          </Badge>
        );
      },
      enableSorting: false,
    },

    // ── Qty ──────────────────────────────────────────────────────────────────
    {
      accessorKey: "totalQty",
      size: 60,
      header: ({ column }) => (
        <SortHeader
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          label="Qty"
        />
      ),
      cell: ({ row }) => {
        const qty = row.original.totalQty;
        return (
          <span className="font-mono text-sm tabular-nums">
            {qty % 1 === 0
              ? qty.toLocaleString()
              : qty.toFixed(2).replace(/\.?0+$/, "")}
          </span>
        );
      },
    },

    // ── Avg Price ────────────────────────────────────────────────────────────
    {
      accessorKey: "avgPrice",
      size: 82,
      header: ({ column }) => (
        <SortHeader
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          label="Avg"
        />
      ),
      cell: ({ row }) => (
        <span className="font-mono text-sm tabular-nums">
          {ctx.fmt(row.original.avgPrice, row.original.currency)}
        </span>
      ),
    },

    // ── CMP ──────────────────────────────────────────────────────────────────
    {
      accessorKey: "currentPrice",
      size: 88,
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
                className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                title="Refresh price"
              >
                <RefreshCw className="h-3 w-3" />
              </button>
            )}
          </div>
        );
      },
    },

    // ── Invested ─────────────────────────────────────────────────────────────
    {
      accessorKey: "totalInvested",
      size: 90,
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

    // ── Current Value ────────────────────────────────────────────────────────
    {
      accessorKey: "currentValue",
      size: 82,
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

    // ── P&L ──────────────────────────────────────────────────────────────────
    {
      accessorKey: "pnl",
      size: 82,
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

    // ── P&L % ────────────────────────────────────────────────────────────────
    {
      accessorKey: "pnlPercent",
      size: 68,
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
            {pct >= 0 ? "+" : ""}{pct.toFixed(1)}%
          </span>
        );
      },
    },

    // ── Actions ──────────────────────────────────────────────────────────────
    {
      id: "actions",
      size: 44,
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
              <DropdownMenuItem onClick={() => ctx.onEdit(inv.id)}>
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
