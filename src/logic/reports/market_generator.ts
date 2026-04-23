import { createSupabaseServer } from "@/lib/supabase-server";
import { analyzePanamaProduct } from "@/src/logic/panama_analysis";
import { serializeMarketAnalysisForDb } from "@/src/logic/reports/serialize_market_analysis";
import { generateMarketAnalysisLLM } from "@/src/llm/market/market_generator";
import { fetchCompetitorPrices } from "@/src/logic/phase2/competitor_prices";
import { saveLlmOutput } from "@/src/lib/llm-output-logger";
import { collectTherapeuticStats } from "@/src/crawlers/collect_therapeutic_stats";
import { collectPaperCitations } from "@/src/crawlers/collect_paper_citations";

export interface GenerateMarketInput {
  productId: string;
  country: string;
  sessionId: string;
}

export interface GenerateMarketResult {
  id: string;
  report_data: Record<string, unknown>;
}

// ─── 보조: DB에서 파나마 거시 통계 조회 ──────────────────────────────────────

async function fetchMacroStats(
  supabase: ReturnType<typeof createSupabaseServer>,
) {
  const { data } = await supabase
    .from("panama_macro_stats")
    .select("*")
    .order("crawled_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

// ─── 보조: DB에서 치료영역 통계 조회 ────────────────────────────────────────

async function fetchTherapeuticStats(
  supabase: ReturnType<typeof createSupabaseServer>,
  productId: string,
) {
  const { data } = await supabase
    .from("panama_therapeutic_stats")
    .select("*")
    .eq("product_id", productId)
    .order("crawled_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

// ─── 보조: DB에서 논문 인용 조회 ─────────────────────────────────────────────

async function fetchPaperCitations(
  supabase: ReturnType<typeof createSupabaseServer>,
  productId: string,
) {
  const { data } = await supabase
    .from("panama_paper_citations")
    .select("*")
    .eq("product_id", productId)
    .order("citation_no", { ascending: true });
  return data ?? [];
}

// ─── 보조: panama 테이블에서 경쟁사 개별 제품 조회 ───────────────────────────

async function fetchCompetitorProductRows(
  supabase: ReturnType<typeof createSupabaseServer>,
  productId: string,
) {
  const { data } = await supabase
    .from("panama")
    .select("pa_source, pa_product_name_local, pa_ingredient_inn, pa_price_local, pa_currency_unit, pa_package_unit, pa_price_type, market_segment")
    .eq("product_id", productId)
    .not("pa_product_name_local", "is", null)
    .in("pa_price_type", ["tender_award", "retail_normal", "retail_promo", "regulated"])
    .order("pa_price_local", { ascending: false })
    .limit(10);
  return data ?? [];
}

/**
 * 시장조사 단계:
 * 1) DB 분석 파이프라인
 * 2) 치료영역 통계 수집 (없으면 자동 크롤)
 * 3) 논문 인용 수집 (없으면 자동 수집)
 * 4) 경쟁사 제품 조회
 * 5) Haiku LLM 시장 분석 텍스트 생성
 * 6) DB 저장 + llm_outputs 적재
 */
export async function generateMarketReport(
  input: GenerateMarketInput,
): Promise<GenerateMarketResult> {
  try {
    const supabase = createSupabaseServer();

    // 1. DB 분석 파이프라인
    const analysis = await analyzePanamaProduct(input.productId);
    const baseData  = serializeMarketAnalysisForDb(analysis);

    // 1-b. 파나마 거시 통계 (인구·GDP·전체 시장 규모)
    const macroStats = await fetchMacroStats(supabase);

    // 2. 경쟁가 조회
    let pubAvg: number | null = null;
    let privAvg: number | null = null;
    try {
      const compPrices = await fetchCompetitorPrices(input.productId);
      pubAvg  = compPrices.publicProcurement.avg;
      privAvg = compPrices.privateRetail.avg;
    } catch { /* 무시 */ }

    // 3. 치료영역 통계 — 없으면 자동 수집(논문 인용과 동일하게 완료 후 재조회)
    let therStats = await fetchTherapeuticStats(supabase, input.productId);
    if (therStats === null) {
      try {
        await collectTherapeuticStats(
          input.productId,
          analysis.product.atc4_code,
          analysis.product.therapeutic_area,
        );
      } catch {
        /* World Bank·LLM·DB 적재 실패 시 보고서는 therStats null로 진행 */
      }
      therStats = await fetchTherapeuticStats(supabase, input.productId);
    }

    // 4. 논문 인용 — 없으면 자동 수집
    let citations = await fetchPaperCitations(supabase, input.productId);
    if (citations.length === 0) {
      await collectPaperCitations(
        input.productId,
        analysis.product.who_inn_en,
        analysis.product.atc4_code,
      );
      citations = await fetchPaperCitations(supabase, input.productId);
    }

    // 5. 경쟁사 개별 제품
    const competitorProductRows = await fetchCompetitorProductRows(supabase, input.productId);

    // 6. Haiku LLM 시장 분석
    const llm = await generateMarketAnalysisLLM({
      productName:             analysis.product.kr_brand_name,
      inn:                     analysis.product.who_inn_en,
      therapeuticArea:         analysis.product.therapeutic_area,
      atc4Code:                analysis.product.atc4_code,
      emlWho:                  analysis.emlWho,
      emlPaho:                 analysis.emlPaho,
      emlMinsa:                analysis.emlMinsa,
      publicProcurementCount:  analysis.panamacompraCount,
      privateRetailCount:      analysis.privateRetailCount,
      pubAvg,
      privAvg,
      caseGrade:               analysis.judgment.case,
      caseRationale:           String(
        (analysis.judgment as unknown as Record<string, unknown>)["rationale"] ?? ""
      ),
    });

    // 7. report_data 합산
    const reportData: Record<string, unknown> = {
      ...baseData,
      marketAnalysis:       llm.payload,
      marketAnalysisSource: llm.source,
      competitorPrices: {
        publicProcurement: { avg: pubAvg, count: analysis.panamacompraCount },
        privateRetail:     { avg: privAvg, count: analysis.privateRetailCount },
      },
      therapeuticStats:     therStats,
      paperCitations:       citations,
      competitorProducts:   competitorProductRows,
      macroStats,
    };

    const { data, error } = await supabase
      .from("reports")
      .insert({
        session_id:  input.sessionId,
        type:        "market",
        report_data: reportData,
        metadata:    { country: input.country, llmSource: llm.source },
      })
      .select("id")
      .single();

    if (error !== null) {
      throw new Error(`시장조사 보고서 저장 실패: ${error.message}`);
    }
    if (data === null || typeof data.id !== "string") {
      throw new Error("시장조사 보고서 id 누락");
    }

    // 8. llm_outputs 적재
    void saveLlmOutput({
      domain:     "market_analysis",
      session_id: input.sessionId,
      report_id:  data.id,
      product_id: input.productId,
      country:    input.country,
      llm_model:  "claude-haiku-4-5-20251001",
      llm_source: llm.source,
      payload:    llm.payload,
      sourceData: {
        publicProcurementCount: analysis.panamacompraCount,
        privateRetailCount:     analysis.privateRetailCount,
        pubAvgPab:              pubAvg,
        privAvgPab:             privAvg,
        emlWho:                 analysis.emlWho,
        emlPaho:                analysis.emlPaho,
        emlMinsa:               analysis.emlMinsa,
        caseGrade:              analysis.judgment.case,
      },
    });

    return { id: data.id, report_data: reportData };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`시장조사 보고서 생성 실패: ${message}`);
  }
}
