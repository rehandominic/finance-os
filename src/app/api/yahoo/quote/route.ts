import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");

  if (!symbol) {
    return NextResponse.json({ error: "symbol is required" }, { status: 400 });
  }

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d`;
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Yahoo Finance returned ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;

    if (!meta) {
      return NextResponse.json({ error: "No data returned" }, { status: 404 });
    }

    return NextResponse.json({
      regularMarketPrice: meta.regularMarketPrice,
      chartPreviousClose: meta.chartPreviousClose,
      currency: meta.currency,
      exchangeName: meta.exchangeName,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch from Yahoo Finance" },
      { status: 500 }
    );
  }
}
