/**
 * PAHO Strategic Fund 권역 참조 단가(검수 확정) — Supabase 미적재 시 보고서·LLM 컨텍스트용
 */

/** WHO INN(영문) → 한 줄 설명 (없으면 null) */
export function getPahoRegionalReferenceLine(whoInnEn: string): string | null {
  const inn = whoInnEn.trim();
  if (inn === "Hydroxyurea") {
    return "PAHO Strategic Fund 권역 참조 단가: hydroxyurea 500mg capsule 약 $0.188 USD/캡슐 (regional pooled tier; 파나마 현지 낙찰 건수와 별개)";
  }
  return null;
}
