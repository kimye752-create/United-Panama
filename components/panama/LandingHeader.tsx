export function LandingHeader() {
  return (
    <section className="rounded-2xl border border-rose-100 bg-white px-6 py-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="inline-flex items-center rounded-full bg-rose-50 px-3 py-1 text-sm font-semibold text-rose-600">
            PA
          </div>
          <h1 className="mt-3 text-3xl font-bold text-slate-900">파나마 국가 개요</h1>
          <p className="mt-1 text-sm text-slate-600">
            거시 지표 요약 및 8개 INN 진출 적합 분석 · UPharma Export AI
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            ● Claude
          </span>
          <span className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700">
            ● Perplexity
          </span>
        </div>
      </div>
    </section>
  );
}
