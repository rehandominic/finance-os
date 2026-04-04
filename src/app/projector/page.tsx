import type { Metadata } from "next";
import { getPortfolioSummary } from "@/app/investments/actions";
import { getBudgetBuckets } from "@/app/cashflow/actions";
import { getAssets } from "@/app/assets/actions";
import { ProjectorView } from "./components/projector-view";
import { BucketType } from "@/lib/enums";

export const metadata: Metadata = {
  title: "Wealth Projector — Finance OS",
  description: "See where compounding takes your portfolio across time and return scenarios.",
};

export default async function ProjectorPage() {
  const [summary, buckets, assets] = await Promise.all([
    getPortfolioSummary(),
    getBudgetBuckets(),
    getAssets(),
  ]);

  const monthlyInvesting = buckets
    .filter((b) => b.type === BucketType.INVESTING)
    .reduce((s, b) => s + b.amount, 0);

  const assetProjections = assets.map((a) => ({
    id: a.id,
    name: a.name,
    currentValue: a.currentValue,
    expectedCagr: a.expectedCagr,
  }));

  return (
    <ProjectorView
      summary={summary}
      monthlyInvesting={monthlyInvesting}
      assetProjections={assetProjections}
    />
  );
}
