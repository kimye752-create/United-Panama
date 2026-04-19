import {
  PSI_BASIC_WEIGHTS,
  type PSICheckedState,
  type PSICriterionKey,
  type PartnerWithPSI,
  type DynamicPSIResult,
} from "./types";

export function normalizeActiveWeights(
  checked: PSICheckedState,
): Partial<Record<PSICriterionKey, number>> {
  const activeEntries = (Object.keys(checked) as PSICriterionKey[])
    .filter((k) => checked[k])
    .map((k) => [k, PSI_BASIC_WEIGHTS[k]] as const);

  const totalActive = activeEntries.reduce((sum, [, w]) => sum + w, 0);

  if (totalActive === 0) {
    return {};
  }

  const normalized: Partial<Record<PSICriterionKey, number>> = {};
  for (const [key, weight] of activeEntries) {
    normalized[key] = weight / totalActive;
  }
  return normalized;
}

const ALL_CRITERIA_KEYS: PSICriterionKey[] = ["revenue", "pipeline", "manufacture", "import", "pharmacy"];

function isAllCriteriaChecked(checked: PSICheckedState): boolean {
  return ALL_CRITERIA_KEYS.every((k) => checked[k]);
}

export function calculateDynamicPSI(
  partner: PartnerWithPSI,
  checked: PSICheckedState,
): DynamicPSIResult {
  const weights = normalizeActiveWeights(checked);

  /** 5개 전부 체크 시 세션 28 확정 총점(psi_total_default)과 동일 — 순위 왜곡 방지 */
  if (isAllCriteriaChecked(checked)) {
    return {
      partner_id: partner.partner_id,
      dynamic_psi: Math.round(partner.psi_total_default * 100) / 100,
      normalized_weights: weights,
    };
  }

  let psi = 0;
  if (weights.revenue !== undefined) {
    psi += weights.revenue * partner.revenue_tier_score;
  }
  if (weights.pipeline !== undefined) {
    psi += weights.pipeline * partner.pipeline_tier_score;
  }
  if (weights.manufacture !== undefined) {
    psi += weights.manufacture * partner.manufacturing_score;
  }
  if (weights.import !== undefined) {
    psi += weights.import * partner.import_experience_score;
  }
  if (weights.pharmacy !== undefined) {
    psi += weights.pharmacy * partner.pharmacy_chain_score;
  }

  return {
    partner_id: partner.partner_id,
    dynamic_psi: Math.round(psi * 100) / 100,
    normalized_weights: weights,
  };
}

export function sortAndExtractTopN(
  partners: PartnerWithPSI[],
  checked: PSICheckedState,
  topN: number = 10,
): Array<PartnerWithPSI & { dynamic_psi: number }> {
  const enriched = partners.map((p) => {
    const result = calculateDynamicPSI(p, checked);
    return {
      ...p,
      dynamic_psi: result.dynamic_psi,
    };
  });

  enriched.sort((a, b) => {
    const diff = b.dynamic_psi - a.dynamic_psi;
    if (diff !== 0) {
      return diff > 0 ? 1 : -1;
    }
    const ra = a.hc_display?.hc_catalog_rank ?? 999;
    const rb = b.hc_display?.hc_catalog_rank ?? 999;
    return ra - rb;
  });

  return enriched.slice(0, topN);
}
