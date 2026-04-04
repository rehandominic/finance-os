import { InvestmentType, Geography, Currency, TransactionType, AssetType, ValuationSource, LiabilityType, BucketType } from "@/lib/enums";

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

export type SerializedValuationEntry = {
  id: string;
  assetId: string;
  date: string;
  value: number;
  source: ValuationSource;
  notes: string | null;
  createdAt: string;
};

export type AssetWithValuations = {
  id: string;
  name: string;
  description: string | null;
  type: AssetType;
  currency: Currency;
  purchaseDate: string;
  purchasePrice: number;
  currentValue: number;
  notes: string | null;
  location: string | null;
  areaQty: number | null;
  areaUnit: string | null;
  depreciationRate: number | null;
  interestRate: number | null;
  maturityDate: string | null;
  principal: number | null;
  expectedCagr: number | null;
  createdAt: string;
  updatedAt: string;
  valuations: SerializedValuationEntry[];
  // Computed
  appreciation: number;
  appreciationPercent: number;
};

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  PROPERTY: "Property",
  VEHICLE: "Vehicle",
  CASH_FD: "Cash / FD",
  GOLD_METALS: "Gold & Metals",
  ART_COLLECTIBLES: "Art & Collectibles",
  OTHER: "Other",
};

export const ASSET_TYPE_COLORS: Record<AssetType, string> = {
  PROPERTY: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  VEHICLE: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  CASH_FD: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  GOLD_METALS: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  ART_COLLECTIBLES: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  OTHER: "bg-slate-500/15 text-slate-600 dark:text-slate-400",
};

export const ASSET_TYPE_CHART_COLORS: Record<AssetType, string> = {
  PROPERTY: "#3b82f6",
  VEHICLE: "#f97316",
  CASH_FD: "#10b981",
  GOLD_METALS: "#f59e0b",
  ART_COLLECTIBLES: "#a855f7",
  OTHER: "#64748b",
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

// ─── Liability types ──────────────────────────────────────────────────────────

export type SerializedPaymentEntry = {
  id: string;
  liabilityId: string;
  date: string;
  amount: number;      // negative = new charges (credit card)
  balanceAfter: number;
  notes: string | null;
  createdAt: string;
};

export type LiabilityWithPayments = {
  id: string;
  name: string;
  type: LiabilityType;
  currency: Currency;
  lender: string;
  originalAmount: number;
  outstandingBalance: number;
  interestRate: number | null;
  monthlyEMI: number | null;
  startDate: string;
  endDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  payments: SerializedPaymentEntry[];
  // Computed
  totalPaid: number;
  paidPercent: number;
};

export const LIABILITY_TYPE_LABELS: Record<LiabilityType, string> = {
  HOME_LOAN: "Home Loan",
  EDUCATION_LOAN: "Education",
  VEHICLE_LOAN: "Vehicle Loan",
  CREDIT_CARD: "Credit Card",
  PERSONAL_LOAN: "Personal Loan",
  INFORMAL: "Informal",
  OTHER: "Other",
};

export const LIABILITY_TYPE_COLORS: Record<LiabilityType, string> = {
  HOME_LOAN: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  EDUCATION_LOAN: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  VEHICLE_LOAN: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  CREDIT_CARD: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  PERSONAL_LOAN: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  INFORMAL: "bg-teal-500/15 text-teal-600 dark:text-teal-400",
  OTHER: "bg-slate-500/15 text-slate-600 dark:text-slate-400",
};

export const LIABILITY_TYPE_CHART_COLORS: Record<LiabilityType, string> = {
  HOME_LOAN: "#3b82f6",
  EDUCATION_LOAN: "#8b5cf6",
  VEHICLE_LOAN: "#f97316",
  CREDIT_CARD: "#f43f5e",
  PERSONAL_LOAN: "#f59e0b",
  INFORMAL: "#14b8a6",
  OTHER: "#64748b",
};

// ─── Cash Flow types ──────────────────────────────────────────────────────────

export type SerializedIncomeSource = {
  id: string;
  name: string;
  amount: number;
  currency: Currency;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SerializedBudgetBucket = {
  id: string;
  name: string;
  type: BucketType;
  amount: number;
  currency: Currency;
  color: string | null;
  order: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export const BUCKET_TYPE_LABELS: Record<BucketType, string> = {
  RECURRING_EXPENSE: "Recurring Expense",
  EMI: "EMI",
  INVESTING: "Investing",
  SAVINGS: "Savings",
  ESSENTIAL: "Essential",
  DISCRETIONARY: "Discretionary",
  OTHER: "Other",
};

export const BUCKET_TYPE_BADGE_COLORS: Record<BucketType, string> = {
  RECURRING_EXPENSE: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  EMI:               "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  INVESTING:         "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  SAVINGS:           "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  ESSENTIAL:         "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  DISCRETIONARY:     "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  OTHER:             "bg-slate-500/15 text-slate-600 dark:text-slate-400",
};

export const BUCKET_TYPE_CHART_COLORS: Record<BucketType, string> = {
  RECURRING_EXPENSE: "#f97316",
  EMI:               "#f43f5e",
  INVESTING:         "#8b5cf6",
  SAVINGS:           "#3b82f6",
  ESSENTIAL:         "#f59e0b",
  DISCRETIONARY:     "#10b981",
  OTHER:             "#64748b",
};
