import type { DocumentProps } from "@react-pdf/renderer";
import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import React from "react";

import { Phase2Document } from "@/lib/pdf/Phase2Document";
import { createSupabaseServer } from "@/lib/supabase-server";
import { generatePhase2Report } from "@/src/llm/phase2/phase2_generator";
import { generatePriceScenarios } from "@/src/logic/phase2/price_scenario_generator";
import type {
  Phase2MarketSegment,
  Phase2Scenario,
} from "@/src/logic/phase2/margin_policy_resolver";
import type { ScenarioRow } from "@/src/logic/phase2/price_scenario_generator";
import { fetchCompetitorPrices } from "@/src/logic/phase2/competitor_prices";
import { findProductById } from "@/src/utils/product-dictionary";

export const runtime = "nodejs";
export const maxDuration = 120;

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
    logic: segment === "public" ? "공공조달 FOB 역산 공식" : "민간소매 FOB 역산 공식",
    formula:
      segment === "public"
        ? "FOB = 낙찰가 × (1 - 마진 - 관세 - VAT)"
        : "FOB = 소매가 × (1 - 약국마진 - 도매마진 - VAT)",
  };
}

function safeFilenameSegment(inn: string): string {
  return inn.replace(/[^\w\-.]+/g, "_").slice(0, 80);
}

function parseCaseGrade(raw: unknown): "A" | "B" | "C" {
  if (raw === "A" || raw === "B" || raw === "C") {
    return raw;
  }
  return "B";
}

interface AnalyzeBody {
  productId?: string;
  reportId?: string;
  finalPricePab?: number;
  market?: Phase2MarketSegment;
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

  const payload = body as AnalyzeBody;
  let productId = typeof payload.productId === "string" ? payload.productId.trim() : "";
  let caseGrade: "A" | "B" | "C" = "B";

  if (typeof payload.reportId === "string" && payload.reportId !== "") {
    try {
      const sb = createSupabaseServer();
      const { data, error } = await sb
        .from("panama_report_cache")
        .select("product_id, case_grade")
        .eq("id", payload.reportId)
        .maybeSingle();
      if (error === null && data !== null) {
        const row = data as { product_id?: string; case_grade?: string };
        if (productId === "" && typeof row.product_id === "string" && row.product_id !== "") {
          productId = row.product_id;
        }
        if (typeof row.case_grade === "string") {
          caseGrade = parseCaseGrade(row.case_grade);
        }
      }
    } catch {
      // 캐시 조회 실패 시 아래에서 productId 검증
    }
  }

  if (productId === "") {
    return NextResponse.json({ error: "productId 또는 유효한 reportId가 필요합니다." }, { status: 400 });
  }

  let productName: string | undefined;
  let innEn: string | undefined;
  try {
    const sb = createSupabaseServer();
    const { data: row, error: productErr } = await sb
      .from("products")
      .select("kr_brand_name, who_inn_en")
      .eq("product_id", productId)
      .maybeSingle();
    if (productErr === null && row !== null && typeof row === "object" && !Array.isArray(row)) {
      const r = row as Record<string, unknown>;
      if (typeof r.kr_brand_name === "string" && typeof r.who_inn_en === "string") {
        productName = r.kr_brand_name;
        innEn = r.who_inn_en;
      }
    }
  } catch {
    // products 테이블 미구성 등 — 사전 데이터로 폴백
  }
  if (productName === undefined || innEn === undefined) {
    const pm = findProductById(productId);
    if (pm === undefined) {
      return NextResponse.json(
        {
          error: "product_not_found",
          message: "해당 제품 정보를 찾을 수 없습니다. 1단계 시장조사 보고서를 다시 생성해 주세요.",
        },
        { status: 404 },
      );
    }
    productName = pm.kr_brand_name;
    innEn = pm.who_inn_en;
  }

  const product = { kr_brand_name: productName, who_inn_en: innEn };

  const market: Phase2MarketSegment = payload.market === "private" ? "private" : "public";

