/**
 * llm_outputs 테이블 적재 헬퍼
 *
 * 컬럼 구분 원칙:
 *   - src_*   : LLM 입력에 쓰인 원천 데이터 (DB·크롤링 실측값) → 미래 재분석 가능
 *   - market_* / pricing_* / partner_* : AI가 생성한 서술 텍스트 → 감사 로그 전용, 재입력 불가
 *   - raw_payload : AI 생성 원본 전체 보존 → 감사 전용
 */
import { createSupabaseServer } from "@/lib/supabase-server";
import type { MarketAnalysisPayload } from "@/src/llm/market/market_generator";
import type { Phase2ReportPayload } from "@/src/llm/phase2/phase2_schema";

// ─── 공통 베이스 ──────────────────────────────────────────────────────────────

interface LlmOutputBase {
  session_id: string;
  report_id:  string;
  product_id: string;
  country:    string;
  llm_model:  string;
  llm_source: "haiku" | "fallback" | "cache" | "perplexity";
}

// ─── P1 원천 데이터 (DB·크롤링 실측값) ──────────────────────────────────────

export interface MarketSourceData {
  publicProcurementCount: number;   // PanamaCompra 입찰 건수
  privateRetailCount:     number;   // ACODECO/CABAMED 건수
  pubAvgPab:              number | null; // 공공조달 평균가 (PAB)
  privAvgPab:             number | null; // 민간 소매 평균가 (PAB)
  emlWho:                 boolean;
  emlPaho:                boolean;
  emlMinsa:               boolean;
  caseGrade:              string;   // A/B/C
}

// ─── P2 원천 데이터 ───────────────────────────────────────────────────────────

export interface PricingSourceData {
  referencePricePab: number;        // FOB 역산 기준가
  fobAggUsd:         number | null; // 저가진입 FOB (USD)
  fobAvgUsd:         number | null; // 기준 FOB (USD)
  fobConsUsd:        number | null; // 프리미엄 FOB (USD)
}

// ─── P3 원천 데이터 ───────────────────────────────────────────────────────────

export interface PartnerSourceData {
  candidatesTotal: number;
  top1Score:       number | null;
  top1Name:        string | null;
}

// ─── 도메인별 입력 타입 ───────────────────────────────────────────────────────

export interface MarketAnalysisLogInput extends LlmOutputBase {
  domain:     "market_analysis";
  payload:    MarketAnalysisPayload;  // AI 생성 (감사용)
  sourceData: MarketSourceData;       // 원천 실측값 (재분석 가능)
}

export interface PricingLogInput extends LlmOutputBase {
  domain:         "pricing_public" | "pricing_private";
  payload:        Phase2ReportPayload; // AI 생성 (감사용)
  market_segment: "public" | "private";
  sourceData:     PricingSourceData;   // 원천 실측값 (재분석 가능)
}

export interface PartnerEnrichmentLogInput extends LlmOutputBase {
  domain:      "partner_enrichment";
  top10:       Record<string, unknown>[]; // AI enrichment 결과 (감사용)
  all_candidates_count: number;
  sourceData:  PartnerSourceData;         // 원천 집계값 (재분석 가능)
}

export type LlmOutputLogInput =
  | MarketAnalysisLogInput
  | PricingLogInput
  | PartnerEnrichmentLogInput;

// ─── 메인 export ──────────────────────────────────────────────────────────────

/**
 * LLM 호출 결과를 llm_outputs 테이블에 적재한다.
 * - src_* 컬럼: DB·크롤링 원천값 → 재분석 안전
 * - 텍스트 블록 컬럼: AI 생성 → 감사 로그 전용
 * 실패해도 보고서 생성 흐름을 중단하지 않는다 (non-blocking).
 */
export async function saveLlmOutput(input: LlmOutputLogInput): Promise<void> {
  try {
    const supabase = createSupabaseServer();

    const base = {
      session_id: input.session_id,
      report_id:  input.report_id,
      product_id: input.product_id,
      country:    input.country,
      domain:     input.domain,
      llm_model:  input.llm_model,
      llm_source: input.llm_source,
    };

    let aiTextCols:   Record<string, unknown> = {}; // AI 생성 텍스트 — 감사용
    let srcDataCols:  Record<string, unknown> = {}; // 원천 실측 수치 — 재분석 가능
    let raw_payload:  Record<string, unknown> = {};

    // ── P1 시장 분석 ──────────────────────────────────────────────────────────
    if (input.domain === "market_analysis") {
      const p  = input.payload;
      const sd = input.sourceData;

      // AI 생성 텍스트 (감사 로그 전용)
      aiTextCols = {
        market_macro_overview:        p.block1_market_narrative,
        market_regulatory_path:       p.block2_regulatory_path,
        market_price_context:         p.block3_price_narrative,
        market_risk_factors:          p.block4_risk_factors,
        market_action_recommendation: p.block5_action_recommendation,
      };

      // 원천 실측값 (재분석 안전)
      srcDataCols = {
        src_public_procurement_count: sd.publicProcurementCount,
        src_private_retail_count:     sd.privateRetailCount,
        src_pub_avg_pab:              sd.pubAvgPab,
        src_priv_avg_pab:             sd.privAvgPab,
        src_eml_who:                  sd.emlWho,
        src_eml_paho:                 sd.emlPaho,
        src_eml_minsa:                sd.emlMinsa,
        src_case_grade:               sd.caseGrade,
      };

      raw_payload = p as unknown as Record<string, unknown>;

    // ── P2 수출가격 전략 ──────────────────────────────────────────────────────
    } else if (
      input.domain === "pricing_public" ||
      input.domain === "pricing_private"
    ) {
      const p  = input.payload;
      const sd = input.sourceData;

      aiTextCols = {
        pricing_market_segment:      input.market_segment,
        pricing_input_summary:       p.block1_input_summary,
        pricing_fob_calculation:     p.block2_fob_calculation,
        pricing_scenarios:           p.block3_scenarios,
        pricing_incoterms:           p.block4_incoterms,
        pricing_risk_recommendation: p.block5_risk_and_recommendation,
      };

      srcDataCols = {
        src_reference_price_pab: sd.referencePricePab,
        src_fob_agg_usd:         sd.fobAggUsd,
        src_fob_avg_usd:         sd.fobAvgUsd,
        src_fob_cons_usd:        sd.fobConsUsd,
      };

      raw_payload = p as unknown as Record<string, unknown>;

    // ── P3 바이어 enrichment ──────────────────────────────────────────────────
    } else if (input.domain === "partner_enrichment") {
      const sd = input.sourceData;

      aiTextCols = {
        partner_top10:  input.top10,
        partner_count:  input.all_candidates_count,
      };

      srcDataCols = {
        src_candidates_total: sd.candidatesTotal,
        src_psi_top1_score:   sd.top1Score,
        src_psi_top1_name:    sd.top1Name,
      };

      raw_payload = {
        top10:               input.top10,
        all_candidates_count: input.all_candidates_count,
      };
    }

    const { error } = await supabase.from("llm_outputs").insert({
      ...base,
      ...aiTextCols,
      ...srcDataCols,
      raw_payload,
    });

    if (error !== null) {
      process.stderr.write(
        `[llm-output-logger] 적재 실패 (domain=${input.domain}): ${error.message}\n`,
      );
    }
  } catch (e: unknown) {
    process.stderr.write(
      `[llm-output-logger] 예외 (domain=${input.domain}): ${
        e instanceof Error ? e.message : String(e)
      }\n`,
    );
  }
}
