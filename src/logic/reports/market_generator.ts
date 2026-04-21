import { createSupabaseServer } from "@/lib/supabase-server";
import { analyzePanamaProduct } from "@/src/logic/panama_analysis";
import { serializeMarketAnalysisForDb } from "@/src/logic/reports/serialize_market_analysis";

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
 * 시장조사 단계: DB 분석 파이프라인 실행 후 reports(market) 행 생성
 */
export async function generateMarketReport(
  input: GenerateMarketInput,
): Promise<GenerateMarketResult> {
  try {
    const analysis = await analyzePanamaProduct(input.productId);
    const reportData = serializeMarketAnalysisForDb(analysis);
    const supabase = createSupabaseServer();

    const { data, error } = await supabase
      .from("reports")
      .insert({
        session_id: input.sessionId,
        type: "market",
        report_data: reportData,
        metadata: { country: input.country },
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
