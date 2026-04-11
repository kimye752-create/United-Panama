-- ============================================================
-- panama_eml — EML(WHO/PAHO/MINSA) 출처별 1공정 적재
-- load_eml.ts 의 PanamaEmlRow 와 1:1
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.panama_eml (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        UUID          NOT NULL,
  market_segment    TEXT          NOT NULL
                      CHECK (market_segment IN ('eml_who', 'eml_paho', 'eml_minsa')),
  fob_estimated_usd DECIMAL(15,4) NULL,
  confidence        DECIMAL(4,3)  NOT NULL
                      CHECK (confidence >= 0.0 AND confidence <= 1.0),
  crawled_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  pa_source_type    TEXT
                      CHECK (pa_source_type IN ('static_pre_loaded', 'llm_realtime')),
  pa_raw_data       JSONB         NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_panama_eml_product
  ON public.panama_eml (product_id);

CREATE INDEX IF NOT EXISTS idx_panama_eml_segment
  ON public.panama_eml (market_segment);

ALTER TABLE public.panama_eml ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access_panama_eml"
  ON public.panama_eml FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "anon_read_only_panama_eml"
  ON public.panama_eml FOR SELECT
  TO anon
  USING (true);
