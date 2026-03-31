"use client";

import { useState, useCallback } from "react";
import { Search, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InvestmentType } from "@/lib/enums";
import { INVESTMENT_TYPE_LABELS } from "@/lib/types";

export type FilterType = "ALL" | InvestmentType;

interface Props {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onAddClick: () => void;
}

const TABS: { value: FilterType; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: InvestmentType.INDIA_STOCK, label: INVESTMENT_TYPE_LABELS.INDIA_STOCK },
  { value: InvestmentType.INDIA_MF, label: INVESTMENT_TYPE_LABELS.INDIA_MF },
  { value: InvestmentType.US_STOCK, label: INVESTMENT_TYPE_LABELS.US_STOCK },
  { value: InvestmentType.US_ETF, label: INVESTMENT_TYPE_LABELS.US_ETF },
  { value: InvestmentType.CRYPTO, label: INVESTMENT_TYPE_LABELS.CRYPTO },
  { value: InvestmentType.PRIVATE, label: INVESTMENT_TYPE_LABELS.PRIVATE },
];

export function HoldingsFilterBar({
  activeFilter,
  onFilterChange,
  searchQuery,
  onSearchChange,
  onAddClick,
}: Props) {
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = useCallback(
    (value: string) => {
      setLocalSearch(value);
      if (debounceTimer) clearTimeout(debounceTimer);
      const timer = setTimeout(() => onSearchChange(value), 300);
      setDebounceTimer(timer);
    },
    [debounceTimer, onSearchChange]
  );

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      {/* Type Filter Tabs */}
      <Tabs value={activeFilter} onValueChange={(v) => onFilterChange(v as FilterType)}>
        <TabsList className="h-8 p-0.5 gap-0.5 bg-muted/60">
          {TABS.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="h-7 px-3 text-xs rounded-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Right: Search + Add */}
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <div className="relative flex-1 sm:w-52">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search holdings…"
            value={localSearch}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
        <Button size="sm" className="h-8 gap-1.5 text-xs shrink-0" onClick={onAddClick}>
          <Plus className="h-3.5 w-3.5" />
          Add Investment
        </Button>
      </div>
    </div>
  );
}
