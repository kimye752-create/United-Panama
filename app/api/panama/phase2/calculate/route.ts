import { NextResponse } from "next/server";

import { generatePriceScenarios } from "@/src/logic/phase2/price_scenario_generator";
import type { Phase2MarketSegment } from "@/src/logic/phase2/margin_policy_resolver";

export const runtime = "nodejs";

interface CalculateRequestBody {
  finalPricePab: number;
  segment: Phase2MarketSegment;
  explicitRetailMargin?: number;
  explicitWholesaleMargin?: number;
  explicitHospitalMargin?: number;
  freightUsd?: number;
  insuranceRate?: number;
  customsUsd?: number;
}

function isValidSegment(v: unknown): v is Phase2MarketSegment {
  return v === "public" || v === "private";
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
  if (!isValidSegment(payload.segment)) {
    return NextResponse.json({ error: "segment는 public/private 중 하나여야 합니다." }, { status: 400 });
  }

  const scenarios = generatePriceScenarios({
    finalPricePab: payload.finalPricePab,
    segment: payload.segment,
    explicitRetailMargin: payload.explicitRetailMargin,
    explicitWholesaleMargin: payload.explicitWholesaleMargin,
    explicitHospitalMargin: payload.explicitHospitalMargin,
    freightUsd: payload.freightUsd,
    insuranceRate: payload.insuranceRate,
    customsUsd: payload.customsUsd,
  });
  const baseline = scenarios.find((row) => row.scenario === "avg") ?? scenarios[0];

  return NextResponse.json({
    ok: true,
    segment: payload.segment,
    finalPricePab: payload.finalPricePab,
    baseline,
    scenarios,
    generatedAt: new Date().toISOString(),
  });
}
