-- 파나마 뉴스 캐시 테이블 (24시간 TTL 조회용)
-- 실행 목적: Haiku web_search 결과를 저장해 호출 비용과 지연을 줄임
CREATE TABLE IF NOT EXISTS panama_news_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  news_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_panama_news_cache_created_at
  ON panama_news_cache (created_at DESC);
