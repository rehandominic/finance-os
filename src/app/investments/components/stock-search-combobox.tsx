"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Loader2, Search, X } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { InvestmentType, Geography, Currency } from "@/lib/enums";
import { mapToInvestmentType, mapToGeography, mapToCurrency } from "@/lib/yahoo-finance";

export type SelectedInvestment = {
  name: string;
  ticker: string;
  yahooTicker: string;
  type: InvestmentType;
  geography: Geography;
  currency: Currency;
  sector: string;
  currentPrice: number;
  previousClose: number;
};

type SearchResult = {
  symbol: string;
  shortname?: string;
  longname?: string;
  exchDisp?: string;
  quoteType?: string;
  sector?: string;
};

interface Props {
  onSelect: (inv: SelectedInvestment) => void;
  onManual: () => void;
}

const EXCHANGE_COLORS: Record<string, string> = {
  NSE: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  BSE: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  NYSE: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  NASDAQ: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  NMS: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  CCC: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
};

export function StockSearchCombobox({ onSelect, onManual }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [fetching, setFetching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 1) { setResults([]); setOpen(false); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/yahoo/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.quotes ?? []);
      setOpen(true);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  function handleInput(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 300);
  }

  async function handleSelect(result: SearchResult) {
    setFetching(true);
    setOpen(false);
    setQuery(result.longname ?? result.shortname ?? result.symbol);
    try {
      const res = await fetch(`/api/yahoo/quote?symbol=${encodeURIComponent(result.symbol)}`);
      const quote = await res.json();
      const mappedType = mapToInvestmentType(result);
      const type = mappedType ?? InvestmentType.INDIA_STOCK;
      const geography = mapToGeography(type);
      const currency = mapToCurrency(geography);
      onSelect({
        name: result.longname ?? result.shortname ?? result.symbol,
        ticker: result.symbol,
        yahooTicker: result.symbol,
        type,
        geography,
        currency,
        sector: result.sector ?? "",
        currentPrice: quote.regularMarketPrice ?? 0,
        previousClose: quote.chartPreviousClose ?? 0,
      });
    } catch {
      const mappedType = mapToInvestmentType(result);
      const type = mappedType ?? InvestmentType.INDIA_STOCK;
      const geography = mapToGeography(type);
      const currency = mapToCurrency(geography);
      onSelect({
        name: result.longname ?? result.shortname ?? result.symbol,
        ticker: result.symbol,
        yahooTicker: result.symbol,
        type,
        geography,
        currency,
        sector: result.sector ?? "",
        currentPrice: 0,
        previousClose: 0,
      });
    } finally {
      setFetching(false);
    }
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={containerRef} className="flex flex-col gap-3">
      {/*
        Flex-row search bar — icon is a sibling of the input, NOT absolutely positioned.
        This guarantees text never starts under the icon on any device.
      */}
      <div className="flex items-center gap-3 h-10 pl-3.5 pr-3 rounded-lg border border-input bg-transparent transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20">
        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
        <input
          placeholder="Search stocks, ETFs, mutual funds, crypto…"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          autoFocus
          className="flex-1 min-w-0 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
        />
        {(searching || fetching) ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
        ) : query ? (
          <button
            onClick={() => { setQuery(""); setResults([]); setOpen(false); }}
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {/* Inline results */}
      {open && (
        <div className="rounded-lg border bg-popover shadow-sm overflow-hidden">
          <Command shouldFilter={false}>
            <CommandList className="max-h-64">
              {results.length === 0 ? (
                <CommandEmpty className="py-6 text-sm text-muted-foreground text-center">
                  No results found.
                </CommandEmpty>
              ) : (
                <CommandGroup>
                  {results.map((r) => (
                    <CommandItem
                      key={r.symbol}
                      value={r.symbol}
                      onSelect={() => handleSelect(r)}
                      className="flex items-center justify-between gap-3 px-3 py-3 cursor-pointer"
                    >
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-sm font-medium truncate">
                          {r.longname ?? r.shortname ?? r.symbol}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono">{r.symbol}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {r.quoteType && (
                          <span className="text-xs text-muted-foreground">{r.quoteType}</span>
                        )}
                        {r.exchDisp && (
                          <Badge
                            variant="secondary"
                            className={`text-[10px] px-1.5 py-0 ${EXCHANGE_COLORS[r.exchDisp] ?? ""}`}
                          >
                            {r.exchDisp}
                          </Badge>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              <div className="border-t px-3 py-2.5">
                <button
                  onClick={() => { setOpen(false); onManual(); }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Can&apos;t find it? Add manually →
                </button>
              </div>
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  );
}
