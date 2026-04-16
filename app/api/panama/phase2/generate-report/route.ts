import { NextResponse } from "next/server";

import { generatePhase2Report } from "@/src/llm/phase2/phase2_generator";
import type { ScenarioRow } from "@/src/logic/phase2/price_scenario_generator";
import type { Phase2MarketSegment } from "@/src/logic/phase2/margin_policy_resolver";

export const runtime = "nodejs";

interface GenerateReportBody {
  productId: string;
  productName: string;
  inn: string;
  market: Phase2MarketSegment;
  referencePricePab: number;
  baselineFormula: string;
  scenarios: ScenarioRow[];
}

function isValidMarket(value: unknown): value is Phase2MarketSegment {
  return value === "public" || value === "private";
}

export async function POST(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON 본문 파싱 실패" }, { status: 400 });
  }
  if (body === null || typeof body !== "object") {
    return NextResponse.json({ error: "요청 본문이 비어 있습니다." }, { status: 400 });
  }

  const payload = body as Partial<GenerateReportBody>;
  if (
    typeof payload.productId !== "string" ||
    typeof payload.productName !== "string" ||
    typeof payload.inn !== "string" ||
    !isValidMarket(payload.market) ||
    typeof payload.referencePricePab !== "number" ||
    typeof payload.baselineFormula !== "string" ||
    !Array.isArray(payload.scenarios)
  ) {
    return NextResponse.json({ error: "필수 필드(productId/productName/inn/market/scenarios) 누락" }, { status: 400 });
  }

  try {
    const result = await generatePhase2Report({
      sourceProductId: payload.productId,
      productName: payload.productName,
      inn: payload.inn,
      market: payload.market,
      referencePricePab: payload.referencePricePab,
      baselineFormula: payload.baselineFormula,
      scenarios: payload.scenarios,
    });
    return NextResponse.json({
      ok: true,
      source: result.source,
      modelUsed: result.modelUsed,
      report: result.payload,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `2공정 보고서 생성 실패: ${message}` }, { status: 500 });
  }
}
