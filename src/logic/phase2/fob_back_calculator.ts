import {
  resolveMarginPolicy,
  type MarginPolicyInput,
  type Phase2MarketSegment,
  type Phase2Scenario,
  type ResolvedMargins,
} from "./margin_policy_resolver";
import {
  PHASE2_SCENARIO_STRATEGY,
  STRATEGY_MULTIPLIERS,
  type PricingStrategy,
} from "./pricing_strategy_presets";

export interface FobBackCalculationInput extends MarginPolicyInput {
  finalPricePab: number;
  tariffRate?: number;
  itbmsRate?: number;
}

export interface FobBackCalculationResult {
  scenario: Phase2Scenario;
  strategy: PricingStrategy;
  strategyMultiplier: number;
  segment: Phase2MarketSegment;
  finalPricePab: number;
  fobCeilingUsd: number;
  fobUsd: number;
  positioningPricePab: number;
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
  const strategy = PHASE2_SCENARIO_STRATEGY[input.scenario];
  const strategyMultiplier = STRATEGY_MULTIPLIERS[strategy];

  // 파나마는 PAB/USD 1:1 고정 환율 체계로 간주
  const afterRetail = safeDiv(finalPricePab, 1 + margins.retailMargin);
  const afterWholesale = safeDiv(afterRetail, 1 + margins.wholesaleMargin);
  const afterLogistics = safeDiv(afterWholesale, 1 + margins.logisticsMargin);
  const afterRisk = safeDiv(afterLogistics, 1 + margins.riskMargin);
  const afterTax = safeDiv(afterRisk, 1 + tariffRate + itbmsRate);
  const fobCeilingUsd = roundUsd(afterTax);
  const fobUsd = roundUsd(fobCeilingUsd * strategyMultiplier);
  const positioningPricePab = roundUsd(
    fobUsd *
      (1 + margins.riskMargin) *
      (1 + margins.logisticsMargin) *
      (1 + margins.wholesaleMargin) *
      (1 + margins.retailMargin),
  );

  const formulaText =
    input.segment === "public"
      ? "FOB 천장 = 공공낙찰가 / (1+에이전트영업비) / (1+물류) / (1+리스크), 최종 FOB = FOB 천장 × 전략배수"
      : "FOB 천장 = 민간소매가 / (1+약국마진) / (1+도매마진) / (1+물류) / (1+리스크), 최종 FOB = FOB 천장 × 전략배수";

  return {
    scenario: input.scenario,
    strategy,
    strategyMultiplier,
    segment: input.segment,
    finalPricePab: roundUsd(finalPricePab),
    fobCeilingUsd,
    fobUsd,
    positioningPricePab,
    tariffRate,
    itbmsRate,
    margins,
    formulaText,
  };
}
