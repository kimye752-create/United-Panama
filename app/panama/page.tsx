import { ProductSelector } from "@/components/ProductSelector";
import { LandingHeader } from "@/components/panama/LandingHeader";
import { MacroCards } from "@/components/panama/MacroCards";
import { NewDrugAnalysis } from "@/components/panama/NewDrugAnalysis";
import { getPanamaLandingMetricCards } from "@/src/logic/panama_landing";

export default async function PanamaPage() {
  const macroCards = await getPanamaLandingMetricCards();

  return (
    <main className="min-h-screen bg-[#fff0f5] py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4">
        <LandingHeader />

        <MacroCards cards={macroCards} />

        <ProductSelector />

        <NewDrugAnalysis />
      </div>
    </main>
  );
}
