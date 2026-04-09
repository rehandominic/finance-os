import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");

  if (!symbol) {
    return NextResponse.json({ error: "symbol is required" }, { status: 400 });
  }

  // StockTwits only covers US-listed symbols — reject India tickers
  if (symbol.endsWith(".NS") || symbol.endsWith(".BO")) {
    return NextResponse.json({ supported: false, messages: [], bullish: 0, bearish: 0 });
  }

  try {
    const url = `https://api.stocktwits.com/api/2/streams/symbol/${encodeURIComponent(symbol)}.json`;
    const res = await fetch(url, { next: { revalidate: 0 } });

    if (!res.ok) {
      return NextResponse.json({ supported: true, messages: [], bullish: 0, bearish: 0 }, { status: res.status });
    }

    const data = await res.json();
    const messages: StocktwitsMessage[] = data?.messages ?? [];

    let bullish = 0;
    let bearish = 0;
    for (const msg of messages) {
      const sentiment = msg.entities?.sentiment?.basic;
      if (sentiment === "Bullish") bullish++;
      else if (sentiment === "Bearish") bearish++;
    }

    return NextResponse.json({ supported: true, messages, bullish, bearish });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch from StockTwits" },
      { status: 500 }
    );
  }
}

interface StocktwitsMessage {
  id: number;
  body: string;
  created_at: string;
  user: { username: string };
  entities?: { sentiment?: { basic?: string } };
  likes?: { total: number };
}
