import { NextResponse } from "next/server";

import { generatePriceScenarios } from "@/src/logic/phase2/price_scenario_generator";
import type {
  Phase2MarketSegment,
  Phase2Scenario,
} from "@/src/logic/phase2/margin_policy_resolver";
import type { ScenarioRow } from "@/src/logic/phase2/price_scenario_generator";

export const runtime = "nodejs";

interface CalculateRequestBody {
  finalPricePab: number;
  explicitRetailMargin?: number;
  explicitWholesaleMargin?: number;
  explicitHospitalMargin?: number;
  freightUsd?: number;
  insuranceRate?: number;
  customsUsd?: number;
}

interface ScenarioCard {
  rank: 1 | 2 | 3;
  scenario: Phase2Scenario;
  label: "공격" | "평균" | "보수";
  price_pab: number;
  price_usd: number;
  price_krw: number;
  basis: string;
  calculation: string;
  markdown_rate: number;
}

interface MarketResult {
  scenarios: {
    aggressive: ScenarioCard;
    average: ScenarioCard;
    conservative: ScenarioCard;
  };
  logic: string;
  formula: string;
}

const KRW_PER_USD = 1473.1;

function toRankLabel(scenario: Phase2Scenario): { rank: 1 | 2 | 3; label: "공격" | "평균" | "보수" } {
  if (scenario === "agg") {
    return { rank: 1, label: "공격" };
  }
  if (scenario === "avg") {
    return { rank: 2, label: "평균" };
  }
  return { rank: 3, label: "보수" };
}

function scenarioToCard(row: ScenarioRow): ScenarioCard {
  const { rank, label } = toRankLabel(row.scenario);
  const markdownRate = row.fob.fobCeilingUsd <= 0 ? 0 : row.fob.fobUsd / row.fob.fobCeilingUsd;
  return {
    rank,
    scenario: row.scenario,
    label,
    price_pab: row.fob.positioningPricePab,
    price_usd: row.fob.fobUsd,
    price_krw: Math.round(row.fob.fobUsd * KRW_PER_USD),
    basis: row.subtitle,
    calculation: `${row.fob.fobCeilingUsd.toFixed(2)} × ${row.fob.strategyMultiplier.toFixed(3)} = ${row.fob.fobUsd.toFixed(2)} USD`,
    markdown_rate: Number(markdownRate.toFixed(3)),
  };
}

function toMarketResult(segment: Phase2MarketSegment, scenarios: readonly ScenarioRow[]): MarketResult {
  const byScenario = new Map<Phase2Scenario, ScenarioCard>();
  for (const row of scenarios) {
    byScenario.set(row.scenario, scenarioToCard(row));
  }
  return {
    scenarios: {
      aggressive: byScenario.get("agg") ?? scenarioToCard(scenarios[0] as ScenarioRow),
      average: byScenario.get("avg") ?? scenarioToCard(scenarios[0] as ScenarioRow),
      conservative: byScenario.get("cons") ?? scenarioToCard(scenarios[0] as ScenarioRow),
    },
    logic: segment === "public" ? "Logic A (공공조달)" : "Logic B (민간소매)",
    formula:
      segment === "public"
        ? "FOB = 낙찰가 × (1 - 마진 - 관세 - VAT)"
        : "FOB = 소매가 × (1 - 약국마진 - 도매마진 - VAT)",
  };
}

export async function POST(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON 본문 파싱에 실패했습니다." }, { status: 400 });
  }

  if (body === null || typeof body !== "object") {
    return NextResponse.json({ error: "요청 본문이 비어 있습니다." }, { status: 400 });
  }

  const payload = body as Partial<CalculateRequestBody>;
  if (typeof payload.finalPricePab !== "number" || Number.isNaN(payload.finalPricePab)) {
    return NextResponse.json({ error: "finalPricePab(number)가 필요합니다." }, { status: 400 });
  }

  const commonInput = {
    finalPricePab: payload.finalPricePab,
    explicitRetailMargin: payload.explicitRetailMargin,
    explicitWholesaleMargin: payload.explicitWholesaleMargin,
    explicitHospitalMargin: payload.explicitHospitalMargin,
    freightUsd: payload.freightUsd,
    insuranceRate: payload.insuranceRate,
    customsUsd: payload.customsUsd,
  } as const;
  const publicScenarios = generatePriceScenarios({
    ...commonInput,
    segment: "public",
  });
  const privateScenarios = generatePriceScenarios({
    ...commonInput,
    segment: "private",
  });

  return NextResponse.json({
    ok: true,
    finalPricePab: payload.finalPricePab,
    public_market: toMarketResult("public", publicScenarios),
    private_market: toMarketResult("private", privateScenarios),
    generatedAt: new Date().toISOString(),
  });
}
