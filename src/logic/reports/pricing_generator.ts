import { createSupabaseServer } from "@/lib/supabase-server";
import { generatePhase2Report } from "@/src/llm/phase2/phase2_generator";
import type { Phase2MarketSegment, ResolvedMargins } from "@/src/logic/phase2/margin_policy_resolver";
import { fetchCompetitorPrices } from "@/src/logic/phase2/competitor_prices";
import { generatePriceScenarios } from "@/src/logic/phase2/price_scenario_generator";
import type { ScenarioRow } from "@/src/logic/phase2/price_scenario_generator";
import type { Phase2Scenario } from "@/src/logic/phase2/margin_policy_resolver";
import { findProductById } from "@/src/utils/product-dictionary";
import { saveLlmOutput } from "@/src/lib/llm-output-logger";
import type { Phase2ReportPayload } from "@/src/llm/phase2/phase2_schema";

const KRW_PER_USD = 1473.1;

interface ScenarioCard {
  rank: 1 | 2 | 3;
  scenario: Phase2Scenario;
  label: "저가 진입" | "기준가" | "프리미엄";
  price_pab: number;
  price_usd: number;
  price_krw: number;
  basis: string;
  calculation: string;
  markdown_rate: number;
}

interface MarketResult {
  scenarios: {
    agg: ScenarioCard;
    avg: ScenarioCard;
    cons: ScenarioCard;
  };
  logic: string;
  formula: string;
}

function toRankLabel(scenario: Phase2Scenario): {
  rank: 1 | 2 | 3;
  label: "저가 진입" | "기준가" | "프리미엄";
} {
  if (scenario === "agg") {
    return { rank: 1, label: "저가 진입" };
  }
  if (scenario === "avg") {
    return { rank: 2, label: "기준가" };
  }
  return { rank: 3, label: "프리미엄" };
}

/**
 * 실제 마진 비율을 이용해 SG 팀장 스타일의 역산 수식 문자열을 생성한다.
 * 예: PAB 95.00 ÷ (1+조달수수료 15%) ÷ (1+물류 6.5%) ÷ (1+리스크 10%) × 0.850 → FOB USD 45.22
 */
function buildFobFormula(
  positioningPricePab: number,
  fobUsd: number,
  strategyMultiplier: number,
  segment: Phase2MarketSegment,
  margins: ResolvedMargins,
): string {
  const pct = (v: number) =>
    v === Math.round(v * 10) / 10
      ? `${Math.round(v * 100)}%`
      : `${(v * 100).toFixed(1)}%`;

  const steps: string[] = [`PAB ${positioningPricePab.toFixed(2)}`];

  if (segment === "public") {
    if (margins.wholesaleMargin > 0)  steps.push(`÷ (1+조달수수료 ${pct(margins.wholesaleMargin)})`);
    if (margins.logisticsMargin > 0)  steps.push(`÷ (1+물류 ${pct(margins.logisticsMargin)})`);
    if (margins.riskMargin > 0)       steps.push(`÷ (1+리스크 ${pct(margins.riskMargin)})`);
  } else {
    if (margins.retailMargin > 0)     steps.push(`÷ (1+약국마진 ${pct(margins.retailMargin)})`);
    if (margins.wholesaleMargin > 0)  steps.push(`÷ (1+도매마진 ${pct(margins.wholesaleMargin)})`);
    if (margins.logisticsMargin > 0)  steps.push(`÷ (1+물류 ${pct(margins.logisticsMargin)})`);
    if (margins.riskMargin > 0)       steps.push(`÷ (1+리스크 ${pct(margins.riskMargin)})`);
  }

  steps.push(`× 전략배수 ${strategyMultiplier.toFixed(3)}`);
  steps.push(`→ FOB USD ${fobUsd.toFixed(2)}`);

  return steps.join("  ");
}

function scenarioToCard(row: ScenarioRow): ScenarioCard {
  const { rank, label } = toRankLabel(row.scenario);
  const markdownRate =
    row.fob.fobCeilingUsd <= 0 ? 0 : row.fob.fobUsd / row.fob.fobCeilingUsd;
  return {
    rank,
    scenario: row.scenario,
    label,
    price_pab: row.fob.positioningPricePab,
    price_usd: row.fob.fobUsd,
    price_krw: Math.round(row.fob.fobUsd * KRW_PER_USD),
    basis: row.subtitle,
    calculation: buildFobFormula(
      row.fob.positioningPricePab,
      row.fob.fobUsd,
      row.fob.strategyMultiplier,
      row.fob.segment,
      row.fob.margins,
    ),
    markdown_rate: Number(markdownRate.toFixed(3)),
  };
}

function toMarketResult(
  segment: Phase2MarketSegment,
  scenarios: readonly ScenarioRow[],
): MarketResult {
  const byScenario = new Map<Phase2Scenario, ScenarioCard>();
  for (const row of scenarios) {
    byScenario.set(row.scenario, scenarioToCard(row));
  }
  return {
    scenarios: {
      agg:  byScenario.get("agg")  ?? scenarioToCard(scenarios[0] as ScenarioRow),
      avg:  byScenario.get("avg")  ?? scenarioToCard(scenarios[0] as ScenarioRow),
      cons: byScenario.get("cons") ?? scenarioToCard(scenarios[0] as ScenarioRow),
    },
    logic:
      segment === "public"
        ? "공공조달 FOB 역산 공식"
        : "민간소매 FOB 역산 공식",
    formula:
      segment === "public"
        ? "FOB = 낙찰가 × (1 - 마진 - 관세 - VAT)"
        : "FOB = 소매가 × (1 - 약국마진 - 도매마진 - VAT)",
  };
}

