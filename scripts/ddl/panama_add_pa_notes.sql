-- Gemini seed 인용문 저장용 (load_macro.ts 등)
-- 기존 panama 테이블에 pa_notes가 없을 때만 실행
ALTER TABLE public.panama ADD COLUMN IF NOT EXISTS pa_notes TEXT;
