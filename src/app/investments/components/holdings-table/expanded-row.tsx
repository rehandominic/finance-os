"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { InvestmentWithStats, SerializedTransaction } from "@/lib/types";
import { TransactionType, Currency } from "@/lib/enums";
import { deleteTransaction } from "../../actions";
import { formatDistanceToNow, differenceInMonths, differenceInYears } from "date-fns";

const TX_BADGE: Record<TransactionType, string> = {
  BUY: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  SIP: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  SELL: "bg-red-500/15 text-red-600 dark:text-red-400",
  DIVIDEND: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
};

function holdingPeriod(firstDate: string): string {
  const start = new Date(firstDate);
  const now = new Date();
  const years = differenceInYears(now, start);
  const months = differenceInMonths(now, start) % 12;
  if (years === 0) return `${months}m`;
  if (months === 0) return `${years}y`;
  return `${years}y ${months}m`;
}

interface Props {
  investment: InvestmentWithStats;
  totalPortfolioValue: number;
  onAddTransaction: () => void;
  displayCurrency: Currency;
  fmt: (amount: number, fromCurrency: Currency) => string;
}

export function ExpandedRow({
  investment,
  totalPortfolioValue,
  onAddTransaction,
  displayCurrency,
  fmt,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const currencySymbol = investment.currency === Currency.INR ? "₹" : "$";

  const firstTx = investment.transactions.length > 0
    ? [...investment.transactions].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      )[0]
    : null;

  const sortedTx = [...investment.transactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const realizedGains = investment.transactions
    .filter((t) => t.type === TransactionType.SELL)
    .reduce((sum, t) => {
      const avgAtSell =
        investment.transactions
          .filter(
            (b) =>
              (b.type === TransactionType.BUY || b.type === TransactionType.SIP) &&
              new Date(b.date) <= new Date(t.date)
          )
          .reduce((s, b) => s + b.quantity * b.pricePerUnit, 0) /
        (investment.transactions
          .filter(
            (b) =>
              (b.type === TransactionType.BUY || b.type === TransactionType.SIP) &&
              new Date(b.date) <= new Date(t.date)
          )
          .reduce((s, b) => s + b.quantity, 0) || 1);
      return sum + (t.pricePerUnit - avgAtSell) * t.quantity;
    }, 0);

  const dividendIncome = investment.transactions
    .filter((t) => t.type === TransactionType.DIVIDEND)
    .reduce((sum, t) => sum + t.pricePerUnit, 0);

  const totalFees = investment.transactions.reduce((sum, t) => sum + t.fees, 0);

  const portfolioWeight =
    totalPortfolioValue > 0
      ? (investment.currentValue / totalPortfolioValue) * 100
      : 0;

  function handleDeleteTx() {
    if (!deleteId) return;
    startTransition(async () => {
      await deleteTransaction(deleteId);
      toast.success("Transaction deleted");
      router.refresh();
    });
    setDeleteId(null);
  }

  function txTotal(t: SerializedTransaction): number {
    if (t.type === TransactionType.DIVIDEND) return t.pricePerUnit;
    if (t.type === TransactionType.SELL) return t.quantity * t.pricePerUnit - t.fees;
    return t.quantity * t.pricePerUnit + t.fees;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-border bg-muted/20">
      {/* ── Left: Transaction History ── */}
      <div className="lg:col-span-2 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Transaction History
          </h3>
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1.5 text-xs"
            onClick={onAddTransaction}
          >
            <Plus className="h-3 w-3" />
            Add Transaction
          </Button>
        </div>

        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-3 py-2 text-muted-foreground font-medium">Date</th>
                <th className="text-left px-3 py-2 text-muted-foreground font-medium">Type</th>
                <th className="text-right px-3 py-2 text-muted-foreground font-medium">Qty</th>
                <th className="text-right px-3 py-2 text-muted-foreground font-medium">Price</th>
                <th className="text-right px-3 py-2 text-muted-foreground font-medium">Fees</th>
                <th className="text-right px-3 py-2 text-muted-foreground font-medium">Total</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {sortedTx.map((t, i) => (
                <tr
                  key={t.id}
                  className={`border-b last:border-0 ${i % 2 === 0 ? "" : "bg-muted/20"}`}
                >
                  <td className="px-3 py-2 font-mono tabular-nums text-muted-foreground">
                    {new Date(t.date).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-3 py-2">
                    <Badge
                      variant="secondary"
                      className={`text-[10px] px-1.5 py-0 ${TX_BADGE[t.type as TransactionType]}`}
                    >
                      {t.type}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 font-mono tabular-nums text-right">
                    {t.type === TransactionType.DIVIDEND
                      ? "—"
                      : t.quantity % 1 === 0
                      ? t.quantity.toLocaleString()
                      : t.quantity.toFixed(4)}
                  </td>
                  <td className="px-3 py-2 font-mono tabular-nums text-right">
                    {currencySymbol}
                    {t.pricePerUnit.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className="px-3 py-2 font-mono tabular-nums text-right text-muted-foreground">
                    {t.fees > 0 ? `${currencySymbol}${t.fees}` : "—"}
                  </td>
                  <td
                    className={`px-3 py-2 font-mono tabular-nums text-right font-medium ${
                      t.type === TransactionType.SELL || t.type === TransactionType.DIVIDEND
                        ? "text-emerald-500"
                        : ""
                    }`}
                  >
                    {t.type === TransactionType.SELL || t.type === TransactionType.DIVIDEND
                      ? "+"
                      : "−"}
                    {currencySymbol}
                    {txTotal(t).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
                        title="Delete transaction"
                        onClick={() => setDeleteId(t.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Right: Holding Stats ── */}
      <div className="p-4 space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Holding Stats
        </h3>

        <div className="space-y-2.5">
          <StatRow
            label="Holding Period"
            value={firstTx ? holdingPeriod(firstTx.date) : "—"}
            mono
          />
          <StatRow
            label="Portfolio Weight"
            value={`${portfolioWeight.toFixed(1)}%`}
            mono
          />
          <StatRow
            label="Total Invested"
            value={fmt(investment.totalInvested, investment.currency)}
            mono
          />
          <StatRow
            label="Current Value"
            value={fmt(investment.currentValue, investment.currency)}
            mono
          />
          <StatRow
            label="Unrealised P&L"
            value={`${investment.pnl >= 0 ? "+" : ""}${fmt(investment.pnl, investment.currency)}`}
            valueClass={investment.pnl >= 0 ? "text-emerald-500" : "text-red-500"}
            mono
          />
          {realizedGains !== 0 && (
            <StatRow
              label="Realised Gains"
              value={`${realizedGains >= 0 ? "+" : ""}${currencySymbol}${Math.abs(realizedGains).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
              valueClass={realizedGains >= 0 ? "text-emerald-500" : "text-red-500"}
              mono
            />
          )}
          {dividendIncome > 0 && (
            <StatRow
              label="Dividend Income"
              value={`${currencySymbol}${dividendIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
              valueClass="text-purple-500"
              mono
            />
          )}
          {totalFees > 0 && (
            <StatRow
              label="Total Fees Paid"
              value={`${currencySymbol}${totalFees.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
              valueClass="text-muted-foreground"
              mono
            />
          )}
          <StatRow
            label="XIRR"
            value={investment.xirr != null ? `${investment.xirr >= 0 ? "+" : ""}${investment.xirr.toFixed(1)}%` : "—"}
            valueClass={
              investment.xirr != null
                ? investment.xirr >= 0
                  ? "text-emerald-500"
                  : "text-red-500"
                : undefined
            }
            mono
          />
          {firstTx && (
            <StatRow
              label="First Purchase"
              value={new Date(firstTx.date).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
              mono
            />
          )}
        </div>
      </div>

      {/* Delete transaction confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this transaction and recalculate your holdings. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTx}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatRow({
  label,
  value,
  valueClass,
  mono,
}: {
  label: string;
  value: string;
  valueClass?: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-xs font-medium ${mono ? "font-mono tabular-nums" : ""} ${valueClass ?? ""}`}>
        {value}
      </span>
    </div>
  );
}
