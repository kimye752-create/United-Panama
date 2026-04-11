-- ============================================================
-- panama_distributors 보조 테이블 (엔진⑥ AHP 파트너 매칭 입력)
-- PM: Supabase SQL Editor에서 수동 실행
-- ============================================================

CREATE TABLE IF NOT EXISTS public.panama_distributors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 기본 정보
  company_name TEXT NOT NULL,
  company_name_local TEXT,
  focus_area TEXT,                    -- 예: "farmacéuticos, perfumería"
  target_market TEXT,                 -- 'public' / 'private' / 'both'

  -- 평가 지표 (엔진⑥ AHP 매칭용 — 비어있어도 OK)
  estimated_revenue_usd DECIMAL(20,4),
  has_gmp_certification BOOLEAN,
  has_mah_capability BOOLEAN,
  product_lines TEXT,                 -- 취급 카테고리 자유 텍스트
  korean_partnership_history BOOLEAN, -- 한국 기업과 파트너십 경험

  -- 출처 추적
  source TEXT NOT NULL,               -- 'gemini_seed' / 'panamacompra' / 'minsa' / 'manual'
  source_url TEXT,
  source_quote TEXT,                  -- 원문 인용
  confidence DECIMAL(4,3) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- AHP 평가 결과 (3공정에서 채움, 1공정 NULL)
  ahp_psi_score DECIMAL(6,4) NULL,
  ahp_rank INTEGER NULL
);

CREATE INDEX IF NOT EXISTS idx_pa_dist_company ON public.panama_distributors(company_name);
CREATE INDEX IF NOT EXISTS idx_pa_dist_source ON public.panama_distributors(source);
CREATE INDEX IF NOT EXISTS idx_pa_dist_target ON public.panama_distributors(target_market);

-- RLS
ALTER TABLE public.panama_distributors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access_distributors"
  ON public.panama_distributors FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "anon_read_only_distributors"
  ON public.panama_distributors FOR SELECT
  TO anon
  USING (true);

-- 검증
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'panama_distributors'
ORDER BY ordinal_position;