  try {
    const competitorPrices = await fetchCompetitorPrices(productId);

    const defaultPab =
      competitorPrices.publicProcurement.avg !== null &&
      Number.isFinite(competitorPrices.publicProcurement.avg)
        ? competitorPrices.publicProcurement.avg
        : 19.8;

    const finalPricePab =
      typeof payload.finalPricePab === "number" &&
      Number.isFinite(payload.finalPricePab) &&
      payload.finalPricePab > 0
        ? payload.finalPricePab
        : defaultPab;

    const commonInput = {
      finalPricePab,
      explicitRetailMargin: undefined,
      explicitWholesaleMargin: undefined,
      explicitHospitalMargin: undefined,
      freightUsd: undefined,
      insuranceRate: undefined,
      customsUsd: undefined,
    } as const;

    const publicScenarioRows = generatePriceScenarios({
      ...commonInput,
      segment: "public",
    });
    const privateScenarioRows = generatePriceScenarios({
      ...commonInput,
      segment: "private",
    });

    const public_market = toMarketResult("public", publicScenarioRows);
    const private_market = toMarketResult("private", privateScenarioRows);

    const scenarioRowsForLlm = market === "public" ? publicScenarioRows : privateScenarioRows;
    const activeMarket = market === "public" ? public_market : private_market;

    const llm = await generatePhase2Report({
      sourceProductId: productId,
      productName: product.kr_brand_name,
      inn: product.who_inn_en,
      market,
      referencePricePab: finalPricePab,
      baselineFormula: activeMarket.formula,
      scenarios: scenarioRowsForLlm,
    });

    const aiReasoning = [llm.payload.block2_fob_calculation, llm.payload.block3_scenarios]
      .join("\n\n")
      .trim();

    const basePrice = {
      value: finalPricePab,
      currency: "USD",
      calculationMethod: "AI 분석 (Claude Haiku)",
      marketSegment:
        market === "public"
          ? "공공조달 시장 (PanamaCompra V3)"
          : "민간소매 시장 (ACODECO CABAMED)",
    };

    const pdfElement = React.createElement(Phase2Document, {
      brandName: product.kr_brand_name,
      innEn: product.who_inn_en,
      caseGrade,
      marketType: market,
      basePrice,
      formula: activeMarket.formula,
      aiReasoning,
      scenarios: {
        aggressive: {
          price: activeMarket.scenarios.aggressive.price_usd,
          reasoning: activeMarket.scenarios.aggressive.basis,
          formula: activeMarket.scenarios.aggressive.calculation,
        },
        average: {
          price: activeMarket.scenarios.average.price_usd,
          reasoning: activeMarket.scenarios.average.basis,
          formula: activeMarket.scenarios.average.calculation,
        },
        conservative: {
          price: activeMarket.scenarios.conservative.price_usd,
          reasoning: activeMarket.scenarios.conservative.basis,
          formula: activeMarket.scenarios.conservative.calculation,
        },
      },
      competitorPrices,
      collectedAt: new Date().toISOString().slice(0, 10),
    }) as React.ReactElement<DocumentProps>;

    let pdfBase64: string | null = null;
    let pdfFilename: string | null = null;
    try {
      const pdfBuffer = await renderToBuffer(pdfElement);
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      if (pdfBuffer.length <= 4_500_000) {
        pdfBase64 = Buffer.from(pdfBuffer).toString("base64");
        pdfFilename = `UPharma_Panama_PriceStrategy_${today}_${safeFilenameSegment(product.who_inn_en)}.pdf`;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      process.stderr.write(`[phase2/analyze] PDF 렌더 실패: ${msg}\n`);
    }

    return NextResponse.json({
      ok: true,
      finalPricePab,
      public_market,
      private_market,
      competitorPrices,
      llmSource: llm.source,
      modelUsed: llm.modelUsed,
      phase2Report: llm.payload,
      pdfBase64,
      pdfFilename,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return NextResponse.json(
      { error: `2단계 수출가격 책정 분석 실패: ${message}` },
      { status: 500 },
    );
  }
}
