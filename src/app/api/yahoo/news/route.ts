import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");

  if (!symbol) {
    return NextResponse.json({ error: "symbol is required" }, { status: 400 });
  }

  try {
    const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(symbol)}&quotesCount=0&newsCount=10&newsQueryType=aggregated&enableFuzzyQuery=false`;
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      return NextResponse.json({ news: [] }, { status: res.status });
    }

    const data = await res.json();
    const news: YahooNewsItem[] =
      data?.finance?.result?.[0]?.news ?? data?.news ?? [];

    return NextResponse.json({ news });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch from Yahoo Finance" },
      { status: 500 }
    );
  }
}

interface YahooNewsItem {
  title: string;
  publisher: string;
  link: string;
  providerPublishTime: number;
  thumbnail?: { resolutions?: { url: string }[] };
  relatedTickers?: string[];
}
