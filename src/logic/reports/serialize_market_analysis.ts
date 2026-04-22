import type { AnalyzePanamaResult } from "@/src/logic/panama_analysis";

// ─── 가격 통계 집계 ────────────────────────────────────────────
function computePriceStats(
  rows: AnalyzePanamaResult["priceRows"],
): { avg: number | null; min: number | null; max: number | null; median: number | null; count: number } {
  const prices = rows
    .map((r) => {
      const v = (r as unknown as Record<string, unknown>)["pa_price_local"];
      return typeof v === "number" && Number.isFinite(v) ? v : null;
    })
    .filter((v): v is number => v !== null);

  if (prices.length === 0) return { avg: null, min: null, max: null, median: null, count: 0 };
  const sorted = [...prices].sort((a, b) => a - b);
  const sum    = prices.reduce((a, b) => a + b, 0);
  const mid    = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0
    ? ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
    : (sorted[mid] ?? 0);
  return {
    avg:    sum / prices.length,
    min:    sorted[0] ?? null,
    max:    sorted[sorted.length - 1] ?? null,
    median,
    count:  prices.length,
  };
}

// ─── 매크로 요약 추출 ──────────────────────────────────────────
function extractMacroSummary(
  macroRows: AnalyzePanamaResult["macroRows"],
): Record<string, unknown> {
  // macroRows는 panama 테이블의 범용 행. pa_notes 필드나 source에서 핵심 지표를 추출
  const rows = macroRows as unknown as Array<Record<string, unknown>>;
  const population  = rows.find((r) => String(r["pa_notes"] ?? "").includes("인구") || String(r["pa_source"] ?? "").includes("worldbank"));
  const gdp         = rows.find((r) => String(r["pa_notes"] ?? "").includes("GDP") || String(r["pa_notes"] ?? "").includes("gdp"));
  const marketSize  = rows.find((r) => String(r["pa_notes"] ?? "").includes("시장") && String(r["pa_notes"] ?? "").includes("규모"));
  return {
    rowCount:        macroRows.length,
    populationHint:  population ? String(population["pa_price_local"] ?? population["pa_notes"] ?? "") : null,
    gdpHint:         gdp        ? String(gdp["pa_price_local"] ?? gdp["pa_notes"] ?? "")              : null,
    marketSizeHint:  marketSize ? String(marketSize["pa_price_local"] ?? marketSize["pa_notes"] ?? "") : null,
  };
}

/**
 * JSONB 저장용 — 거시/가격 행 전체는 용량 과다 가능해 요약 위주로 직렬화
 * 추가: 가격 통계 + 매크로 요약 포함
 */
export function serializeMarketAnalysisForDb(
  r: AnalyzePanamaResult,
): Record<string, unknown> {
  const priceStats    = computePriceStats(r.priceRows);
  const cleanedStats  = computePriceStats(
    r.sandCleaned as unknown as AnalyzePanamaResult["priceRows"],
  );
  const macroSummary  = extractMacroSummary(r.macroRows);

  return {
    product: r.product,
    judgment: r.judgment,
    sourceAggregation: r.sourceAggregation,
    panamacompraCount: r.panamacompraCount,
    privateRetailCount: r.privateRetailCount,
    emlWho: r.emlWho,
    emlPaho: r.emlPaho,
    emlMinsa: r.emlMinsa,
    // 가격 통계 (이상치 포함 / 제거 후)
    priceStats,
    cleanedPriceStats: cleanedStats,
    // 매크로 요약
    macroSummary,
    // 카운트
    macroRowsCount: r.macroRows.length,
    priceRowsCount: r.priceRows.length,
    distributorCount: r.distributors.length,
    matchedDistributorCount: r.matchedDistributors.length,
  };
}
