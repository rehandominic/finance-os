import { prisma } from "@/lib/prisma";
import { IntelligenceClient } from "./client";

export default async function IntelligencePage() {
  const investments = await prisma.investment.findMany({
    where: {
      yahooTicker: { not: null },
      type: { in: ["INDIA_STOCK", "US_STOCK", "CRYPTO"] },
    },
    select: { id: true, name: true, ticker: true, yahooTicker: true, type: true },
    orderBy: { name: "asc" },
  });

  // Deduplicate by yahooTicker — keep first occurrence
  const seen = new Set<string>();
  const picks = investments
    .filter((inv) => {
      if (seen.has(inv.yahooTicker!)) return false;
      seen.add(inv.yahooTicker!);
      return true;
    })
    .map((inv) => ({
      id: inv.id,
      name: inv.name,
      ticker: inv.ticker,
      yahooTicker: inv.yahooTicker!,
      type: inv.type,
    }));

  return <IntelligenceClient investments={picks} />;
}
