-- 세션 13: market_segment CHECK 갱신 + pa_milestone_type / pa_released_at
-- Supabase SQL Editor에서 실행
--
-- ▼ DDL 실행 전 필수: 기존 데이터의 segment 값이 새 ARRAY에 모두 포함되는지 확인
-- SELECT DISTINCT market_segment FROM panama;
-- 결과에 나온 모든 값이 아래 ARRAY에 있어야 함 (누락 시 ADD CONSTRAINT 실패)

ALTER TABLE panama
  DROP CONSTRAINT IF EXISTS panama_market_segment_check;

ALTER TABLE panama
  ADD CONSTRAINT panama_market_segment_check
  CHECK (market_segment = ANY (ARRAY[
    'public'::text,
    'private'::text,
    'default'::text,
    'macro'::text,
    'regulatory_milestone'::text
  ]));

ALTER TABLE panama ADD COLUMN IF NOT EXISTS pa_milestone_type TEXT;
ALTER TABLE panama ADD COLUMN IF NOT EXISTS pa_released_at TEXT;
