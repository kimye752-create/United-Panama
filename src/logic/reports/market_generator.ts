import { createSupabaseServer } from "@/lib/supabase-server";
import { analyzePanamaProduct } from "@/src/logic/panama_analysis";
import { serializeMarketAnalysisForDb } from "@/src/logic/reports/serialize_market_analysis";
import { generateMarketAnalysisLLM } from "@/src/llm/market/market_generator";
import { fetchCompetitorPrices } from "@/src/logic/phase2/competitor_prices";

export interface GenerateMarketInput {
  productId: string;
  country: string;
  sessionId: string;
}

export interface GenerateMarketResult {
  id: string;
  report_data: Record<string, unknown>;
}

/**
 * 시장조사 단계: DB 분석 파이프라인 + Haiku LLM 분석 텍스트 생성 후 reports(market) 행 생성
 */
export async function generateMarketReport(
  input: GenerateMarketInput,
): Promise<GenerateMarketResult> {
  try {
    // 1. DB 분석 파이프라인
    const analysis = await analyzePanamaProduct(input.productId);
    const baseData  = serializeMarketAnalysisForDb(analysis);

    // 2. 경쟁가 조회 (LLM 프롬프트용)
    let pubAvg: number | null = null;
    let privAvg: number | null = null;
    try {
      const compPrices = await fetchCompetitorPrices(input.productId);
      pubAvg  = compPrices.publicProcurement.avg;
      privAvg = compPrices.privateRetail.avg;
    } catch { /* 가격 조회 실패 시 무시 */ }

    // 3. Anthropic Haiku LLM 시장 분석 텍스트 생성
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

    // 4. 최종 report_data 합산
    const reportData: Record<string, unknown> = {
      ...baseData,
      marketAnalysis: llm.payload,
      marketAnalysisSource: llm.source,
      competitorPrices: {
        publicProcurement: { avg: pubAvg, count: analysis.panamacompraCount },
        privateRetail:     { avg: privAvg, count: analysis.privateRetailCount },
      },
    };

    const supabase = createSupabaseServer();
    const { data, error } = await supabase
      .from("reports")
      .insert({
        session_id: input.sessionId,
        type: "market",
        report_data: reportData,
        metadata: {
          country: input.country,
          llmSource: llm.source,
        },
      })
      .select("id")
      .single();

    if (error !== null) {
      throw new Error(
        `시장조사 보고서 행 저장 실패: ${error.message}. Supabase reports 테이블·세션 FK를 확인하세요.`,
      );
    }
    if (data === null || typeof data.id !== "string") {
      throw new Error("시장조사 보고서 id를 받지 못했습니다.");
    }

    return { id: data.id, report_data: reportData };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`시장조사 보고서 생성 실패: ${message}`);
  }
}
