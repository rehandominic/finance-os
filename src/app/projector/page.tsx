import type { Metadata } from "next";
import { getPortfolioSummary } from "@/app/investments/actions";
import { ProjectorView } from "./components/projector-view";

export const metadata: Metadata = {
  title: "Wealth Projector — Finance OS",
  description: "See where compounding takes your portfolio across time and return scenarios.",
};

export default async function ProjectorPage() {
  const summary = await getPortfolioSummary();
  return <ProjectorView summary={summary} />;
}
