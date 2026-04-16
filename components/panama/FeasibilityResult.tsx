import type { DashboardBundle } from "./types";

interface FeasibilityResultProps {
  dashboard: DashboardBundle;
}

function verdictBadge(caseGrade: DashboardBundle["caseGrade"]): {
  label: string;
  className: string;
} {
  if (caseGrade === "A") {
    return { label: "가능", className: "bg-emerald-100 text-emerald-700" };
  }
  if (caseGrade === "B") {
    return { label: "조건부", className: "bg-amber-100 text-amber-700" };
  }
  return { label: "재검토", className: "bg-red-100 text-red-700" };
}

export function FeasibilityResult({ dashboard }: FeasibilityResultProps) {
  const badge = verdictBadge(dashboard.caseGrade);
  const reasoning = dashboard.llmPayload.block3_reasoning;
  const labels = ["시장/의료", "규제", "무역", "조달", "유통"];

  return (
    <section className="rounded-[12px] border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[13px] font-semibold text-slate-700">● 수출 적합성 분석 결과</p>
      <div className="mt-2 flex items-center gap-3">
        <p className="text-[22px] font-bold text-[#173f78]">{dashboard.product.kr_brand_name}</p>
        <span className={`rounded-full px-3 py-1 text-[14px] font-bold ${badge.className}`}>{badge.label}</span>
      </div>
      <div className="mt-3 space-y-2">
        {reasoning.map((line, index) => (
          <article key={`${labels[index]}-${line.slice(0, 20)}`} className="rounded-[8px] bg-[#f7f9fc] p-3">
            <p className="text-[12px] font-bold text-slate-700">
              {index + 1}. {labels[index]}
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-slate-700">{line}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
