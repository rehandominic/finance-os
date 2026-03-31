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
import { Input } from "@/components/ui/input";
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
      // Still populate what we know from search, price can be filled manually
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

  // Close dropdown on outside click
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
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search for a stock, ETF, mutual fund or crypto…"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          className="pl-9 pr-8 h-9"
          autoFocus
        />
        {(searching || fetching) ? (
          <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        ) : query ? (
          <button
            onClick={() => { setQuery(""); setResults([]); setOpen(false); }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-lg border bg-popover shadow-md overflow-hidden">
          <Command shouldFilter={false}>
            <CommandList>
              {results.length === 0 ? (
                <CommandEmpty className="py-4 text-sm text-muted-foreground">
                  No results found.
                </CommandEmpty>
              ) : (
                <CommandGroup>
                  {results.map((r) => (
                    <CommandItem
                      key={r.symbol}
                      value={r.symbol}
                      onSelect={() => handleSelect(r)}
                      className="flex items-center justify-between gap-3 px-3 py-2.5 cursor-pointer"
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
              <div className="border-t px-3 py-2">
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
