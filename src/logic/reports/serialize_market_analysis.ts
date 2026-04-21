import type { AnalyzePanamaResult } from "@/src/logic/panama_analysis";

/**
 * JSONB 저장용 — 거시/가격 행 전체는 용량 과다 가능해 요약 위주로 직렬화
 */
export function serializeMarketAnalysisForDb(
  r: AnalyzePanamaResult,
): Record<string, unknown> {
  return {
    product: r.product,
    judgment: r.judgment,
    sourceAggregation: r.sourceAggregation,
    panamacompraCount: r.panamacompraCount,
    privateRetailCount: r.privateRetailCount,
    emlWho: r.emlWho,
    emlPaho: r.emlPaho,
    emlMinsa: r.emlMinsa,
    macroRowsCount: r.macroRows.length,
    priceRowsCount: r.priceRows.length,
    distributorCount: r.distributors.length,
    matchedDistributorCount: r.matchedDistributors.length,
  };
}
