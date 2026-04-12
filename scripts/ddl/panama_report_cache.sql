-- 보고서 생성 결과 캐시 테이블
CREATE TABLE IF NOT EXISTS panama_report_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL UNIQUE,
  case_grade TEXT NOT NULL CHECK (case_grade IN ('A', 'B', 'C')),
  report_payload JSONB NOT NULL,
  llm_model TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours')
);

CREATE INDEX IF NOT EXISTS idx_panama_report_cache_product
  ON panama_report_cache(product_id);
