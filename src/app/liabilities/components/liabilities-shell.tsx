"use client";

import { useState } from "react";
import { Nav } from "@/app/investments/components/nav";
import { CurrencyContext } from "@/app/investments/components/investments-shell";
import { Currency } from "@/lib/enums";

export function LiabilitiesShell({
  children,
  exchangeRate,
}: {
  children: React.ReactNode;
  exchangeRate: number;
}) {
  const [displayCurrency, setDisplayCurrency] = useState<Currency>(Currency.INR);

  function toggleCurrency() {
    setDisplayCurrency((c) => (c === Currency.INR ? Currency.USD : Currency.INR));
  }

  function toDisplay(amount: number, fromCurrency: Currency): number {
    if (fromCurrency === displayCurrency) return amount;
    if (fromCurrency === Currency.USD && displayCurrency === Currency.INR) return amount * exchangeRate;
    return amount / exchangeRate;
  }

  function fmt(amount: number, fromCurrency: Currency): string {
    const converted = toDisplay(amount, fromCurrency);
    if (displayCurrency === Currency.INR) {
      return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(converted);
    }
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(converted);
  }

  return (
    <CurrencyContext.Provider value={{ displayCurrency, exchangeRate, toggleCurrency, toDisplay, fmt }}>
      <div className="min-h-screen flex flex-col">
        <Nav />
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {children}
        </main>
      </div>
    </CurrencyContext.Provider>
  );
}
