"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  InvestmentSchema,
  TransactionSchema,
  CreateInvestmentWithTransactionSchema,
  UpdatePriceSchema,
} from "@/lib/validators";
import {
  calculateAvgPrice,
  calculateTotalQty,
  calculateTotalInvested,
  calculateXIRR,
  buildCashflows,
} from "@/lib/calculations";
import { Currency } from "@/generated/prisma/client";

// ─── Investments ──────────────────────────────────────────────────────────────

export async function getInvestments() {
  const investments = await prisma.investment.findMany({
    include: { transactions: true },
    orderBy: { createdAt: "desc" },
  });

  return investments.map((inv) => {
    const totalQty = calculateTotalQty(inv.transactions);
    const totalInvested = calculateTotalInvested(inv.transactions);
    const currentValue = totalQty * inv.currentPrice;
    const pnl = currentValue - totalInvested;
    const pnlPercent = totalInvested > 0 ? (pnl / totalInvested) * 100 : 0;
    const avgPrice = calculateAvgPrice(inv.transactions);
    const cashflows = buildCashflows(inv.transactions, currentValue);
    const xirr = calculateXIRR(cashflows);

    return {
      ...inv,
      totalQty,
      totalInvested,
      currentValue,
      pnl,
      pnlPercent,
      avgPrice,
      xirr,
    };
  });
}

export async function getInvestment(id: string) {
  const inv = await prisma.investment.findUniqueOrThrow({
    where: { id },
    include: { transactions: { orderBy: { date: "desc" } } },
  });

  const totalQty = calculateTotalQty(inv.transactions);
  const totalInvested = calculateTotalInvested(inv.transactions);
  const currentValue = totalQty * inv.currentPrice;
  const pnl = currentValue - totalInvested;
  const pnlPercent = totalInvested > 0 ? (pnl / totalInvested) * 100 : 0;
  const avgPrice = calculateAvgPrice(inv.transactions);
  const cashflows = buildCashflows(inv.transactions, currentValue);
  const xirr = calculateXIRR(cashflows);

  return { ...inv, totalQty, totalInvested, currentValue, pnl, pnlPercent, avgPrice, xirr };
}

export async function createInvestmentWithTransaction(rawData: unknown) {
  const data = CreateInvestmentWithTransactionSchema.parse(rawData);

  const investment = await prisma.investment.create({
    data: {
      ...data.investment,
      transactions: {
        create: {
          ...data.transaction,
          date: new Date(data.transaction.date),
        },
      },
    },
    include: { transactions: true },
  });

  revalidatePath("/investments");
  return investment;
}

export async function updateInvestment(id: string, rawData: unknown) {
  const data = InvestmentSchema.partial().parse(rawData);
  const investment = await prisma.investment.update({ where: { id }, data });
  revalidatePath("/investments");
  return investment;
}

export async function updateInvestmentPrice(id: string, rawData: unknown) {
  const data = UpdatePriceSchema.parse(rawData);
  await prisma.investment.update({ where: { id }, data });
  revalidatePath("/investments");
}

