import { NextRequest, NextResponse } from "next/server";

const SUBREDDITS = ["wallstreetbets", "stocks", "investing", "IndiaInvestments"];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  const name = searchParams.get("name") ?? "";

  if (!symbol) {
    return NextResponse.json({ error: "symbol is required" }, { status: 400 });
  }

  // Strip exchange suffix for cleaner search queries
  const cleanSymbol = symbol.replace(/\.(NS|BO)$/, "");
  const query = name ? `${cleanSymbol} ${name}` : cleanSymbol;

  // For India stocks, also search IndiaInvestments; for US stocks skip it
  const isIndian = symbol.endsWith(".NS") || symbol.endsWith(".BO");
  const targetSubs = isIndian
    ? ["IndiaInvestments", "IndianStockMarket", "stocks"]
    : ["wallstreetbets", "stocks", "investing"];

  try {
    // Fetch from site-wide search + targeted subreddits in parallel
    const [siteRes, ...subRes] = await Promise.allSettled([
      fetch(
        `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=new&limit=15&type=link&t=week`,
        { headers: { "User-Agent": "finance-os/1.0" }, next: { revalidate: 0 } }
      ).then((r) => r.json()),
      ...targetSubs.slice(0, 2).map((sub) =>
        fetch(
          `https://www.reddit.com/r/${sub}/search.json?q=${encodeURIComponent(cleanSymbol)}&sort=new&limit=8&restrict_sr=true&t=week`,
          { headers: { "User-Agent": "finance-os/1.0" }, next: { revalidate: 0 } }
        ).then((r) => r.json())
      ),
    ]);

    const seen = new Set<string>();
    const posts: RedditPost[] = [];

    function addPosts(data: RedditSearchResponse) {
      for (const child of data?.data?.children ?? []) {
        const p = child.data;
        if (!seen.has(p.id) && p.title) {
          seen.add(p.id);
          posts.push({
            id: p.id,
            title: p.title,
            subreddit: p.subreddit,
            url: `https://www.reddit.com${p.permalink}`,
            ups: p.ups,
            num_comments: p.num_comments,
            created_utc: p.created_utc,
          });
        }
      }
    }

    if (siteRes.status === "fulfilled") addPosts(siteRes.value);
    for (const res of subRes) {
      if (res.status === "fulfilled") addPosts(res.value);
    }

    posts.sort((a, b) => b.created_utc - a.created_utc);

    return NextResponse.json({ posts: posts.slice(0, 20) });
  } catch {
    return NextResponse.json({ error: "Failed to fetch from Reddit" }, { status: 500 });
  }
}

interface RedditPost {
  id: string;
  title: string;
  subreddit: string;
  url: string;
  ups: number;
  num_comments: number;
  created_utc: number;
}

interface RedditSearchResponse {
  data?: {
    children?: Array<{ data: RedditPost & { permalink: string } }>;
  };
}
