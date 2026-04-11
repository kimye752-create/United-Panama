-- D1 정리 일괄 실행용 (Supabase SQL Editor에 붙여넣기)
-- 1) 데이터 초기화  2) pa_price_local 확장  3) 타입 확인

TRUNCATE TABLE public.panama;

ALTER TABLE public.panama
  ALTER COLUMN pa_price_local TYPE DECIMAL(20,4);

SELECT data_type, numeric_precision, numeric_scale
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'panama'
  AND column_name = 'pa_price_local';
