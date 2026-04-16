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
  hospitalMargin: number;
}

interface DefaultMarginTable {
  agg: ResolvedMargins;
  avg: ResolvedMargins;
  cons: ResolvedMargins;
}

const PRIVATE_DEFAULT: DefaultMarginTable = {
  // 공격: 유통 마진이 가장 낮아 FOB를 높게 확보하는 시나리오
  agg: { retailMargin: 0.25, wholesaleMargin: 0.18, hospitalMargin: 0 },
  avg: { retailMargin: 0.33, wholesaleMargin: 0.24, hospitalMargin: 0 },
  cons: { retailMargin: 0.4, wholesaleMargin: 0.28, hospitalMargin: 0 },
};

const PUBLIC_DEFAULT: DefaultMarginTable = {
  agg: { retailMargin: 0, wholesaleMargin: 0, hospitalMargin: 0.1 },
  avg: { retailMargin: 0, wholesaleMargin: 0, hospitalMargin: 0.18 },
  cons: { retailMargin: 0, wholesaleMargin: 0, hospitalMargin: 0.25 },
};

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
  const table = input.segment === "public" ? PUBLIC_DEFAULT : PRIVATE_DEFAULT;
  const base = table[input.scenario];
  return {
    retailMargin: clampPercent(input.explicitRetailMargin, base.retailMargin),
    wholesaleMargin: clampPercent(input.explicitWholesaleMargin, base.wholesaleMargin),
    hospitalMargin: clampPercent(input.explicitHospitalMargin, base.hospitalMargin),
  };
}
