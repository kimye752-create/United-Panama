import type {
  EvaluationCriterion,
  PartnerCandidate,
  PartnerScores,
} from "@/src/types/phase3_partner";

function normalizeText(value: string | null | undefined): string {
  return typeof value === "string" ? value.toLowerCase().trim() : "";
}

export function scoreRevenue(revenueUsd: number | null): number {
  if (revenueUsd === null || revenueUsd <= 0) {
    return 0;
  }
  if (revenueUsd >= 100_000_000) {
    return 100;
  }
  if (revenueUsd >= 10_000_000) {
    return 50 + (revenueUsd / 100_000_000) * 50;
  }
  if (revenueUsd >= 1_000_000) {
    return 20 + (revenueUsd / 10_000_000) * 30;
  }
  return (revenueUsd / 1_000_000) * 20;
}

export function scorePipeline(
  candidate: PartnerCandidate,
  productInn: string,
  productAtc4: string,
): number {
  const targetInn = normalizeText(productInn);
  const targetAtc4 = normalizeText(productAtc4);
  const areas = (candidate.therapeutic_areas ?? []).map((area) => normalizeText(area));
  if (targetInn !== "" && areas.some((area) => area.includes(targetInn))) {
    return 100;
  }
  if (targetAtc4 !== "" && areas.some((area) => area.includes(targetAtc4))) {
    return 80;
  }
  if (areas.some((area) => area.includes("cardio") || area.includes("순환기") || area.includes("oncology"))) {
    return 60;
  }
  if (areas.length > 0) {
    return 40;
  }
  return 0;
}

export function scoreGmp(gmpCertified: boolean | null): number {
  if (gmpCertified === true) {
    return 100;
  }
  return 0;
}

export function scoreImport(
  importHistory: boolean | null,
  importDetail: string | null,
): number {
  if (importHistory !== true) {
    return 0;
  }
  const detail = normalizeText(importDetail);
  if (detail.includes("pharmaceutical") || detail.includes("의약품")) {
    return 100;
  }
  return 70;
}

export function scorePharmacyChain(isOperator: boolean | null): number {
  return isOperator === true ? 100 : 0;
}

export function buildPartnerScores(
  candidate: PartnerCandidate,
  productInn: string,
  productAtc4: string,
): PartnerScores {
  return {
    revenue: scoreRevenue(candidate.revenue_usd),
    pipeline: scorePipeline(candidate, productInn, productAtc4),
    gmp: scoreGmp(candidate.gmp_certified),
    import: scoreImport(candidate.import_history, candidate.import_history_detail),
    pharmacy_chain: scorePharmacyChain(candidate.pharmacy_chain_operator),
  };
}

export function calculateCompositeScore(
  scores: PartnerScores,
  checkedItems: ReadonlySet<EvaluationCriterion>,
): number {
  const weights = {
    revenue: checkedItems.has("revenue") ? 1.0 : 0.2,
    pipeline: checkedItems.has("pipeline") ? 1.0 : 0.2,
    gmp: checkedItems.has("gmp") ? 1.0 : 0.2,
    import: checkedItems.has("import") ? 1.0 : 0.2,
    pharmacy_chain: checkedItems.has("pharmacy_chain") ? 1.0 : 0.2,
  };
  const weightedSum =
    scores.revenue * weights.revenue +
    scores.pipeline * weights.pipeline +
    scores.gmp * weights.gmp +
    scores.import * weights.import +
    scores.pharmacy_chain * weights.pharmacy_chain;
  const weightTotal =
    weights.revenue +
    weights.pipeline +
    weights.gmp +
    weights.import +
    weights.pharmacy_chain;
  if (weightTotal <= 0) {
    return 0;
  }
  return weightedSum / weightTotal;
}

