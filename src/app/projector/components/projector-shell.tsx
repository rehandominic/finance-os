"use client";

import { Nav } from "@/app/investments/components/nav";

export function ProjectorShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {children}
      </main>
    </div>
  );
}