export async function deleteInvestment(id: string) {
  await prisma.investment.delete({ where: { id } });
  revalidatePath("/investments");
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export async function createTransaction(rawData: unknown) {
  const data = TransactionSchema.parse(rawData);
  const transaction = await prisma.transaction.create({
    data: { ...data, date: new Date(data.date) },
  });
  revalidatePath("/investments");
  return transaction;
}

export async function updateTransaction(id: string, rawData: unknown) {
  const data = TransactionSchema.partial().parse(rawData);
  const transaction = await prisma.transaction.update({
    where: { id },
    data: { ...data, ...(data.date ? { date: new Date(data.date) } : {}) },
  });
  revalidatePath("/investments");
  return transaction;
}

export async function deleteTransaction(id: string) {
  await prisma.transaction.delete({ where: { id } });
  revalidatePath("/investments");
}

// ─── Portfolio Summary ────────────────────────────────────────────────────────

export async function getPortfolioSummary(displayCurrency: Currency = Currency.INR) {
  const investments = await getInvestments();
  const settings = await getSettings();
  const rate = settings.exchangeRate;

  function toDisplay(amount: number, currency: Currency): number {
    if (currency === displayCurrency) return amount;
    if (currency === Currency.USD && displayCurrency === Currency.INR) return amount * rate;
    if (currency === Currency.INR && displayCurrency === Currency.USD) return amount / rate;
    return amount;
  }

  let totalValue = 0;
  let totalInvested = 0;
  let todayChange = 0;

  for (const inv of investments) {
    totalValue += toDisplay(inv.currentValue, inv.currency);
    totalInvested += toDisplay(inv.totalInvested, inv.currency);

    if (inv.previousClose != null) {
      const priceChange = inv.currentPrice - inv.previousClose;
      const change = priceChange * inv.totalQty;
      todayChange += toDisplay(change, inv.currency);
    }
  }

  const totalPnl = totalValue - totalInvested;
  const totalPnlPercent = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;
  const todayChangePercent =
    totalValue - todayChange > 0 ? (todayChange / (totalValue - todayChange)) * 100 : 0;

  // Portfolio-level XIRR
  const allCashflows = investments.flatMap((inv) =>
    buildCashflows(inv.transactions, toDisplay(inv.currentValue, inv.currency)).map((cf) => ({
      ...cf,
      // Negate buys that were already negative, keep sign for sells/current
      amount:
        inv.currency !== displayCurrency
          ? cf.amount < 0
            ? toDisplay(cf.amount, inv.currency)
            : toDisplay(cf.amount, inv.currency)
          : cf.amount,
    }))
  );
  const xirr = calculateXIRR(allCashflows);

  return {
    totalValue,
    totalInvested,
    totalPnl,
    totalPnlPercent,
    todayChange,
    todayChangePercent,
    xirr,
  };
}

export async function getAssetAllocation(displayCurrency: Currency = Currency.INR) {
  const investments = await getInvestments();
  const settings = await getSettings();
  const rate = settings.exchangeRate;

  function toDisplay(amount: number, currency: Currency): number {
    if (currency === displayCurrency) return amount;
    if (currency === Currency.USD && displayCurrency === Currency.INR) return amount * rate;
    if (currency === Currency.INR && displayCurrency === Currency.USD) return amount / rate;
    return amount;
  }

  const allocation: Record<string, number> = {};
  let total = 0;

  for (const inv of investments) {
    const value = toDisplay(inv.currentValue, inv.currency);
    allocation[inv.type] = (allocation[inv.type] ?? 0) + value;
    total += value;
  }

  return Object.entries(allocation).map(([type, value]) => ({
    type,
    value,
    percent: total > 0 ? (value / total) * 100 : 0,
  }));
}

export async function getPortfolioTimeSeries(
  range: "1M" | "3M" | "6M" | "1Y" | "ALL",
  displayCurrency: Currency = Currency.INR
) {
  const investments = await prisma.investment.findMany({
    include: { transactions: { orderBy: { date: "asc" } } },
  });
  const settings = await getSettings();
  const rate = settings.exchangeRate;

  function toDisplay(amount: number, currency: Currency): number {
    if (currency === displayCurrency) return amount;
    if (currency === Currency.USD && displayCurrency === Currency.INR) return amount * rate;
    if (currency === Currency.INR && displayCurrency === Currency.USD) return amount / rate;
    return amount;
  }

  const now = new Date();
  const rangeMap = { "1M": 30, "3M": 90, "6M": 180, "1Y": 365, ALL: 9999 };
  const daysBack = rangeMap[range];
  const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

  // Collect all transaction dates + today
  const allDates = new Set<string>();
  for (const inv of investments) {
    for (const t of inv.transactions) {
      if (t.date >= startDate) allDates.add(t.date.toISOString().split("T")[0]);
    }
  }
  allDates.add(now.toISOString().split("T")[0]);

  // For each date, compute cumulative invested
  const sortedDates = Array.from(allDates).sort();

  return sortedDates.map((dateStr) => {
    const date = new Date(dateStr);
    let invested = 0;
    for (const inv of investments) {
      const txBefore = inv.transactions.filter((t) => t.date <= date);
      const qty = calculateTotalQty(txBefore);
      const invAmt = calculateTotalInvested(txBefore);
      const value = qty * inv.currentPrice; // approximate current price for all dates
      invested += toDisplay(invAmt, inv.currency);
      void value; // currentValue per date would need historical prices — using current price as proxy
    }
    return { date: dateStr, invested };
  });
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export async function getSettings() {
  return prisma.settings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", exchangeRate: 84 },
    update: {},
  });
}

export async function updateExchangeRate(rate: number) {
  await prisma.settings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", exchangeRate: rate },
    update: { exchangeRate: rate },
  });
  revalidatePath("/investments");
}
