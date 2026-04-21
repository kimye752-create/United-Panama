import { createSupabaseServer } from "@/lib/supabase-server";
import { enrichCandidateWithLLM } from "@/src/llm/partner_enrichment";
import { buildPartnerScores } from "@/src/logic/partner_scorer";
import { fetchPartnerCandidatesFromDB } from "@/src/logic/partner_search";
import { findProductById } from "@/src/utils/product-dictionary";

export interface GeneratePartnerInput {
  sessionId: string;
  productId: string;
  country: string;
  weightedCriteria: Record<string, unknown>;
}

export interface GeneratePartnerResult {
  id: string;
  report_data: Record<string, unknown>;
}

/**
 * 3단계 파트너 발굴 — 기존 phase3 API와 동일 로직으로 top10 산출 후 reports(partner) 저장
 */
export async function generatePartnerReport(
  input: GeneratePartnerInput,
): Promise<GeneratePartnerResult> {
  try {
    const product = findProductById(input.productId);
    if (product === undefined) {
      throw new Error("등록되지 않은 product_id입니다.");
    }

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

    const reportData: Record<string, unknown> = {
      top10,
      all_candidates_count: scored.length,
      generated_at: new Date().toISOString(),
      country: input.country,
      weightedCriteria: input.weightedCriteria,
    };

    const supabase = createSupabaseServer();
    const { data, error } = await supabase
      .from("reports")
      .insert({
        session_id: input.sessionId,
        type: "partner",
        report_data: reportData,
        metadata: { product_id: input.productId },
      })
      .select("id")
      .single();

    if (error !== null) {
      throw new Error(`바이어 발굴 보고서 저장 실패: ${error.message}`);
    }
    if (data === null || typeof data.id !== "string") {
      throw new Error("바이어 발굴 보고서 id 누락");
    }

    return { id: data.id, report_data: reportData };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`바이어 발굴 보고서 생성 실패: ${message}`);
  }
}
