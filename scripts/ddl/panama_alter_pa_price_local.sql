-- pa_price_local 확장 (ARCHITECTURE.md 2026-04-11 헌법 반영)
-- 거시 수치(WorldBank GDP 등) + 공공 입찰가 일관 저장

ALTER TABLE public.panama
  ALTER COLUMN pa_price_local TYPE DECIMAL(20,4);
