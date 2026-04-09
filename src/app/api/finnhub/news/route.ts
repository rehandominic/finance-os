import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");

  if (!symbol) {
    return NextResponse.json({ error: "symbol is required" }, { status: 400 });
  }

  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ news: [] });
  }

  // Convert Yahoo Finance ticker format to Finnhub format
  // .NS → NSE:SYMBOL, .BO → BSE:SYMBOL, US tickers pass through unchanged
  let finnhubSymbol = symbol;
  if (symbol.endsWith(".NS")) {
    finnhubSymbol = `NSE:${symbol.slice(0, -3)}`;
  } else if (symbol.endsWith(".BO")) {
    finnhubSymbol = `BSE:${symbol.slice(0, -3)}`;
  }

  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);

  const from = sevenDaysAgo.toISOString().split("T")[0];
  const to = today.toISOString().split("T")[0];

  try {
    const url = `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(finnhubSymbol)}&from=${from}&to=${to}&token=${apiKey}`;
    const res = await fetch(url, { next: { revalidate: 0 } });

    if (!res.ok) {
      return NextResponse.json({ news: [] }, { status: res.status });
    }

    const news = await res.json();
    return NextResponse.json({ news: Array.isArray(news) ? news : [] });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch from Finnhub" },
      { status: 500 }
    );
  }
}
