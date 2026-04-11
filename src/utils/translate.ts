/**
 * translate.ts — 스페인어 ↔ 한국어 번역 유틸 (stub)
 *
 * 세션 6: 빈 stub만 생성. 실제 구현은 D6 Phase B 진입 시.
 * 목적: Phase B LLM 보강 시 스페인어 소스 → 한국어 번역 일괄 처리.
 *
 * 예상 시그니처:
 *   translateToKorean(text: string, sourceLang: 'es' | 'en'): Promise<string>
 */

export interface TranslationRequest {
  text: string;
  sourceLang: "es" | "en";
  targetLang: "ko";
}

export interface TranslationResult {
  original: string;
  translated: string;
  sourceLang: "es" | "en";
  targetLang: "ko";
  model: string;
}

/**
 * 세션 6 현재: 미구현. 호출 시 에러 throw.
 * 세션 7+ D6 Phase B 진입 시 Anthropic Claude API 기반으로 구현 예정.
 */
export async function translateToKorean(
  _req: TranslationRequest,
): Promise<TranslationResult> {
  throw new Error(
    "translate.ts: not implemented yet (scheduled for session 7+ D6 Phase B)",
  );
}
