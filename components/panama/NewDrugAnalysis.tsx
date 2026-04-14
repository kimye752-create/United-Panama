"use client";

export function NewDrugAnalysis() {
  return (
    <section className="rounded-xl border border-rose-100 bg-white px-4 py-4 shadow-sm">
      <p className="text-sm font-semibold text-slate-800">신약 분석</p>
      <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
        <input
          type="text"
          placeholder="약품명 (예: Nexavar)"
          className="rounded-lg border border-rose-100 bg-rose-50/40 px-3 py-2 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-rose-300"
          disabled
        />
        <input
          type="text"
          placeholder="성분명 (예: sorafenib)"
          className="rounded-lg border border-rose-100 bg-rose-50/40 px-3 py-2 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-rose-300"
          disabled
        />
        <input
          type="text"
          placeholder="제형 (예: 200mg tablet)"
          className="rounded-lg border border-rose-100 bg-rose-50/40 px-3 py-2 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-rose-300"
          disabled
        />
        <button
          type="button"
          disabled
          className="rounded-lg bg-rose-300 px-4 py-2 text-sm font-semibold text-white"
          title="신약 분석은 다음 세션에서 연결 예정입니다."
        >
          ▶ 신약 분석
        </button>
      </div>
    </section>
  );
}
