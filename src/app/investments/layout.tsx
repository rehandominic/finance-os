import { getSettings } from "./actions";
import { InvestmentsShell } from "./components/investments-shell";

export default async function InvestmentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getSettings();
  return (
    <InvestmentsShell exchangeRate={settings.exchangeRate}>
      {children}
    </InvestmentsShell>
  );
}
