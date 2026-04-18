import type { PartnerWithDynamicPsi } from "@/src/lib/phase3/psi-calculator";

interface Phase3TabRecommendReasonProps {
  partner: PartnerWithDynamicPsi;
  rankHint: number | null;
}

/** 모달 탭 4 — 추천 사유(서술형 요약) */
export function Phase3TabRecommendReason({ partner, rankHint }: Phase3TabRecommendReasonProps) {
  const rankLine =
    rankHint !== null ? `현재 가중치 기준 추정 순위: 약 ${String(rankHint)}위대.` : "순위는 동적 PSI 정렬에 따릅니다.";

  return (
    <div className="space-y-2 text-[12px] leading-relaxed text-[#2b4568]">
      <p>
        <span className="font-bold text-[#1f3e64]">{partner.company_name}</span>은(는) 동적 PSI{" "}
        <span className="font-black text-[#1E4E8C]">{String(partner.dynamic_psi)}</span>로 평가되었습니다. {rankLine}
      </p>
      <p className="text-[11px] text-[#516882]">
        PSI 로직 설계 철학: 글로벌 브랜드만으로는 부족하고, 파나마 실질 유통·파이프라인 적합도가 순위를 좌우합니다. 본 파트너의
        매출·파이프라인·제조·수입·약국 지표와 경쟁/기회 플래그를 함께 검토하세요.
      </p>
      {partner.conflict_insight !== null && partner.conflict_insight !== "" ? (
        <div className="mt-2 rounded-[10px] border border-[#dbe3ef] bg-[#f8fafc] p-2 text-[11px] text-[#3e5574]">
          <span className="font-bold">인사이트 요약: </span>
          {partner.conflict_insight}
        </div>
      ) : null}
    </div>
  );
}