export interface GeneratePricingInput {
  sessionId: string;
  marketReportId: string;
  marketSegment: Phase2MarketSegment;
  productId: string;
}

export interface GeneratePricingResult {
  id: string;
  report_data: Record<string, unknown>;
}

async function runOneSegment(
  supabase: ReturnType<typeof createSupabaseServer>,
  input: GeneratePricingInput,
  segment: Phase2MarketSegment,
): Promise<GeneratePricingResult> {
  const product = findProductById(input.productId);
  if (product === undefined) {
    throw new Error("유효하지 않은 product_id입니다.");
  }

  const competitorPrices = await fetchCompetitorPrices(input.productId);

  // 세그먼트별 참조가 선택: 공공은 publicProcurement, 민간은 privateRetail
  const segmentChannel =
    segment === "public"
      ? competitorPrices.publicProcurement
      : competitorPrices.privateRetail;
  const segmentAvg = segmentChannel.avg;

  // 실측 데이터 없으면 FOB 역산 불가 — 19.8 PAB 하드코딩 fallback 제거
  // (참조가 조작으로 가짜 수출가가 UI에 표시되는 문제 방지)
  if (segmentAvg === null || !Number.isFinite(segmentAvg)) {
    throw new Error(
      `PRICING_DATA_UNAVAILABLE: ${segment === "public" ? "공공조달" : "민간소매"} 가격 데이터가 수집되지 않아 FOB 역산을 수행할 수 없습니다. (product_id=${input.productId})`,
    );
  }
  const defaultPab = segmentAvg;

  const commonInput = {
    finalPricePab: defaultPab,
    explicitRetailMargin: undefined,
    explicitWholesaleMargin: undefined,
    explicitHospitalMargin: undefined,
    freightUsd: undefined,
    insuranceRate: undefined,
    customsUsd: undefined,
  } as const;

  const scenarioRows = generatePriceScenarios({
    ...commonInput,
    segment,
  });
  const activeMarket = toMarketResult(segment, scenarioRows);

  const llm = await generatePhase2Report({
    sourceProductId: input.productId,
    productName: product.kr_brand_name,
    inn: product.who_inn_en,
    formulation: product.formulation,
    patentTech: product.patent_tech ?? null,
    isCombinationDrug: product.is_combination_drug ?? false,
    market: segment,
    referencePricePab: defaultPab,
    baselineFormula: activeMarket.formula,
    scenarios: scenarioRows,
    competitorPrices,
  });

  const payload = llm.payload as unknown as Record<string, unknown>;

  const { data, error } = await supabase
    .from("reports")
    .insert({
      session_id: input.sessionId,
      type: segment === "public" ? "pricing_public" : "pricing_private",
      report_data: {
        phase2Report: payload,
        marketResult: activeMarket,
        competitorPrices,
        marketReportId: input.marketReportId,
      },
      metadata: {
        llmSource: llm.source,
        modelUsed: llm.modelUsed,
        segment,
      },
    })
    .select("id")
    .single();

  if (error !== null) {
    throw new Error(
      `수출가격 보고서(${segment}) 저장 실패: ${error.message}`,
    );
  }
  if (data === null || typeof data.id !== "string") {
    throw new Error(`수출가격 보고서(${segment}) id 누락`);
  }

  // llm_outputs 적재 — src_* 컬럼에 원천 실측값 (non-blocking)
  void saveLlmOutput({
    domain:         segment === "public" ? "pricing_public" : "pricing_private",
    session_id:     input.sessionId,
    report_id:      data.id,
    product_id:     input.productId,
    country:        "panama",
    llm_model:      llm.modelUsed ?? "claude-haiku-4-5-20251001",
    llm_source:     llm.source as "haiku" | "fallback" | "cache",
    payload:        llm.payload as Phase2ReportPayload,
    market_segment: segment,
    // 원천 실측값 (DB·가격 계산 결과, 재분석 가능)
    sourceData: {
      referencePricePab: defaultPab,
      fobAggUsd:         activeMarket.scenarios.agg.price_usd,
      fobAvgUsd:         activeMarket.scenarios.avg.price_usd,
      fobConsUsd:        activeMarket.scenarios.cons.price_usd,
    },
  });

  return {
    id: data.id,
    report_data: {
      phase2Report: llm.payload,
      marketResult: activeMarket,
      competitorPrices,
    },
  };
}

/**
 * 공공·민간 각각 reports 행 생성 (호출부에서 Promise.all)
 */
export async function generatePricingReport(
  input: GeneratePricingInput,
): Promise<GeneratePricingResult> {
  try {
    const supabase = createSupabaseServer();
    return await runOneSegment(supabase, input, input.marketSegment);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`수출가격 보고서 생성 실패: ${message}`);
  }
}
