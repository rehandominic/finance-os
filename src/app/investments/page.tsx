import { getInvestments } from "./actions";
import { InvestmentsDashboard } from "./components/investments-dashboard";
import { InvestmentWithStats } from "@/lib/types";

export default async function InvestmentsPage() {
  const investments = await getInvestments();

  // Serialize Date objects to strings for the client boundary
  const serialized: InvestmentWithStats[] = investments.map((inv) => ({
    ...inv,
    createdAt: inv.createdAt.toISOString(),
    updatedAt: inv.updatedAt.toISOString(),
    transactions: inv.transactions.map((t) => ({
      ...t,
      date: t.date.toISOString(),
      createdAt: t.createdAt.toISOString(),
    })),
  }));

  return <InvestmentsDashboard investments={serialized} />;
}
