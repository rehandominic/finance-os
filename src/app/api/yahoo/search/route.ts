import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query || query.trim().length < 1) {
    return NextResponse.json({ quotes: [] });
  }

  try {
    const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=8&newsCount=0&enableFuzzyQuery=false`;
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      return NextResponse.json({ quotes: [] }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({ quotes: data?.finance?.result?.[0]?.quotes ?? data?.quotes ?? [] });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch from Yahoo Finance" },
      { status: 500 }
    );
  }
}
