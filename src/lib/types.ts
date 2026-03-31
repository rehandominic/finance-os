import { InvestmentType, Geography, Currency, TransactionType } from "@/lib/enums";

export type SerializedTransaction = {
  id: string;
  investmentId: string;
  date: string;
  type: TransactionType;
  quantity: number;
  pricePerUnit: number;
  fees: number;
  notes: string | null;
  createdAt: string;
};

export type InvestmentWithStats = {
  id: string;
  name: string;
  ticker: string | null;
  yahooTicker: string | null;
  type: InvestmentType;
  geography: Geography;
  currency: Currency;
  sector: string | null;
  currentPrice: number;
  previousClose: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  transactions: SerializedTransaction[];
  // Computed
  totalQty: number;
  totalInvested: number;
  currentValue: number;
  pnl: number;
  pnlPercent: number;
  avgPrice: number;
  xirr: number | null;
};

export const INVESTMENT_TYPE_LABELS: Record<InvestmentType, string> = {
  INDIA_STOCK: "India Stock",
  INDIA_MF: "India MF",
  US_STOCK: "US Stock",
  US_ETF: "US ETF",
  CRYPTO: "Crypto",
  PRIVATE: "Private",
};

export const INVESTMENT_TYPE_COLORS: Record<InvestmentType, string> = {
  INDIA_STOCK: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  INDIA_MF: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  US_STOCK: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  US_ETF: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  CRYPTO: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  PRIVATE: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
};
