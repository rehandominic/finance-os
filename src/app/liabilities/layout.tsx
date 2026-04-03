import { getSettings } from "@/app/investments/actions";
import { LiabilitiesShell } from "./components/liabilities-shell";

export default async function LiabilitiesLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  return <LiabilitiesShell exchangeRate={settings.exchangeRate}>{children}</LiabilitiesShell>;
}
