import { z } from "zod";
import { InvestmentType, Geography, Currency, TransactionType, AssetType, ValuationSource } from "@/generated/prisma/client";

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
