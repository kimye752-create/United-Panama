-- 세션 17: market_segment — private_retail(Arrocha API), regulatory(DNFD)
-- Supabase SQL Editor에서 실행 (기존 CHECK 제약 교체)
--
-- SELECT DISTINCT market_segment FROM panama;

ALTER TABLE panama
  DROP CONSTRAINT IF EXISTS panama_market_segment_check;

ALTER TABLE panama
  ADD CONSTRAINT panama_market_segment_check
  CHECK (market_segment = ANY (ARRAY[
    'public'::text,
    'private'::text,
    'default'::text,
    'macro'::text,
    'regulatory_milestone'::text,
    'private_retail'::text,
    'regulatory'::text
  ]));
