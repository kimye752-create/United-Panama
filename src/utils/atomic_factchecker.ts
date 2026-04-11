/**
 * 기법 ⑥ Atomic Calibration — Phase B 연기 (stub)
 */
/// <reference types="node" />

export interface AtomicClaim {
  text: string;
  sourceUrl: string;
}

export interface FactCheckResult {
  claim: string;
  verdict: "supported" | "refuted" | "unverified";
  confidence: number;
}

export async function verifyAtomicClaim(
  _claim: AtomicClaim,
): Promise<FactCheckResult> {
  throw new Error(
    "AtomicCalibration: Phase B deferred - session 9+. LLM 응답 팩트체크는 web_search 단계에서 필요",
  );
}
