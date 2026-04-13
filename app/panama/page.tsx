import { ProductSelector } from "@/components/ProductSelector";
import {
  getMacroSummary,
  getRegulatoryMilestones,
} from "@/src/logic/fetch_panama_data";
import { buildMacroDisplay } from "@/src/logic/macro_display";
import {
  milestoneCardBgClass,
  milestoneTypeLabelKo,
} from "@/lib/milestone_labels";

export default async function PanamaPage() {
  const macroRows = await getMacroSummary();
  const milestones = await getRegulatoryMilestones();
  const m = buildMacroDisplay(macroRows);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold text-slate-900">파나마 국가 개요</h1>
      <p className="mt-2 text-slate-600">
        거시 지표·규제 요약 후 아래에서 품목을 고르고 「분석 (A4 보고서)」을 누르면
        보고서 전용 페이지로 이동합니다.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-500">GDP per capita</p>
          <p className="text-2xl font-semibold tracking-tight text-slate-900">
            {m.gdp}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">
            {m.footerGdp}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-500">인구</p>
          <p className="text-2xl font-semibold tracking-tight text-slate-900">
            {m.population}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">
            {m.footerPopulation}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-500">1인당 보건지출 (연간)</p>
          <p className="text-2xl font-semibold tracking-tight text-slate-900">
            {m.healthSpend}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">
            {m.footerHealth}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-500">시장 성장률(참고)</p>
          <p className="text-2xl font-semibold tracking-tight text-slate-900">
            {m.marketGrowth}
          </p>
          {m.footerMarket !== "" ? (
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              {m.footerMarket}
            </p>
          ) : null}
          {m.footerMarketScopeNote !== "" ? (
            <p className="mt-1 text-xs italic leading-relaxed text-slate-500">
              {m.footerMarketScopeNote}
            </p>
          ) : null}
        </div>
      </div>

      {milestones.length > 0 ? (
        <section className="mt-10" aria-labelledby="milestones-heading">
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
                className={`rounded-lg border border-slate-200 p-4 ${milestoneCardBgClass(
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

      <div className="mt-6 flex flex-wrap gap-2">
        <span className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-sm">
          한-중미 FTA 0%
        </span>
        <span className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-sm">
          한국 위생선진국 지정 2023.6.28
        </span>
      </div>

      <ProductSelector />
    </main>
  );
}
