/**
 * Report1 블록3 판정근거 — 줄별 maxLength 및 Aceclofenac scope 각주 분리
 */

/** 인덱스 0~4: 시장·의료 200자, 2~4번 100자, 유통 250자 */
export const BLOCK3_LINE_MAX: readonly [number, number, number, number, number] =
  [200, 100, 100, 100, 250];

const LATAM_FOOTNOTE_TEXT =
  "* 본 prevalence는 중남미 지역 평균(scope=latam_average). 파나마 국가 단위 통계 미공시.";

/**
 * Aceclofenac + prevalence에 scope=latam_average 포함 시: 1번 본문에서 괄호 구간 제거, 각주 문구 반환.
 * 그 외 INN은 원문 유지·각주 null.
 */
export function splitAceclofenacPrevalenceForBlock3(
  innEn: string,
  prevalenceMetric: string,
): { displayForLine1: string; latamFootnote: string | null } {
  const raw = prevalenceMetric.trim();
  if (innEn !== "Aceclofenac") {
    return { displayForLine1: raw, latamFootnote: null };
  }
  if (!raw.includes("latam_average")) {
    return { displayForLine1: raw, latamFootnote: null };
  }
  const displayForLine1 = raw
    .replace(/\s*\([^)]*scope=latam_average[^)]*\)\s*$/u, "")
    .trim();
  return {
    displayForLine1,
    latamFootnote: LATAM_FOOTNOTE_TEXT,
  };
}
