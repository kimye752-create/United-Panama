-- 3개 단계별 보고서 + 결합본 세션 (지시서 CURSOR_지시서_결합보고서_리팩토링.md)
-- Supabase migration으로도 동일 내용 적용됨

CREATE TABLE IF NOT EXISTS panama_report_session (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL,
  country TEXT NOT NULL DEFAULT 'panama',

  market_report_id UUID,
  pricing_public_report_id UUID,
  pricing_private_report_id UUID,
  partner_report_id UUID,
  combined_report_id UUID,

  market_completed_at TIMESTAMPTZ,
  pricing_completed_at TIMESTAMPTZ,
  partner_completed_at TIMESTAMPTZ,
  combined_generated_at TIMESTAMPTZ,

  can_download_combined BOOLEAN GENERATED ALWAYS AS (
    market_completed_at IS NOT NULL
    AND pricing_completed_at IS NOT NULL
    AND partner_completed_at IS NOT NULL
  ) STORED,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_report_session_product
  ON panama_report_session(product_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_report_session_combined
  ON panama_report_session(can_download_combined)
  WHERE can_download_combined = true;

ALTER TABLE panama_report_session DISABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_report_session ON panama_report_session;
CREATE TRIGGER trg_update_report_session
  BEFORE UPDATE ON panama_report_session
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
