"use client";

import { useState, useTransition } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  SortingState,
} from "@tanstack/react-table";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Fragment } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { InvestmentWithStats } from "@/lib/types";
import { useCurrency } from "../investments-shell";
import { getColumns } from "./columns";
import { deleteInvestment, updateInvestmentPrice } from "../../actions";
import { ExpandedRow } from "./expanded-row";
import { AddTransactionSheet } from "../add-transaction-sheet";

interface Props {
  investments: InvestmentWithStats[];
  globalFilter: string;
}

export function DataTable({ investments, globalFilter }: Props) {
  const { displayCurrency, toDisplay, fmt } = useCurrency();
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [txSheetInvestment, setTxSheetInvestment] = useState<InvestmentWithStats | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleRefreshPrice(id: string, ticker: string) {
    try {
      const res = await fetch(`/api/yahoo/quote?symbol=${encodeURIComponent(ticker)}`);
      const data = await res.json();
      if (!res.ok || !data.regularMarketPrice) throw new Error("No price data");
      startTransition(async () => {
        await updateInvestmentPrice(id, {
          currentPrice: data.regularMarketPrice,
          previousClose: data.chartPreviousClose ?? undefined,
        });
      });
      toast.success(`Price updated for ${ticker}`);
      router.refresh();
    } catch {
      toast.error(`Could not fetch price for ${ticker}`);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    startTransition(async () => {
      await deleteInvestment(deleteId);
      toast.success("Investment deleted");
      if (expandedId === deleteId) setExpandedId(null);
      router.refresh();
    });
    setDeleteId(null);
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  const columns = getColumns({
    displayCurrency,
    toDisplay,
    fmt,
    onDelete: (id) => setDeleteId(id),
    onRefreshPrice: handleRefreshPrice,
    onAddTransaction: (inv) => setTxSheetInvestment(inv),
    onEdit: (id) => router.push(`/investments/${id}/edit`),
  });

  const table = useReactTable({
    data: investments,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: (row, _columnId, filterValue: string) => {
      const q = filterValue.toLowerCase();
      return (
        row.original.name.toLowerCase().includes(q) ||
        (row.original.ticker?.toLowerCase().includes(q) ?? false)
      );
    },
  });

  const visibleRows = table.getRowModel().rows;
  const totalPortfolioValue = investments.reduce(
    (sum, inv) => sum + toDisplay(inv.currentValue, inv.currency),
    0
  );

  const totals = visibleRows.reduce(
    (acc, row) => {
      const inv = row.original;
      acc.invested += toDisplay(inv.totalInvested, inv.currency);
      acc.value += toDisplay(inv.currentValue, inv.currency);
      acc.pnl += toDisplay(inv.pnl, inv.currency);
      return acc;
    },
    { invested: 0, value: 0, pnl: 0 }
  );

  if (investments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-3 rounded-xl border border-dashed">
        <div className="text-4xl">📊</div>
        <p className="font-medium">No investments yet</p>
        <p className="text-sm text-muted-foreground">Add your first investment to get started</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl border overflow-hidden">
        <Table className="w-full table-fixed">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent border-b">
                <TableHead className="w-8 px-2" />
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="h-9 px-3 text-xs"
                    style={{ width: header.column.columnDef.size }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isPending
              ? Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="px-2 py-2.5">
                      <Skeleton className="h-4 w-4" />
                    </TableCell>
                    {columns.map((_, j) => (
                      <TableCell key={j} className="px-3 py-2.5">
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : visibleRows.length === 0
              ? (
                  <TableRow>
                    <TableCell colSpan={columns.length + 1} className="text-center py-8 text-muted-foreground text-sm">
                      No results match your search.
                    </TableCell>
                  </TableRow>
                )
              : visibleRows.map((row) => {
                  const isExpanded = expandedId === row.original.id;
                  return (
                    <Fragment key={row.id}>
                      <TableRow
                        className="cursor-pointer even:bg-muted/30 hover:bg-muted/60 transition-colors"
                        onClick={() => toggleExpand(row.original.id)}
                      >
                        {/* Expand chevron */}
                        <TableCell className="px-2 py-2.5 w-8">
                          {isExpanded
                            ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                            : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                          }
                        </TableCell>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell
                            key={cell.id}
                            className="px-3 py-2.5"
                            onClick={cell.column.id === "actions" ? (e) => e.stopPropagation() : undefined}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                      {isExpanded && (
                        <TableRow key={`${row.id}-expanded`} className="hover:bg-transparent">
                          <TableCell colSpan={columns.length + 1} className="p-0">
                            <ExpandedRow
                              investment={row.original}
                              totalPortfolioValue={totalPortfolioValue}
                              onAddTransaction={() => setTxSheetInvestment(row.original)}
                              displayCurrency={displayCurrency}
                              fmt={fmt}
                            />
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
          </TableBody>
          <TableFooter>
            <TableRow className="border-t-2 bg-muted/40 hover:bg-muted/40">
              {/* chevron */}
              <TableCell className="px-2 py-2" />
              {/* name + type + qty + avg + cmp */}
              <TableCell className="px-3 py-2 text-xs font-medium" colSpan={5}>
                Total ({visibleRows.length} holdings)
              </TableCell>
              {/* invested */}
              <TableCell className="px-3 py-2 font-mono text-sm font-medium tabular-nums">
                {fmt(totals.invested, displayCurrency)}
              </TableCell>
              {/* value */}
              <TableCell className="px-3 py-2 font-mono text-sm font-medium tabular-nums">
                {fmt(totals.value, displayCurrency)}
              </TableCell>
              {/* pnl */}
              <TableCell className={`px-3 py-2 font-mono text-sm font-medium tabular-nums ${totals.pnl >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                {totals.pnl >= 0 ? "+" : ""}{fmt(totals.pnl, displayCurrency)}
              </TableCell>
              {/* pnl% + actions */}
              <TableCell colSpan={2} />
            </TableRow>
          </TableFooter>
        </Table>
      </div>

      {/* Delete Investment dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Investment</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this investment and all its transactions. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Transaction sheet */}
      <AddTransactionSheet
        investment={txSheetInvestment}
        open={!!txSheetInvestment}
        onOpenChange={(open) => { if (!open) setTxSheetInvestment(null); }}
      />
    </>
  );
}
