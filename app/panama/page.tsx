import { ProductSelector } from "@/components/ProductSelector";
import { LandingHeader } from "@/components/panama/LandingHeader";
import { MacroCards } from "@/components/panama/MacroCards";
import { NewDrugAnalysis } from "@/components/panama/NewDrugAnalysis";
import {
  getRegulatoryMilestones,
} from "@/src/logic/fetch_panama_data";
import { getPanamaLandingMetricCards } from "@/src/logic/panama_landing";
import {
  milestoneCardBgClass,
  milestoneTypeLabelKo,
} from "@/lib/milestone_labels";

export default async function PanamaPage() {
  const macroCards = await getPanamaLandingMetricCards();
  const milestones = await getRegulatoryMilestones();

  return (
    <main className="min-h-screen bg-[#fff0f5] py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4">
        <LandingHeader />

        <MacroCards cards={macroCards} />

        <ProductSelector />

        <NewDrugAnalysis />

        {milestones.length > 0 ? (
          <section
            className="rounded-xl border border-rose-100 bg-white px-4 py-4 shadow-sm"
            aria-labelledby="milestones-heading"
          >
            <h2
              id="milestones-heading"
              className="text-lg font-semibold text-slate-900"
            >
              진출 호재 (Regulatory Milestones)
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {milestones.map((row, i) => (
                <article
                  key={row.id ?? `milestone-${String(i)}`}
                  className={`rounded-lg border border-rose-100 p-4 ${milestoneCardBgClass(
                    row.pa_milestone_type,
                  )}`}
                >
                  <p className="text-sm font-medium text-slate-800">
                    <span aria-hidden>🎯 </span>
                    {milestoneTypeLabelKo(row.pa_milestone_type)}
                  </p>
                  <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">
                    {row.pa_notes ?? ""}
                  </p>
                  <p className="mt-3 text-xs text-slate-400">
                    출처: {row.pa_source ?? "—"} · {row.pa_released_at ?? "—"}
                  </p>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-rose-200 bg-white px-3 py-1 text-sm text-slate-700">
            한-중미 FTA 0%
          </span>
          <span className="rounded-full border border-rose-200 bg-white px-3 py-1 text-sm text-slate-700">
            한국 위생선진국 지정 2023.6.28
          </span>
        </div>
      </div>
    </main>
  );
}
