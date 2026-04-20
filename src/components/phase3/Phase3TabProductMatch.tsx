import type { ReactElement } from "react";

import type { PartnerWithDynamicPsi } from "@/src/lib/phase3/psi-calculator";
import { PARTNERS, type ProductId, type ProductMatch } from "@/src/lib/phase3/partners-data";

interface Phase3TabProductMatchProps {
  partner: PartnerWithDynamicPsi;
  /** 1공정 선택 제품 슬러그 — 없으면 하이라이트·정렬 없음 */
  selectedProductSlug: ProductId | null;
}

function conflictIcon(level: ProductMatch["conflictLevel"]): string {
  if (level === "upgrade_opportunity") {
    return "🟡";
  }
  if (level === "direct_competition") {
    return "🔴";
  }
  if (level === "adjacent_category") {
    return "🟢";
  }
  return "✅";
}

function conflictLabelKo(level: ProductMatch["conflictLevel"]): string {
  if (level === "upgrade_opportunity") {
    return "Upgrade 기회";
  }
  if (level === "direct_competition") {
    return "직접 경쟁";
  }
  if (level === "adjacent_category") {
    return "인접 카테고리";
  }
  return "매칭 없음";
}

function ProductMatchRow({ match }: { match: ProductMatch }): ReactElement {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[12px] font-bold text-[#1f3e64]">{match.productName}</span>
        <span className="text-[10px] text-[#64748b]">
          {conflictIcon(match.conflictLevel)} {conflictLabelKo(match.conflictLevel)} · Tier {String(match.pipelineTier)}
        </span>
      </div>
      <p className="text-[11px] leading-relaxed text-[#3e5574]">{match.shortInsight}</p>
    </div>
  );
}

/** 모달 탭 3 — 8제품 매칭(하드코딩) + 선택 제품 하이라이트 */
export function Phase3TabProductMatch({ partner, selectedProductSlug }: Phase3TabProductMatchProps) {
  const full = PARTNERS.find((row) => row.id === partner.partner_id);

  if (full === undefined) {
    return (
      <div className="space-y-3 text-[12px]">
        {partner.pipeline_matched_products !== null && partner.pipeline_matched_products.length > 0 ? (
          <div>
            <span className="text-[10px] font-bold text-[#1f3e64]">현재 취급·경쟁 제품</span>
            <p className="mt-1 font-semibold text-[#273f60]">{partner.pipeline_matched_products.join(", ")}</p>
          </div>
        ) : (
          <p className="text-[11px] text-[#6f8299]">등록된 동일 제품 매칭 정보가 없습니다.</p>
        )}
        {partner.conflict_level !== "none" && partner.conflict_insight !== null && partner.conflict_insight !== "" ? (
          <p className="text-[11px] text-[#3e5574]">{partner.conflict_insight}</p>
        ) : null}
      </div>
    );
  }

  const sorted = [...full.productMatches].sort((a, b) => {
    if (selectedProductSlug === null) {
      return 0;
    }
    if (a.productId === selectedProductSlug) {
      return -1;
    }
    if (b.productId === selectedProductSlug) {
      return 1;
    }
    return 0;
  });

  return (
    <div className="flex flex-col gap-3 text-[12px]">
      {sorted.map((match) => {
        const isSelected = selectedProductSlug !== null && match.productId === selectedProductSlug;
        return (
          <div
            key={match.productId}
            className={`rounded-[10px] border px-3 py-2.5 ${
              isSelected ? "border-amber-400 bg-amber-50 shadow-sm" : "border-[#e8edf4] bg-[#fafbfd]"
            }`}
          >
            {isSelected ? (
              <div className="mb-1 text-[10px] font-extrabold text-amber-800">📌 1단계 시장조사 선택 제품</div>
            ) : null}
            <ProductMatchRow match={match} />
          </div>
        );
      })}
    </div>
  );
}
