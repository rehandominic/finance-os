import { z } from "zod";
import { InvestmentType, Geography, Currency, TransactionType, AssetType, ValuationSource, LiabilityType, BucketType } from "@/generated/prisma/client";

export const InvestmentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  ticker: z.string().optional(),
  yahooTicker: z.string().optional(),
  type: z.nativeEnum(InvestmentType),
  geography: z.nativeEnum(Geography),
  currency: z.nativeEnum(Currency),
  sector: z.string().optional(),
  currentPrice: z.number().positive("Current price must be positive"),
  previousClose: z.number().optional(),
  notes: z.string().optional(),
});

export const TransactionSchema = z.object({
  investmentId: z.string().min(1),
  date: z.coerce.date(),
  type: z.nativeEnum(TransactionType),
  quantity: z.number().positive("Quantity must be positive"),
  pricePerUnit: z.number().positive("Price must be positive"),
  fees: z.number().min(0).default(0),
  notes: z.string().optional(),
});

export const CreateInvestmentWithTransactionSchema = z.object({
  investment: InvestmentSchema,
  transaction: TransactionSchema.omit({ investmentId: true }),
});

export const UpdatePriceSchema = z.object({
  currentPrice: z.number().positive(),
  previousClose: z.number().optional(),
});

export type InvestmentInput = z.infer<typeof InvestmentSchema>;
export type TransactionInput = z.infer<typeof TransactionSchema>;
export type CreateInvestmentWithTransactionInput = z.infer<
  typeof CreateInvestmentWithTransactionSchema
>;

export const AssetSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  type: z.nativeEnum(AssetType),
  currency: z.nativeEnum(Currency),
  purchaseDate: z.coerce.date(),
  purchasePrice: z.number().positive("Purchase price must be positive"),
  currentValue: z.number().min(0, "Current value must be non-negative"),
  notes: z.string().optional(),
  // Property
  location: z.string().optional(),
  areaQty: z.number().positive().optional(),
  areaUnit: z.string().optional(),
  // Vehicle
  depreciationRate: z.number().min(0).max(100).optional(),
  // Cash / FD
  interestRate: z.number().min(0).optional(),
  maturityDate: z.coerce.date().optional(),
  principal: z.number().positive().optional(),
  // Projector
  expectedCagr: z.number().min(0).max(100).optional(),
});

export const ValuationEntrySchema = z.object({
  assetId: z.string().min(1),
  date: z.coerce.date(),
  value: z.number().min(0),
  source: z.nativeEnum(ValuationSource),
  notes: z.string().optional(),
});

export type AssetInput = z.infer<typeof AssetSchema>;
export type ValuationEntryInput = z.infer<typeof ValuationEntrySchema>;

export const LiabilitySchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.nativeEnum(LiabilityType),
  currency: z.nativeEnum(Currency),
  lender: z.string().min(1, "Lender is required"),
  originalAmount: z.coerce.number().positive("Must be positive"),
  outstandingBalance: z.coerce.number().min(0, "Must be non-negative"),
  interestRate: z.coerce.number().min(0).optional(),
  monthlyEMI: z.coerce.number().min(0).optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
  notes: z.string().optional(),
});

export const PaymentEntrySchema = z.object({
  liabilityId: z.string().min(1),
  date: z.coerce.date(),
  amount: z.coerce.number(),         // negative = new charges
  balanceAfter: z.coerce.number().min(0, "Balance must be non-negative"),
  notes: z.string().optional(),
});

export type LiabilityInput = z.infer<typeof LiabilitySchema>;
export type PaymentEntryInput = z.infer<typeof PaymentEntrySchema>;

export const IncomeSourceSchema = z.object({
  name: z.string().min(1, "Name is required"),
  amount: z.coerce.number().positive("Amount must be positive"),
  currency: z.nativeEnum(Currency),
  notes: z.string().optional(),
});

export const BudgetBucketSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.nativeEnum(BucketType),
  amount: z.coerce.number().positive("Amount must be positive"),
  currency: z.nativeEnum(Currency),
  color: z.string().optional(),
  order: z.coerce.number().int().min(0).default(0),
  notes: z.string().optional(),
});

export type IncomeSourceInput = z.infer<typeof IncomeSourceSchema>;
export type BudgetBucketInput = z.infer<typeof BudgetBucketSchema>;
