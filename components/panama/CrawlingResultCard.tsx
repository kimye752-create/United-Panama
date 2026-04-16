import type { DashboardBundle } from "./types";

interface CrawlingResultCardProps {
  dashboard: DashboardBundle;
}

function fmtUsd(value: number | null): string {
  if (value === null) {
    return "해당없음";
  }
  return `$${value.toFixed(2)}`;
}

export function CrawlingResultCard({ dashboard }: CrawlingResultCardProps) {
  const b = dashboard.sourceBreakdown;

  return (
    <section className="rounded-[12px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-[18px] font-bold text-[#173f78]">{dashboard.product.kr_brand_name}</p>
          <p className="text-[12px] text-slate-500">
            {dashboard.product.who_inn_en} · {dashboard.product.formulation} · HS {dashboard.product.hs_code}
          </p>
        </div>
        <p className="text-[11px] text-slate-500">크롤링 결과 {b.panamacompra_v3.count + b.acodeco.count + b.superxtra.count + b.colombia_secop.count}건</p>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <article className="rounded-[10px] bg-[#f7f9fc] p-3">
          <p className="text-[11px] font-semibold text-slate-600">① PanamaCompra V3</p>
          <p className="mt-1 text-[18px] font-bold text-slate-800">{fmtUsd(b.panamacompra_v3.avgPrice)}</p>
          <p className="text-[11px] text-slate-500">{b.panamacompra_v3.count}건 낙찰</p>
          <p className="text-[11px] text-slate-500">
            범위: {fmtUsd(b.panamacompra_v3.minPrice)}~{fmtUsd(b.panamacompra_v3.maxPrice)}
          </p>
        </article>
        <article className="rounded-[10px] bg-[#f7f9fc] p-3">
          <p className="text-[11px] font-semibold text-slate-600">② ACODECO 공시가</p>
          <p className="mt-1 text-[18px] font-bold text-slate-800">{fmtUsd(b.acodeco.avgPrice)}</p>
          <p className="text-[11px] text-slate-500">{b.acodeco.count}건 등재</p>
        </article>
        <article className="rounded-[10px] bg-[#f7f9fc] p-3">
          <p className="text-[11px] font-semibold text-slate-600">③ SuperXtra 소매가</p>
          <p className="mt-1 text-[18px] font-bold text-slate-800">{fmtUsd(b.superxtra.price)}</p>
          <p className="text-[11px] text-slate-500">
            재고: {b.superxtra.hasStock === null ? "미확인" : b.superxtra.hasStock ? "있음" : "없음"}
          </p>
        </article>
        <article className="rounded-[10px] bg-[#f7f9fc] p-3">
          <p className="text-[11px] font-semibold text-slate-600">④ Colombia ERP 참조</p>
          <p className="mt-1 text-[18px] font-bold text-slate-800">{fmtUsd(b.colombia_secop.avgPrice)}</p>
          <p className="text-[11px] text-slate-500">{b.colombia_secop.count}건 참조</p>
          <p className="text-[11px] text-slate-500">{b.colombia_secop.erpBasis}</p>
        </article>
      </div>
    </section>
  );
}
