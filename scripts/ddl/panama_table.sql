-- ============================================================
-- panama 테이블 최종 DDL
-- ARCHITECTURE.md 기준 (공통 6컬럼 + pa_* 12종)
-- 생성일: 2026-04-11
-- ⚠ 공통 6컬럼 이름·타입 변경 절대 금지 (ARCHITECTURE.md 절대 원칙)
-- ============================================================

-- pgcrypto: gen_random_uuid() 사용 (Supabase는 기본 활성화)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.panama (

  -- ── 공통 6컬럼 (변경 금지) ──────────────────────────────
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        UUID          NOT NULL,
  market_segment    TEXT          NOT NULL
                      CHECK (market_segment IN ('public', 'private', 'macro')),
  fob_estimated_usd DECIMAL(15,4) NULL,        -- 1공정 NULL, 2공정 UPDATE
  confidence        DECIMAL(4,3)  NOT NULL
                      CHECK (confidence >= 0.0 AND confidence <= 1.0),
  crawled_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  -- ── pa_* 자유 컬럼 12종 (ARCHITECTURE.md 기준) ──────────
  pa_source         TEXT,
    -- worldbank / pubmed / ita / kotra / motie
    -- panamacompra / minsa / css / acodeco / arrocha / metroplus / llm_search
  pa_source_type    TEXT
                      CHECK (pa_source_type IN ('static_pre_loaded', 'llm_realtime')),
  pa_source_url     TEXT,
  pa_collected_at   TEXT,         -- 신선도 기준 시각 (ISO 8601 또는 연도 문자열 허용)
  pa_product_name_local TEXT,     -- 스페인어 원문 제품명
  pa_ingredient_inn TEXT,         -- 스페인어 INN (8종 매칭 키)
  pa_price_type     TEXT,
    -- tender_award / retail_normal / retail_promo / regulated / wholesale / pubmed_count
  pa_price_local    DECIMAL(20,4),  -- USD 기준 (환율 변환 불필요). 거시 GDP 등 대수치 대응
  pa_currency_unit  TEXT          DEFAULT 'USD',
  pa_package_unit   TEXT,         -- 예: "1 caja x 30 tab", "papers"
  pa_decree_listed  BOOLEAN,      -- CABAMED 등재 여부
  pa_stock_status   TEXT
                      CHECK (pa_stock_status IN ('in_stock', 'out_of_stock', 'unknown')
                             OR pa_stock_status IS NULL)
);

-- ── 인덱스 ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_panama_product_id
  ON public.panama (product_id);

CREATE INDEX IF NOT EXISTS idx_panama_source
  ON public.panama (pa_source);

CREATE INDEX IF NOT EXISTS idx_panama_crawled_at
  ON public.panama (crawled_at DESC);

CREATE INDEX IF NOT EXISTS idx_panama_market_segment
  ON public.panama (market_segment);

-- ── RLS (Row Level Security) ──────────────────────────────
ALTER TABLE public.panama ENABLE ROW LEVEL SECURITY;

-- GitHub Actions service_role 키: 전체 권한
CREATE POLICY "service_role_full_access"
  ON public.panama FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 프론트엔드 anon 키: SELECT만
CREATE POLICY "anon_read_only"
  ON public.panama FOR SELECT
  TO anon
  USING (true);

-- ── 생성 확인 ─────────────────────────────────────────────
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'panama'
ORDER BY ordinal_position;
