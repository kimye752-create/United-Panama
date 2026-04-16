export type PricingStrategy = "penetration" | "reference" | "premium" | "custom";
export type Phase2MarketSegment = "public" | "private";

export interface MarginStructure {
  retailMargin: number;
  wholesaleMargin: number;
  logisticsMargin: number;
  riskMargin: number;
}

export const PANAMA_PRIVATE_MARGINS: MarginStructure = {
  retailMargin: 0.25,
  wholesaleMargin: 0.2,
  logisticsMargin: 0.065,
  riskMargin: 0.02,
};

export const PANAMA_PUBLIC_MARGINS: MarginStructure = {
  retailMargin: 0,
  wholesaleMargin: 0.15,
  logisticsMargin: 0.065,
  riskMargin: 0.1,
};

export const STRATEGY_MULTIPLIERS: Record<Exclude<PricingStrategy, "custom">, number> = {
  penetration: 0.85,
  reference: 1,
  premium: 1.2,
};

export const PHASE2_SCENARIO_STRATEGY = {
  agg: "penetration",
  avg: "reference",
  cons: "premium",
} as const;

