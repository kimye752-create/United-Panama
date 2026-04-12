/**
 * POST { productId } — 분석 파이프라인 + W5 generateReport1 (캐시·폴백)
 */
import { NextResponse } from "next/server";

import { analyzePanamaProduct } from "@/src/logic/panama_analysis";
import {
  buildRawDataDigest,
  extractPrevalenceMetric,
} from "@/src/logic/report1_digest";
import { generateReport1, type GeneratorInput } from "@/src/llm/report1_generator";
import { findProductById } from "@/src/utils/product-dictionary";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "JSON 본문을 파싱할 수 없습니다." },
      { status: 400 },
    );
  }

  if (
    body === null ||
    typeof body !== "object" ||
    !("productId" in body) ||
    typeof (body as { productId: unknown }).productId !== "string"
  ) {
    return NextResponse.json(
      { error: "productId(string)가 필요합니다." },
      { status: 400 },
    );
  }

  const productId = (body as { productId: string }).productId;
  if (findProductById(productId) === undefined) {
    return NextResponse.json(
      { error: "등록되지 않은 product_id입니다." },
      { status: 400 },
    );
  }

  try {
    const result = await analyzePanamaProduct(productId);
    const rawDataDigest = buildRawDataDigest(result);
    const prevalenceMetric = extractPrevalenceMetric([
      ...result.priceRows,
      ...result.macroRows,
    ]);

    const generatorInput: GeneratorInput = {
      productId,
      innEn: result.product.who_inn_en,
      brandName: result.product.kr_brand_name,
      caseGrade: result.judgment.case,
      caseVerdict: result.judgment.verdict,
      emlWho: result.emlWho,
      emlPaho: result.emlPaho,
      prevalenceMetric,
      distributorNames: result.matchedDistributors.map((d) => d.company_name),
      panamacompraCount: result.panamacompraCount,
      rawDataDigest,
    };

    const llm = await generateReport1(generatorInput);

    return NextResponse.json({
      judgment: result.judgment,
      macroRows: result.macroRows,
      distributors: result.distributors,
      matchedDistributors: result.matchedDistributors,
      priceRows: result.priceRows,
      emlWho: result.emlWho,
      emlPaho: result.emlPaho,
      emlMinsa: result.emlMinsa,
      emlStatus: {
        emlWho: result.emlWho,
        emlPaho: result.emlPaho,
        emlMinsa: result.emlMinsa,
      },
      sourceAggregation: result.sourceAggregation,
      sandCleaned: result.sandCleaned,
      product: result.product,
      panamacompraCount: result.panamacompraCount,
      privateRetailCount: result.privateRetailCount,
      rawDataDigest,
      prevalenceMetric,
      llm: {
        payload: llm.payload,
        source: llm.source,
        modelUsed: llm.modelUsed,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "분석 실패";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
