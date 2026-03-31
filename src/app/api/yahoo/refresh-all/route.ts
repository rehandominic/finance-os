import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST() {
  const investments = await prisma.investment.findMany({
    where: { yahooTicker: { not: null } },
    select: { id: true, yahooTicker: true },
  });

  const results = { updated: 0, failed: 0, failedTickers: [] as string[] };

  for (const inv of investments) {
    if (!inv.yahooTicker) continue;

    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(inv.yahooTicker)}?range=1d&interval=1d`;
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        },
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const meta = data?.chart?.result?.[0]?.meta;
      if (!meta?.regularMarketPrice) throw new Error("No price data");

      await prisma.investment.update({
        where: { id: inv.id },
        data: {
          currentPrice: meta.regularMarketPrice,
          previousClose: meta.chartPreviousClose ?? null,
        },
      });

      results.updated++;
    } catch {
      results.failed++;
      results.failedTickers.push(inv.yahooTicker);
    }

    await sleep(200);
  }

  return NextResponse.json(results);
}
