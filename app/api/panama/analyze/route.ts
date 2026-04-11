/**
 * POST { productId } — 분석 파이프라인 (서버, anon만)
 */
import { NextResponse } from "next/server";

import { findProductById } from "@/src/utils/product-dictionary";
import { analyzePanamaProduct } from "@/src/logic/panama_analysis";

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
    return NextResponse.json({
      judgment: result.judgment,
      macroData: result.macroRows,
      distributors: result.distributors,
      matchedDistributors: result.matchedDistributors,
      priceRows: result.priceRows,
      emlStatus: {
        emlWho: result.emlWho,
        emlPaho: result.emlPaho,
        emlMinsa: result.emlMinsa,
      },
      sourceAggregation: result.sourceAggregation,
      sandCleaned: result.sandCleaned,
      product: result.product,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "분석 실패";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
