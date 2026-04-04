import { getSettings } from "@/app/investments/actions";
import { CashflowShell } from "./components/cashflow-shell";

export default async function CashflowLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  return <CashflowShell exchangeRate={settings.exchangeRate}>{children}</CashflowShell>;
}
