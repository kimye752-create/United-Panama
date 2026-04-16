import type { DashboardBundle } from "./types";

interface JudgmentBannerProps {
  dashboard: DashboardBundle;
}

function yn(flag: boolean): string {
  return flag ? "✓" : "✕";
}

export function JudgmentBanner({ dashboard }: JudgmentBannerProps) {
  const c = dashboard.confidenceBreakdown;
  const confidencePercent = Math.round(dashboard.confidence * 100);

  return (
    <section className="rounded-[10px] bg-[#1e3a5f] px-4 py-3 text-white shadow-sm">
      <p className="text-[14px] font-bold">
        {dashboard.product.kr_brand_name} · {dashboard.product.who_inn_en} · {dashboard.product.formulation} · HS{" "}
        {dashboard.product.hs_code} · Case {dashboard.caseGrade} · confidence {confidencePercent}%
      </p>
      <p className="mt-1 text-[12px] text-slate-200">
        신뢰도 {confidencePercent}% = 공공조달 {yn(c.publicProcurement)} · 민간가격 {yn(c.privatePrice)} · EML{" "}
        {yn(c.eml)} · ERP참조 {yn(c.erpReference)} · 유통파트너 {yn(c.distributors)} · 규제{" "}
        {yn(c.regulation)} · prevalence {yn(c.prevalence)} ({c.max}개 중 {c.total}개)
      </p>
    </section>
  );
}
