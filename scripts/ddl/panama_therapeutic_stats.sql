-- 시장조사 보고서용 치료영역·보건지출 통계 (collect_therapeutic_stats.ts upsert 대응)
CREATE TABLE IF NOT EXISTS public.panama_therapeutic_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL,
  atc4_code TEXT NOT NULL,
  therapeutic_area TEXT NOT NULL,

  health_expenditure_pct_gdp NUMERIC,
  health_expenditure_usd_per_capita NUMERIC,

  prevalence_rate_pct NUMERIC,
  prevalence_source TEXT,
  prevalence_year INTEGER,

  therapeutic_market_usd NUMERIC,
  therapeutic_market_source TEXT,
  therapeutic_market_year INTEGER,

  data_source TEXT,
  raw_response JSONB,

  crawled_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT panama_therapeutic_stats_product_atc UNIQUE (product_id, atc4_code)
);

CREATE INDEX IF NOT EXISTS idx_panama_therapeutic_stats_product
  ON public.panama_therapeutic_stats (product_id);
