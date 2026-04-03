import type { Metadata } from "next";
import { getLiabilities } from "@/app/liabilities/actions";
import { LiabilitiesView } from "./components/liabilities-view";

export const metadata: Metadata = {
  title: "Liabilities — Finance OS",
  description: "Track your loans, credit cards, and other debts.",
};

export default async function LiabilitiesPage() {
  const liabilities = await getLiabilities();
  return <LiabilitiesView initialLiabilities={liabilities} />;
}
