"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { InvestmentWithStats } from "@/lib/types";
import { InvestmentType } from "@/lib/enums";
import { PortfolioSummaryCards } from "./portfolio-summary-cards";
import { PortfolioAreaChart } from "./portfolio-area-chart";
import { AssetAllocationDonut } from "./asset-allocation-donut";
import { HoldingsFilterBar, FilterType } from "./holdings-filter-bar";
import { DataTable } from "./holdings-table/data-table";

interface Props {
  investments: InvestmentWithStats[];
}

export function InvestmentsDashboard({ investments }: Props) {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<FilterType>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredInvestments = useMemo(() => {
    return investments.filter((inv) => {
      if (activeFilter !== "ALL" && inv.type !== activeFilter) return false;
      return true;
    });
  }, [investments, activeFilter]);

  function handleDonutFilter(type: InvestmentType | null) {
    setActiveFilter(type ?? "ALL");
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <PortfolioSummaryCards investments={investments} />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <PortfolioAreaChart investments={investments} />
        <AssetAllocationDonut
          investments={investments}
          onTypeFilter={handleDonutFilter}
        />
      </div>

      {/* Holdings */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Holdings
        </h2>

        <HoldingsFilterBar
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onAddClick={() => router.push("/investments/add")}
        />

        <DataTable investments={filteredInvestments} globalFilter={searchQuery} />
      </div>
    </div>
  );
}
