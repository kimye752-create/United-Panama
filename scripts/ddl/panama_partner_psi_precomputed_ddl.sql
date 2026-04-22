-- ============================================================
-- panama_partner_psi_precomputed — 파트너 × 제품 PSI 사전 계산 테이블
-- Supabase SQL Editor 실행 순서: 이 파일 먼저 실행 후 INSERT 파일 실행
-- 주의: 브라우저 자동 번역 비활성화 상태에서 실행 권장
-- ============================================================

CREATE TABLE IF NOT EXISTS panama_partner_psi_precomputed (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 파트너 및 제품 참조
  partner_id              UUID NOT NULL,       -- panama_partner_candidates.id 참조
  product_id              UUID NOT NULL,       -- products.id (8개 제품 UUID)

  -- 파이프라인 및 경쟁/기회 분류
  pipeline_tier           INTEGER NOT NULL CHECK (pipeline_tier BETWEEN 1 AND 5),
  -- 1=성분완전중복, 2=ATC코드+유사성분, 3=ATC동일+다른기전, 4=인접ATC, 5=겹침없음
  conflict_level          TEXT NOT NULL CHECK (
                            conflict_level IN (
                              'upgrade_opportunity',
                              'direct_competition',
                              'adjacent_category',
                              'none'
                            )
                          ),
  -- upgrade_opportunity: 우리 복합제 + 파트너 단일성분 → 업그레이드 제안
  -- direct_competition:  동일 성분/제품 경쟁
  -- adjacent_category:   ATC만 겹침 (다른 성분)
  -- none:                경쟁 없음
  conflict_insight        TEXT,                -- 2-3문장 자연어 인사이트

  -- 5개 평가 기준 점수 (원점수)
  revenue_tier            INTEGER NOT NULL CHECK (revenue_tier BETWEEN 1 AND 5),
  -- 1=100억USD+(글로벌Top20), 2=10~100억USD, 3=1~10억USD, 4=1천만~1억USD, 5=1천만미만
  revenue_score           INTEGER NOT NULL,    -- 100/80/60/40/20
  pipeline_score          INTEGER NOT NULL,    -- 100/80/60/40/20
  manufacturing_score     INTEGER NOT NULL CHECK (manufacturing_score IN (0, 100)),
  -- 100=제조소보유, 0=없음
  import_experience_score INTEGER NOT NULL CHECK (import_experience_score IN (0, 50, 100)),
  -- 100=수입경험있음, 50=부분, 0=없음
  pharmacy_chain_score    INTEGER NOT NULL CHECK (pharmacy_chain_score IN (0, 50, 100)),
  -- 100=약국체인운영, 50=부분, 0=없음

  -- PSI 기본값: 전체 5개 기준 체크 시 가중합
  -- 공식: revenue*0.35 + pipeline*0.28 + manufacturing*0.20 + import*0.12 + pharmacy*0.05
  psi_base                DECIMAL(6,2) NOT NULL,  -- 0~100 범위

  -- 메타
  notes                   TEXT,                -- 근거 URL, 기타 메모
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now(),

  UNIQUE (partner_id, product_id)
);

-- 조회 최적화 인덱스
CREATE INDEX IF NOT EXISTS idx_psi_partner
  ON panama_partner_psi_precomputed(partner_id);

CREATE INDEX IF NOT EXISTS idx_psi_product
  ON panama_partner_psi_precomputed(product_id);

CREATE INDEX IF NOT EXISTS idx_psi_base_desc
  ON panama_partner_psi_precomputed(psi_base DESC);

-- RLS 비활성화 (서버 사이드 전용)
ALTER TABLE panama_partner_psi_precomputed DISABLE ROW LEVEL SECURITY;

-- updated_at 자동 갱신 트리거 (함수 기존 것 재사용)
DROP TRIGGER IF EXISTS trg_update_psi_precomputed ON panama_partner_psi_precomputed;
CREATE TRIGGER trg_update_psi_precomputed
  BEFORE UPDATE ON panama_partner_psi_precomputed
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
