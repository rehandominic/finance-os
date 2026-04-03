// Plain string constants mirroring the Prisma enums.
// Use these in client components — never import @/generated/prisma/client on the client.

export const Currency = {
  INR: "INR",
  USD: "USD",
} as const;
export type Currency = (typeof Currency)[keyof typeof Currency];

export const InvestmentType = {
  INDIA_STOCK: "INDIA_STOCK",
  INDIA_MF: "INDIA_MF",
  US_STOCK: "US_STOCK",
  US_ETF: "US_ETF",
  CRYPTO: "CRYPTO",
  PRIVATE: "PRIVATE",
} as const;
export type InvestmentType = (typeof InvestmentType)[keyof typeof InvestmentType];

export const Geography = {
  INDIA: "INDIA",
  US: "US",
  OTHER: "OTHER",
} as const;
export type Geography = (typeof Geography)[keyof typeof Geography];

export const TransactionType = {
  BUY: "BUY",
  SELL: "SELL",
  SIP: "SIP",
  DIVIDEND: "DIVIDEND",
} as const;
export type TransactionType = (typeof TransactionType)[keyof typeof TransactionType];

export const AssetType = {
  PROPERTY: "PROPERTY",
  VEHICLE: "VEHICLE",
  CASH_FD: "CASH_FD",
  GOLD_METALS: "GOLD_METALS",
  ART_COLLECTIBLES: "ART_COLLECTIBLES",
  OTHER: "OTHER",
} as const;
export type AssetType = (typeof AssetType)[keyof typeof AssetType];

export const ValuationSource = {
  PURCHASE: "PURCHASE",
  MANUAL: "MANUAL",
  AUTO_DEPRECIATION: "AUTO_DEPRECIATION",
  AUTO_INTEREST: "AUTO_INTEREST",
} as const;
export type ValuationSource = (typeof ValuationSource)[keyof typeof ValuationSource];
