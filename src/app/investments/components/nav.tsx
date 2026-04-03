"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Sun, Moon, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useTheme } from "@/lib/theme";
import { useOptionalCurrency } from "./investments-shell";

const NAV_LINKS = [
  { label: "Investments", href: "/investments", enabled: true },
  { label: "Projector",   href: "/projector",   enabled: true },
  { label: "Assets",      href: "/assets",      enabled: true },
  { label: "Liabilities", href: "/liabilities", enabled: false },
  { label: "Goals",       href: "/goals",       enabled: false },
];

export function Nav() {
  const { resolvedTheme, setTheme } = useTheme();
  const currency = useOptionalCurrency();
  const pathname = usePathname();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefreshPrices() {
    setRefreshing(true);
    try {
      const res = await fetch("/api/yahoo/refresh-all", { method: "POST" });
      const data = await res.json();
      if (data.updated > 0) {
        toast.success(`Updated ${data.updated} price${data.updated !== 1 ? "s" : ""}`);
        router.refresh();
      }
      if (data.failed > 0) {
        toast.warning(`Could not fetch ${data.failed} price${data.failed !== 1 ? "s" : ""}: ${data.failedTickers.join(", ")}`);
      }
    } catch {
      toast.error("Failed to refresh prices");
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
        {/* Left: Logo + Nav Links */}
        <div className="flex items-center gap-6">
          <span className="font-bold text-base tracking-tight select-none">
            Finance OS
          </span>
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const isActive = pathname.startsWith(link.href);
              if (!link.enabled) {
                return (
                  <span
                    key={link.href}
                    className="px-3 py-1.5 rounded-md text-sm text-muted-foreground opacity-40 cursor-not-allowed select-none"
                  >
                    {link.label}
                  </span>
                );
              }
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                    isActive
                      ? "bg-muted font-medium text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Refresh prices — only shown when currency context is available (investments routes) */}
          {currency && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshPrices}
              disabled={refreshing}
              className="flex items-center gap-1.5 h-9 text-xs px-2.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 shrink-0 ${refreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">{refreshing ? "Refreshing…" : "Refresh Prices"}</span>
            </Button>
          )}

          {/* Currency Toggle — only when inside InvestmentsShell */}
          {currency && (
            <div className="flex items-center rounded-md border border-border overflow-hidden h-9">
              <button
                onClick={() => currency.displayCurrency !== "INR" && currency.toggleCurrency()}
                className={`px-3 text-xs h-full transition-colors ${
                  currency.displayCurrency === "INR"
                    ? "bg-foreground text-background font-medium"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                ₹<span className="hidden sm:inline"> INR</span>
              </button>
              <button
                onClick={() => currency.displayCurrency !== "USD" && currency.toggleCurrency()}
                className={`px-3 text-xs h-full transition-colors ${
                  currency.displayCurrency === "USD"
                    ? "bg-foreground text-background font-medium"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                $<span className="hidden sm:inline"> USD</span>
              </button>
            </div>
          )}

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>

          {/* Avatar placeholder */}
          <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
            U
          </div>
        </div>
      </div>
    </header>
  );
}
