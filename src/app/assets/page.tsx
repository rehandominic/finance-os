import type { Metadata } from "next";
import { getAssets, runAutoCalculations } from "@/app/assets/actions";
import { AssetsView } from "./components/assets-view";

export const metadata: Metadata = {
  title: "Assets — Finance OS",
  description: "Track property, vehicles, gold, cash deposits, and other physical or financial assets.",
};

export default async function AssetsPage() {
  // Run auto-calculations (vehicle depreciation, FD interest) before rendering
  await runAutoCalculations();
  const assets = await getAssets();
  return <AssetsView initialAssets={assets} />;
}
