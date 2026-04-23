-- ─── llm_outputs: Anthropic API 수집 결과 전용 적재 테이블 ──────────────────
-- 목적: LLM 호출 1건 = 1행, 분야(domain)별 전용 컬럼으로 분리 저장
--       report_data JSONB 블롭 내 매몰되지 않고 독립 쿼리·분석 가능하게 함

CREATE TABLE IF NOT EXISTS llm_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── 연결 정보 ──────────────────────────────────────────────────────────────
  session_id  UUID REFERENCES panama_report_session(id) ON DELETE SET NULL,
  report_id   UUID REFERENCES reports(id) ON DELETE SET NULL,
  product_id  TEXT NOT NULL,
  country     TEXT NOT NULL DEFAULT 'panama',

  -- ── 분야 분류 ──────────────────────────────────────────────────────────────
  -- market_analysis   : P1 시장 분석 (MarketAnalysisPayload)
  -- pricing_public    : P2 수출가격 — 공공조달 (Phase2ReportPayload)
  -- pricing_private   : P2 수출가격 — 민간시장 (Phase2ReportPayload)
  -- partner_enrichment: P3 바이어 enrichment + PSI 평가
  -- report1           : 레거시 report1 v1/v3
  domain TEXT NOT NULL CHECK (domain IN (
    'market_analysis',
    'pricing_public',
    'pricing_private',
    'partner_enrichment',
    'report1'
  )),

  -- ── LLM 메타 ───────────────────────────────────────────────────────────────
  llm_model  TEXT NOT NULL DEFAULT 'claude-haiku-4-5-20251001',
  llm_source TEXT NOT NULL CHECK (llm_source IN ('haiku', 'fallback', 'cache')),

  -- ── P1: 시장 분석 (domain = 'market_analysis') ────────────────────────────
  market_macro_overview          TEXT,  -- 파나마 거시환경 + EML 현황 요약
  market_regulatory_path         TEXT,  -- MINSA 등록 + 진입채널
  market_price_context           TEXT,  -- 가격 데이터 해석 + 경쟁 현황
  market_risk_factors            TEXT,  -- 규제/경쟁/조달 리스크
  market_action_recommendation   TEXT,  -- 진출 전략 권고

  -- ── P2: 수출가격 전략 (domain = 'pricing_public' | 'pricing_private') ──────
  pricing_market_segment   TEXT CHECK (pricing_market_segment IN ('public', 'private')),
  pricing_input_summary    TEXT,  -- 입력 요약 (INN·참조가·시장)
  pricing_fob_calculation  TEXT,  -- Logic A/B FOB 역산 계산 서술
  pricing_scenarios        TEXT,  -- 저가진입/기준/프리미엄 3시나리오 서술
  pricing_incoterms        TEXT,  -- FOB→CFR→CIF→DDP 순방향 계산
  pricing_risk_recommendation TEXT, -- 리스크 요약 + 최종 권고 수출가

  -- ── P3: 바이어 리스트 (domain = 'partner_enrichment') ────────────────────
  partner_top10   JSONB,    -- PSI 복합 점수 기준 상위 10개사 배열
  partner_count   INTEGER,  -- 전체 후보 수

  -- ── 공통 원본 보존 ─────────────────────────────────────────────────────────
  raw_payload   JSONB NOT NULL, -- LLM 응답 원본 전체 (재현·감사용)
  input_context JSONB,          -- LLM 호출 시 사용된 입력 컨텍스트

  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_llm_outputs_session      ON llm_outputs(session_id);
CREATE INDEX IF NOT EXISTS idx_llm_outputs_product      ON llm_outputs(product_id);
CREATE INDEX IF NOT EXISTS idx_llm_outputs_domain       ON llm_outputs(domain);
CREATE INDEX IF NOT EXISTS idx_llm_outputs_generated_at ON llm_outputs(generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_llm_outputs_report       ON llm_outputs(report_id);

-- RLS 비활성화 (내부 서버 전용 테이블)
ALTER TABLE llm_outputs DISABLE ROW LEVEL SECURITY;
