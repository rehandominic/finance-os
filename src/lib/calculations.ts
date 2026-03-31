import { TransactionType } from "@/lib/enums";

// Minimal transaction shape used by calculations — matches both Prisma model and SerializedTransaction
type TxLike = {
  type: TransactionType;
  quantity: number;
  pricePerUnit: number;
  fees: number;
  date: Date | string;
};

// ─── Average Price (weighted, BUY + SIP only) ────────────────────────────────
export function calculateAvgPrice(transactions: TxLike[]): number {
  const buys = transactions.filter(
    (t) => t.type === TransactionType.BUY || t.type === TransactionType.SIP
  );
  const totalQty = buys.reduce((sum, t) => sum + t.quantity, 0);
  if (totalQty === 0) return 0;
  const totalCost = buys.reduce((sum, t) => sum + t.quantity * t.pricePerUnit, 0);
  return totalCost / totalQty;
}

// ─── Total Quantity (net of sells) ───────────────────────────────────────────
export function calculateTotalQty(transactions: TxLike[]): number {
  return transactions.reduce((sum, t) => {
    if (t.type === TransactionType.BUY || t.type === TransactionType.SIP) {
      return sum + t.quantity;
    }
    if (t.type === TransactionType.SELL) {
      return sum - t.quantity;
    }
    return sum;
  }, 0);
}

// ─── Total Invested ───────────────────────────────────────────────────────────
export function calculateTotalInvested(transactions: TxLike[]): number {
  return transactions.reduce((sum, t) => {
    if (t.type === TransactionType.BUY || t.type === TransactionType.SIP) {
      return sum + t.quantity * t.pricePerUnit + t.fees;
    }
    if (t.type === TransactionType.SELL) {
      return sum - (t.quantity * t.pricePerUnit - t.fees);
    }
    return sum;
  }, 0);
}

// ─── XIRR (Newton-Raphson) ────────────────────────────────────────────────────
export interface Cashflow {
  date: Date | string;
  amount: number; // negative = outflow (buy), positive = inflow (sell/dividend/current value)
}

export function calculateXIRR(cashflows: Cashflow[]): number | null {
  if (cashflows.length < 2) return null;

  const dates = cashflows.map((c) => new Date(c.date));
  const amounts = cashflows.map((c) => c.amount);
  const firstDate = dates[0];

  function npv(rate: number): number {
    return amounts.reduce((sum, amount, i) => {
      const t = (dates[i].getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
      return sum + amount / Math.pow(1 + rate, t);
    }, 0);
  }

  function npvDerivative(rate: number): number {
    return amounts.reduce((sum, amount, i) => {
      const t = (dates[i].getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
      if (t === 0) return sum;
      return sum - (t * amount) / Math.pow(1 + rate, t + 1);
    }, 0);
  }

  let rate = 0.1;
  for (let i = 0; i < 100; i++) {
    const nv = npv(rate);
    const dnv = npvDerivative(rate);
    if (Math.abs(dnv) < 1e-10) break;
    const newRate = rate - nv / dnv;
    if (Math.abs(newRate - rate) < 1e-7) {
      return Math.round(newRate * 10000) / 100; // return as percentage, 2dp
    }
    rate = newRate;
    if (rate <= -1) rate = -0.999; // guard against division by zero
  }
  return null;
}

// ─── Build cashflows for XIRR from transactions + current value ──────────────
export function buildCashflows(
  transactions: TxLike[],
  currentValue: number
): Cashflow[] {
  const flows: Cashflow[] = transactions.map((t) => {
    if (t.type === TransactionType.BUY || t.type === TransactionType.SIP) {
      return { date: t.date, amount: -(t.quantity * t.pricePerUnit + t.fees) };
    }
    if (t.type === TransactionType.SELL) {
      return { date: t.date, amount: t.quantity * t.pricePerUnit - t.fees };
    }
    // DIVIDEND
    return { date: t.date, amount: t.pricePerUnit };
  });

  // Current value is a positive cashflow on today's date
  flows.push({ date: new Date(), amount: currentValue });

  // Sort by date ascending
  return flows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

// ─── Today's Change ───────────────────────────────────────────────────────────
export function calculateTodayChange(
  currentPrice: number,
  previousClose: number | null,
  totalQty: number
): { absolute: number; percent: number } | null {
  if (!previousClose) return null;
  const priceChange = currentPrice - previousClose;
  return {
    absolute: priceChange * totalQty,
    percent: (priceChange / previousClose) * 100,
  };
}
