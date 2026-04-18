import { NextResponse } from "next/server";

import { findProductById } from "@/src/utils/product-dictionary";
import { enrichCandidateWithLLM } from "@/src/llm/partner_enrichment";
import { buildPartnerScores } from "@/src/logic/partner_scorer";
import { fetchPartnerCandidatesFromDB } from "@/src/logic/partner_search";

export const runtime = "nodejs";

interface Phase3RequestBody {
  product_id: string;
  report_id?: string;
}

export async function POST(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "JSON 본문 파싱에 실패했습니다." },
      { status: 400 },
    );
  }
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "요청 본문이 비어 있습니다." }, { status: 400 });
  }
  const payload = body as Partial<Phase3RequestBody>;
  if (typeof payload.product_id !== "string" || payload.product_id.trim() === "") {
    return NextResponse.json({ error: "product_id(string)가 필요합니다." }, { status: 400 });
  }
  const product = findProductById(payload.product_id);
  if (product === undefined) {
    return NextResponse.json({ error: "등록되지 않은 product_id입니다." }, { status: 400 });
  }
  try {
    const candidates = await fetchPartnerCandidatesFromDB();
    const enriched = await Promise.all(
      candidates.map(async (candidate) => {
        if (candidate.collected_secondary_at !== null) {
          return candidate;
        }
        return enrichCandidateWithLLM(candidate);
      }),
    );
    const scored = enriched.map((candidate) => {
      const scores = buildPartnerScores(
        candidate,
        product.who_inn_en,
        product.atc4_code,
      );
      return {
        ...candidate,
        score_revenue: scores.revenue,
        score_pipeline: scores.pipeline,
        score_gmp: scores.gmp,
        score_import: scores.import,
        score_pharmacy_chain: scores.pharmacy_chain,
        score_total_default: scores.revenue,
      };
    });
    const top10 = [...scored]
      .sort(
        (a, b) =>
          (b.score_revenue ?? 0) - (a.score_revenue ?? 0) ||
          a.company_name.localeCompare(b.company_name),
      )
      .slice(0, 10);

    return NextResponse.json({
      product_id: product.product_id,
      report_id: payload.report_id ?? null,
      top10,
      all_candidates_count: scored.length,
      generated_at: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `3공정 파트너 분석 실패: ${message}` },
      { status: 500 },
    );
  }
}

