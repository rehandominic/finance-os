"use client";

import { ThemeProvider } from "@/lib/theme";
import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <TooltipProvider delay={300}>
        {children}
      </TooltipProvider>
    </ThemeProvider>
  );
}
