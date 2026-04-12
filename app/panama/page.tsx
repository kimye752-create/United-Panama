import { ProductSelector } from "@/components/ProductSelector";
import { getMacroSummary } from "@/src/logic/fetch_panama_data";
import { buildMacroDisplay } from "@/src/logic/macro_display";

export default async function PanamaPage() {
  const macroRows = await getMacroSummary();
  const m = buildMacroDisplay(macroRows);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold text-slate-900">파나마 국가 개요</h1>
      <p className="mt-2 text-slate-600">
        거시 지표 요약 및 8개 INN 진출 적합 분석 진입
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-500">GDP per capita</p>
          <p className="text-xl font-semibold text-slate-900">{m.gdp}</p>
        </div>
        <div className="rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-500">인구</p>
          <p className="text-xl font-semibold text-slate-900">{m.population}</p>
        </div>
        <div className="rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-500">1인당 보건지출 (연간)</p>
          <p className="text-xl font-semibold text-slate-900">{m.healthSpend}</p>
        </div>
        <div className="rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-500">시장 성장률(참고)</p>
          <p className="text-xl font-semibold text-slate-900">{m.marketGrowth}</p>
        </div>
      </div>

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
