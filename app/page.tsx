import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { MarketNewsCard } from "@/components/dashboard/main/MarketNewsCard";
import { ProgressChecklistCard } from "@/components/dashboard/main/ProgressChecklistCard";
import { TariffExchangeCard } from "@/components/dashboard/main/TariffExchangeCard";

export default function HomePage() {
  return (
    <DashboardShell>
      <div className="mb-3.5 grid grid-cols-1 items-stretch gap-3.5 md:grid-cols-3">
        <TariffExchangeCard />
        <MarketNewsCard />
        <ProgressChecklistCard />
      </div>
    </DashboardShell>
  );
}
