import { DashboardShell } from "@/components/dashboard/DashboardShell";
import dynamic from "next/dynamic";

import { MacroCards } from "@/components/main-preview/MacroCards";
import { MainPreviewSections } from "@/components/main-preview/MainPreviewSections";
import { MarketTrends } from "@/components/main-preview/MarketTrends";
import { getPanamaLandingMetricCards } from "@/src/logic/panama_landing";

const PanamaMap = dynamic(
  async () => import("@/components/main-preview/PanamaMap").then((mod) => mod.PanamaMap),
  { ssr: false },
);

export default async function HomePage() {
  const cards = await getPanamaLandingMetricCards();
  return (
    <DashboardShell>
      <div className="space-y-3.5">
        <MacroCards cards={cards} />
        <section className="grid grid-cols-1 gap-3.5 xl:grid-cols-2">
          <PanamaMap />
          <MarketTrends />
        </section>
        <MainPreviewSections />
      </div>
    </DashboardShell>
  );
}
