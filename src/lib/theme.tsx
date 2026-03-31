"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: "system",
  resolvedTheme: "light",
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getStoredTheme(): Theme {
  try {
    return (localStorage.getItem("theme") as Theme) || "system";
  } catch {
    return "system";
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");

  // Read stored theme on mount
  useEffect(() => {
    const stored = getStoredTheme();
    setThemeState(stored);
    const resolved = stored === "system" ? getSystemTheme() : stored;
    setResolvedTheme(resolved);
  }, []);

  // Apply theme changes
  useEffect(() => {
    const resolved: ResolvedTheme = theme === "system" ? getSystemTheme() : theme;
    setResolvedTheme(resolved);
    document.documentElement.classList.toggle("dark", resolved === "dark");
    try {
      localStorage.setItem("theme", theme);
    } catch {}

    // Keep color-scheme in sync for native UI elements
    document.documentElement.style.colorScheme = resolved;
  }, [theme]);

  // Sync with OS preference changes when theme is "system"
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    function handleChange() {
      const resolved = mq.matches ? "dark" : "light";
      setResolvedTheme(resolved);
      document.documentElement.classList.toggle("dark", resolved === "dark");
      document.documentElement.style.colorScheme = resolved;
    }
    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme: setThemeState }}>
      {children}
    </ThemeContext.Provider>
  );
}
