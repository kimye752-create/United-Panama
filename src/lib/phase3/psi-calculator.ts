/**
 * 동적 PSI 계산 — 세션 27 가중치 비례 재분배 공식 유지 (logic 모듈 위임)
 */
import type { PSICheckedState, PartnerWithPSI } from "./types";
import {
  calculateDynamicPSI,
  normalizeActiveWeights,
  sortAndExtractTopN,
} from "@/src/logic/phase3/psi_calculator";

export { calculateDynamicPSI, normalizeActiveWeights, sortAndExtractTopN };

export type PartnerWithDynamicPsi = PartnerWithPSI & { dynamic_psi: number };

/** 전체 파트너를 동적 PSI로 정렬 (상한 20사 UI 기준) */
export function rankPartnersForDisplay(
  partners: PartnerWithPSI[],
  checked: PSICheckedState,
  maxRank: number = 20,
): PartnerWithDynamicPsi[] {
  const n = Math.min(maxRank, Math.max(partners.length, 0));
  return sortAndExtractTopN(partners, checked, n);
}
