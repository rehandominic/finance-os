import { InvestmentType, Geography, Currency } from "@/lib/enums";

export interface YahooSearchResult {
  symbol: string;
  shortname?: string;
  longname?: string;
  exchDisp?: string;
  quoteType?: string;
  sector?: string;
}

export interface YahooQuoteResult {
  regularMarketPrice: number;
  chartPreviousClose: number;
  currency: string;
  exchangeName: string;
}

// ─── Auto-map Yahoo Finance result to our InvestmentType ─────────────────────
export function mapToInvestmentType(result: YahooSearchResult): InvestmentType | null {
  const { symbol, quoteType, exchDisp } = result;
  const isIndian = symbol.endsWith(".NS") || symbol.endsWith(".BO");
  const isUSExchange =
    exchDisp === "NYSE" ||
    exchDisp === "NASDAQ" ||
    exchDisp === "NMS" ||
    exchDisp === "NGM" ||
    exchDisp === "PCX";

  if (isIndian && quoteType === "EQUITY") return InvestmentType.INDIA_STOCK;
  if (isIndian && quoteType === "MUTUALFUND") return InvestmentType.INDIA_MF;
  if (quoteType === "ETF") return InvestmentType.US_ETF;
  if (quoteType === "EQUITY" && isUSExchange) return InvestmentType.US_STOCK;
  if (quoteType === "CRYPTOCURRENCY") return InvestmentType.CRYPTO;
  return null;
}

export function mapToGeography(type: InvestmentType): Geography {
  if (type === InvestmentType.INDIA_STOCK || type === InvestmentType.INDIA_MF)
    return Geography.INDIA;
  if (type === InvestmentType.US_STOCK || type === InvestmentType.US_ETF)
    return Geography.US;
  return Geography.OTHER;
}

export function mapToCurrency(geography: Geography): Currency {
  if (geography === Geography.INDIA) return Currency.INR;
  if (geography === Geography.US) return Currency.USD;
  return Currency.USD;
}
