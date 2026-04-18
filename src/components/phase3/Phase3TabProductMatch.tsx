import type { PartnerWithDynamicPsi } from "@/src/lib/phase3/psi-calculator";

function conflictClass(level: string): string {
  if (level === "upgrade_opportunity") {
    return "bg-[#fffbeb] border border-[#f5e6b3] text-[#7a5b00]";
  }
  if (level === "direct_competition") {
    return "bg-[#fef2f2] border border-[#f5c2c2] text-[#7f1d1d]";
  }
  if (level === "adjacent_category") {
    return "bg-[#ecfdf3] border border-[#b8e6cc] text-[#14532d]";
  }
  return "border border-[#e8edf4] bg-[#fafbfd] text-[#3e5574]";
}

function conflictTitle(level: string): string {
  if (level === "upgrade_opportunity") return "🟡 경쟁/기회 이원 평가";
  if (level === "direct_competition") return "🔴 직접 경쟁 관계";
  if (level === "adjacent_category") return "🟢 인접 카테고리 경쟁자";
  return "제품 매칭";
}

interface Phase3TabProductMatchProps {
  partner: PartnerWithDynamicPsi;
}

/** 모달 탭 3 — 제품 매칭·경쟁 플래그 */
export function Phase3TabProductMatch({ partner }: Phase3TabProductMatchProps) {
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
        <div className={`rounded-[10px] p-3 text-[11px] leading-relaxed ${conflictClass(partner.conflict_level)}`}>
          <div className="mb-1 font-bold">{conflictTitle(partner.conflict_level)}</div>
          <p>{partner.conflict_insight}</p>
        </div>
      ) : (
        <p className="text-[11px] text-[#6f8299]">경쟁/기회 특이사항 없음 (none).</p>
      )}
    </div>
  );
}
