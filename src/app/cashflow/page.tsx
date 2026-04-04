import type { Metadata } from "next";
import { getIncomeSources, getBudgetBuckets } from "@/app/cashflow/actions";
import { CashflowView } from "./components/cashflow-view";

export const metadata: Metadata = {
  title: "Cash Flow — Finance OS",
  description: "Plan where every rupee goes each month.",
};

export default async function CashflowPage() {
  const [incomeSources, budgetBuckets] = await Promise.all([
    getIncomeSources(),
    getBudgetBuckets(),
  ]);
  return <CashflowView initialIncomeSources={incomeSources} initialBudgetBuckets={budgetBuckets} />;
}
