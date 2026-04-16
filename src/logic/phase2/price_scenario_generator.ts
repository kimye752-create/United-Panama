import { calculateFobBack, type FobBackCalculationResult } from "./fob_back_calculator";
import { calculateIncotermsForward, type IncotermsOutput } from "./incoterms_forward_calculator";
import type { Phase2MarketSegment } from "./margin_policy_resolver";

export interface ScenarioRow {
  scenario: "agg" | "avg" | "cons";
  title: string;
  subtitle: string;
  fob: FobBackCalculationResult;
  incoterms: IncotermsOutput;
}

export interface PriceScenarioInput {
  segment: Phase2MarketSegment;
  finalPricePab: number;
  explicitRetailMargin?: number;
  explicitWholesaleMargin?: number;
  explicitHospitalMargin?: number;
  freightUsd?: number;
  insuranceRate?: number;
  customsUsd?: number;
}

const SCENARIOS: Array<{
  key: "agg" | "avg" | "cons";
  title: string;
  subtitle: string;
}> = [
  { key: "agg", title: "공격 시나리오", subtitle: "협상 상단 목표가" },
  { key: "avg", title: "기준 시나리오", subtitle: "일반 시장 목표가" },
  { key: "cons", title: "보수 시나리오", subtitle: "마지노선 방어가" },
];

export function generatePriceScenarios(input: PriceScenarioInput): ScenarioRow[] {
  return SCENARIOS.map((scenario) => {
    const fob = calculateFobBack({
      segment: input.segment,
      scenario: scenario.key,
      finalPricePab: input.finalPricePab,
      explicitRetailMargin: input.explicitRetailMargin,
      explicitWholesaleMargin: input.explicitWholesaleMargin,
      explicitHospitalMargin: input.explicitHospitalMargin,
      tariffRate: 0,
      itbmsRate: 0,
    });
    const incoterms = calculateIncotermsForward({
      fobUsd: fob.fobUsd,
      freightUsd: input.freightUsd,
      insuranceRate: input.insuranceRate,
      customsUsd: input.customsUsd,
      tariffRate: 0,
    });
    return {
      scenario: scenario.key,
      title: scenario.title,
      subtitle: scenario.subtitle,
      fob,
      incoterms,
    };
  });
}
