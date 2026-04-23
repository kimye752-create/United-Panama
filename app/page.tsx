import { DashboardShell } from "@/components/dashboard/DashboardShell";
import nextDynamic from "next/dynamic";

import { MacroCards } from "@/components/main-preview/MacroCards";
import { MarketTrends } from "@/components/main-preview/MarketTrends";
import { getPanamaLandingMetricCards } from "@/src/logic/panama_landing";

// DB에서 실시간 거시 데이터(인구·GDP 등)를 매 요청마다 조회해야 하므로 정적 렌더링 비활성화
export const dynamic = "force-dynamic";

const PanamaMap = nextDynamic(
  async () => import("@/components/main-preview/PanamaMap").then((mod) => mod.PanamaMap),
  { ssr: false },
);

export default async function HomePage() {
  const cards = await getPanamaLandingMetricCards();
  return (
    <DashboardShell>
      <div className="space-y-3">
        <MacroCards cards={cards} />
        <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <PanamaMap />
          <MarketTrends />
        </section>
      </div>
    </DashboardShell>
  );
}
