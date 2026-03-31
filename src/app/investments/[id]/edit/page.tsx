import { notFound } from "next/navigation";
import { getInvestment } from "../../actions";
import { EditInvestmentClient } from "./client";
import { InvestmentWithStats } from "@/lib/types";

export default async function EditInvestmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let investment: InvestmentWithStats;
  try {
    const raw = await getInvestment(id);
    // Serialize Date objects to strings for the client boundary
    investment = {
      ...raw,
      createdAt: raw.createdAt.toISOString(),
      updatedAt: raw.updatedAt.toISOString(),
      transactions: raw.transactions.map((t) => ({
        ...t,
        date: t.date.toISOString(),
        createdAt: t.createdAt.toISOString(),
      })),
    } as unknown as InvestmentWithStats;
  } catch {
    notFound();
  }

  return <EditInvestmentClient investment={investment} />;
}
