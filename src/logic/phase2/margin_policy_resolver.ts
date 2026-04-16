import {
  PANAMA_PRIVATE_MARGINS,
  PANAMA_PUBLIC_MARGINS,
} from "./pricing_strategy_presets";

export type Phase2MarketSegment = "public" | "private";
export type Phase2Scenario = "agg" | "avg" | "cons";

export interface MarginPolicyInput {
  segment: Phase2MarketSegment;
  scenario: Phase2Scenario;
  explicitRetailMargin?: number;
  explicitWholesaleMargin?: number;
  explicitHospitalMargin?: number;
}

export interface ResolvedMargins {
  retailMargin: number;
  wholesaleMargin: number;
  logisticsMargin: number;
  riskMargin: number;
}

function clampPercent(input: number | undefined, fallback: number): number {
  if (typeof input !== "number" || Number.isNaN(input)) {
    return fallback;
  }
  if (input < 0) {
    return 0;
  }
  if (input > 0.95) {
    return 0.95;
  }
  return input;
}

export function resolveMarginPolicy(input: MarginPolicyInput): ResolvedMargins {
  const base = input.segment === "public" ? PANAMA_PUBLIC_MARGINS : PANAMA_PRIVATE_MARGINS;
  return {
    retailMargin: clampPercent(input.explicitRetailMargin, base.retailMargin),
    wholesaleMargin: clampPercent(input.explicitWholesaleMargin, base.wholesaleMargin),
    logisticsMargin: base.logisticsMargin,
    riskMargin: clampPercent(input.explicitHospitalMargin, base.riskMargin),
  };
}
