"use client";

import { PRODUCT_META, type ProductId } from "@/src/lib/phase3/partners-data";

interface SelectedProductBannerProps {
  /** 1공정 보고서의 product_id(UUID). 슬러그로 변환 가능할 때만 표시 */
  productSlug: ProductId | null;
}

/**
 * 3공정 결과 영역 최상단 — 선택 제품 명시(미스매치 혼란 방지)
 */
export function SelectedProductBanner({ productSlug }: SelectedProductBannerProps) {
  if (productSlug === null) {
    return null;
  }

  const meta = PRODUCT_META[productSlug];
  if (meta === undefined) {
    return null;
  }

  return (
    <div className="mb-1 flex items-start gap-3 rounded-[10px] border border-[#bfdbfe] bg-[#eff6ff] px-3 py-2.5">
      <span className="text-[18px] leading-none" aria-hidden>
        📌
      </span>
      <div className="min-w-0 flex flex-col gap-0.5">
        <div className="text-[10px] font-semibold text-[#64748b]">1단계 시장조사에서 선택한 제품 기준</div>
        <div className="text-[13px] font-extrabold text-[#1e293b]">
          {meta.name}
          <span className="ml-2 text-[11px] font-normal text-[#64748b]">({meta.category})</span>
        </div>
        <p className="mt-0.5 text-[10px] leading-snug text-[#475569]">
          본 분석은 선택 제품을 포함한 8개 제품 전체 포트폴리오 관점에서 Top 20 파트너를 평가했습니다.
        </p>
      </div>
    </div>
  );
}
