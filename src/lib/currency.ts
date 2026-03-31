import { Currency } from "@/generated/prisma/client";

export function convertCurrency(
  amount: number,
  fromCurrency: Currency,
  toCurrency: Currency,
  exchangeRate: number // INR per 1 USD
): number {
  if (fromCurrency === toCurrency) return amount;
  if (fromCurrency === Currency.INR && toCurrency === Currency.USD) {
    return amount / exchangeRate;
  }
  if (fromCurrency === Currency.USD && toCurrency === Currency.INR) {
    return amount * exchangeRate;
  }
  return amount;
}

export function formatCurrency(
  amount: number,
  currency: Currency,
  compact = false
): string {
  if (currency === Currency.INR) {
    if (compact && Math.abs(amount) >= 100000) {
      return `₹${(amount / 100000).toFixed(2)}L`;
    }
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(amount);
  }
  if (compact && Math.abs(amount) >= 1000) {
    return `$${(amount / 1000).toFixed(2)}K`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount);
}

export function currencySymbol(currency: Currency): string {
  return currency === Currency.INR ? "₹" : "$";
}
