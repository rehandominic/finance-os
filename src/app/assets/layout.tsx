import { getSettings } from "@/app/investments/actions";
import { AssetsShell } from "./components/assets-shell";

export default async function AssetsLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  return <AssetsShell exchangeRate={settings.exchangeRate}>{children}</AssetsShell>;
}
