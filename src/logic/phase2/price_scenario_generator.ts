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
  { key: "agg", title: "저가진입", subtitle: "시장 점유율 확보를 위한 인하 전략" },
  { key: "avg", title: "기준가", subtitle: "시장 허용 FOB를 기준으로 한 균형 전략" },
  { key: "cons", title: "프리미엄", subtitle: "기술 프리미엄 반영 전략" },
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
