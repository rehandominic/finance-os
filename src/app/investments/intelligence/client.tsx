"use client";

import { useState, useEffect, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { InvestmentType } from "@/lib/enums";
import { RefreshCw, ExternalLink, MessageSquare, ArrowUp, ChevronDown, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// ─── Types ────────────────────────────────────────────────────────────────────

interface InvestmentPick {
  id: string;
  name: string;
  ticker: string | null;
  yahooTicker: string;
  type: InvestmentType;
}

interface YahooNewsItem {
  title: string;
  publisher: string;
  link: string;
  providerPublishTime: number;
}

interface FinnhubNewsItem {
  headline: string;
  summary: string;
  source: string;
  url: string;
  datetime: number;
}

interface NormalizedArticle {
  title: string;
  summary?: string;
  publisher: string;
  url: string;
  publishedAt: number;
  source: "yahoo" | "finnhub";
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(unixSeconds: number): string {
  const diff = Math.floor(Date.now() / 1000) - unixSeconds;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatUps(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

const TYPE_LABELS: Partial<Record<InvestmentType, string>> = {
  INDIA_STOCK: "India",
  US_STOCK: "US",
  CRYPTO: "Crypto",
};

const TYPE_COLORS: Partial<Record<InvestmentType, string>> = {
  INDIA_STOCK: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  US_STOCK: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  CRYPTO: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function NewsCard({ article }: { article: NormalizedArticle }) {
  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-xl border bg-card p-4 space-y-2 hover:bg-muted/40 transition-colors group"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-medium text-muted-foreground truncate">{article.publisher}</span>
          <span className="text-xs text-muted-foreground opacity-60 shrink-0">· {timeAgo(article.publishedAt)}</span>
        </div>
        <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
      </div>
      <p className="text-sm font-medium leading-snug line-clamp-2">{article.title}</p>
      {article.summary && (
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{article.summary}</p>
      )}
      <span
        className={`inline-block text-[10px] px-1.5 py-0.5 rounded font-medium ${
          article.source === "finnhub"
            ? "bg-violet-500/10 text-violet-600 dark:text-violet-400"
            : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
        }`}
      >
        {article.source === "finnhub" ? "Finnhub" : "Yahoo"}
      </span>
    </a>
  );
}

function NewsSkeletons() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-card p-4 space-y-2">
          <div className="flex gap-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-12" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

function RedditCard({ post }: { post: RedditPost }) {
  return (
    <a
      href={post.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block py-3 border-b last:border-b-0 hover:bg-muted/30 -mx-1 px-1 rounded transition-colors"
    >
      <p className="text-xs font-medium leading-snug line-clamp-2 mb-1.5">{post.title}</p>
      <div className="flex items-center gap-3">
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-600 dark:text-orange-400 font-medium">
          r/{post.subreddit}
        </span>
        <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
          <ArrowUp className="h-2.5 w-2.5" /> {formatUps(post.ups)}
        </span>
        <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
          <MessageSquare className="h-2.5 w-2.5" /> {post.num_comments}
        </span>
        <span className="text-[10px] text-muted-foreground ml-auto">{timeAgo(post.created_utc)}</span>
      </div>
    </a>
  );
}

function RedditSkeletons() {
  return (
    <div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="py-3 border-b last:border-b-0 space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
          <div className="flex gap-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Stock Picker ─────────────────────────────────────────────────────────────

function StockPicker({
  investments,
  selected,
  onSelect,
}: {
  investments: InvestmentPick[];
  selected: InvestmentPick | null;
  onSelect: (inv: InvestmentPick) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full rounded-2xl border-2 border-border bg-card hover:border-foreground/30 transition-colors p-5 flex items-center justify-between gap-4 text-left"
      >
        {selected ? (
          <div className="flex items-center gap-4 min-w-0">
            {/* Avatar circle */}
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-lg font-bold shrink-0 select-none">
              {selected.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-lg font-semibold tracking-tight leading-tight truncate">{selected.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {selected.ticker && (
                  <span className="text-sm font-mono text-muted-foreground">{selected.ticker}</span>
                )}
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                    TYPE_COLORS[selected.type] ?? "bg-muted text-muted-foreground"
                  }`}
                >
                  {TYPE_LABELS[selected.type] ?? selected.type}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <span className="text-muted-foreground">Select a security…</span>
        )}
        <ChevronDown
          className={`h-5 w-5 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          {/* Dropdown */}
          <div className="absolute left-0 right-0 top-full mt-2 z-20 rounded-xl border bg-card shadow-lg overflow-hidden">
            <div className="max-h-72 overflow-y-auto">
              {investments.map((inv) => {
                const isActive = selected?.id === inv.id;
                return (
                  <button
                    key={inv.id}
                    onClick={() => {
                      onSelect(inv);
                      setOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/60 transition-colors ${
                      isActive ? "bg-muted" : ""
                    }`}
                  >
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold shrink-0">
                      {inv.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{inv.name}</p>
                      {inv.ticker && (
                        <p className="text-xs font-mono text-muted-foreground">{inv.ticker}</p>
                      )}
                    </div>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${
                        TYPE_COLORS[inv.type] ?? "bg-muted text-muted-foreground"
                      }`}
                    >
                      {TYPE_LABELS[inv.type] ?? inv.type}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function IntelligenceClient({ investments }: { investments: InvestmentPick[] }) {
  const [selected, setSelected] = useState<InvestmentPick | null>(
    investments.length > 0 ? investments[0] : null
  );
  const [articles, setArticles] = useState<NormalizedArticle[]>([]);
  const [redditPosts, setRedditPosts] = useState<RedditPost[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [redditLoading, setRedditLoading] = useState(false);
  const [redditKey, setRedditKey] = useState(0);

  const fetchData = useCallback(async (inv: InvestmentPick) => {
    setNewsLoading(true);
    setRedditLoading(true);
    setArticles([]);
    setRedditPosts([]);

    const [yahooRes, finnhubRes, redditRes] = await Promise.allSettled([
      fetch(`/api/yahoo/news?symbol=${encodeURIComponent(inv.yahooTicker)}`).then((r) => r.json()),
      fetch(`/api/finnhub/news?symbol=${encodeURIComponent(inv.yahooTicker)}`).then((r) => r.json()),
      fetch(`/api/reddit/posts?symbol=${encodeURIComponent(inv.yahooTicker)}&name=${encodeURIComponent(inv.name)}`).then((r) => r.json()),
    ]);

    const normalized: NormalizedArticle[] = [];

    if (yahooRes.status === "fulfilled" && yahooRes.value?.news) {
      for (const item of yahooRes.value.news as YahooNewsItem[]) {
        normalized.push({
          title: item.title,
          publisher: item.publisher,
          url: item.link,
          publishedAt: item.providerPublishTime,
          source: "yahoo",
        });
      }
    }

    if (finnhubRes.status === "fulfilled" && finnhubRes.value?.news) {
      for (const item of finnhubRes.value.news as FinnhubNewsItem[]) {
        const dupe = normalized.some(
          (a) => a.title.toLowerCase().slice(0, 60) === item.headline.toLowerCase().slice(0, 60)
        );
        if (!dupe) {
          normalized.push({
            title: item.headline,
            summary: item.summary || undefined,
            publisher: item.source,
            url: item.url,
            publishedAt: item.datetime,
            source: "finnhub",
          });
        }
      }
    }

    normalized.sort((a, b) => b.publishedAt - a.publishedAt);
    setArticles(normalized);
    setNewsLoading(false);

    if (redditRes.status === "fulfilled" && redditRes.value?.posts) {
      setRedditPosts(redditRes.value.posts as RedditPost[]);
    }
    setRedditLoading(false);
  }, []);

  useEffect(() => {
    if (selected) fetchData(selected);
  }, [selected, redditKey, fetchData]);

  if (investments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-muted-foreground text-sm">No stocks or crypto found in your portfolio.</p>
        <p className="text-muted-foreground text-xs mt-1">Add India stocks, US stocks, or crypto to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page label + back button */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Intelligence
        </p>
        <Link href="/investments">
          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Investments
          </Button>
        </Link>
      </div>

      {/* Prominent stock picker */}
      <StockPicker investments={investments} selected={selected} onSelect={setSelected} />

      {/* Active company label */}
      {selected && (
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold tracking-tight">{selected.name}</h2>
          {selected.ticker && (
            <span className="text-base font-mono text-muted-foreground">{selected.ticker}</span>
          )}
        </div>
      )}

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* News Feed */}
        <div className="lg:col-span-2 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Latest News
          </p>
          {newsLoading ? (
            <NewsSkeletons />
          ) : articles.length === 0 ? (
            <div className="rounded-xl border bg-muted/40 p-6 text-center">
              <p className="text-sm text-muted-foreground">No news found.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {articles.map((article, i) => (
                <NewsCard key={i} article={article} />
              ))}
            </div>
          )}
        </div>

        {/* Reddit Discussion */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Community Buzz
            </p>
            <button
              onClick={() => setRedditKey((k) => k + 1)}
              disabled={redditLoading}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
            >
              <RefreshCw className={`h-3 w-3 ${redditLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          <div className="rounded-xl border bg-card p-4">
            {redditLoading ? (
              <RedditSkeletons />
            ) : redditPosts.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                No recent Reddit discussions found.
              </p>
            ) : (
              <div>
                {redditPosts.map((post) => (
                  <RedditCard key={post.id} post={post} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
