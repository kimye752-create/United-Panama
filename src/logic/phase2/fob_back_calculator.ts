import {
  resolveMarginPolicy,
  type MarginPolicyInput,
  type Phase2MarketSegment,
  type Phase2Scenario,
  type ResolvedMargins,
} from "./margin_policy_resolver";

export interface FobBackCalculationInput extends MarginPolicyInput {
  finalPricePab: number;
  tariffRate?: number;
  itbmsRate?: number;
}

export interface FobBackCalculationResult {
  scenario: Phase2Scenario;
  segment: Phase2MarketSegment;
  finalPricePab: number;
  fobUsd: number;
  tariffRate: number;
  itbmsRate: number;
  margins: ResolvedMargins;
  formulaText: string;
}

function roundUsd(value: number): number {
  return Math.round(value * 100) / 100;
}

function safeDiv(numerator: number, denominator: number): number {
  if (denominator <= 0) {
    return 0;
  }
  return numerator / denominator;
}

export function calculateFobBack(input: FobBackCalculationInput): FobBackCalculationResult {
  const finalPricePab = Number.isFinite(input.finalPricePab) ? input.finalPricePab : 0;
  const tariffRate = input.tariffRate ?? 0;
  const itbmsRate = input.itbmsRate ?? 0;
  const margins = resolveMarginPolicy(input);

  // 파나마는 PAB/USD 1:1 고정 환율 체계로 간주
  const afterRetail = safeDiv(finalPricePab, 1 + margins.retailMargin);
  const afterWholesale = safeDiv(afterRetail, 1 + margins.wholesaleMargin);
  const afterHospital = safeDiv(afterWholesale, 1 + margins.hospitalMargin);
  const afterTax = safeDiv(afterHospital, 1 + tariffRate + itbmsRate);
  const fobUsd = roundUsd(afterTax);

  const formulaText =
    input.segment === "public"
      ? "FOB = 공공낙찰가 / (1+병원내부마진) / (1+관세+ITBMS)"
      : "FOB = 민간소매가 / (1+약국마진) / (1+도매마진) / (1+관세+ITBMS)";

  return {
    scenario: input.scenario,
    segment: input.segment,
    finalPricePab: roundUsd(finalPricePab),
    fobUsd,
    tariffRate,
    itbmsRate,
    margins,
    formulaText,
  };
}
