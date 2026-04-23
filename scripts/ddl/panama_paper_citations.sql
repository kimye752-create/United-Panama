-- 시장조사 보고서용 논문·규제 인용 (collect_paper_citations.ts insert 대응)
CREATE TABLE IF NOT EXISTS public.panama_paper_citations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL,
  inn TEXT NOT NULL,
  atc4_code TEXT NOT NULL,
  citation_no INTEGER NOT NULL,
  title TEXT NOT NULL,
  authors TEXT NOT NULL,
  journal TEXT NOT NULL,
  year INTEGER NOT NULL,
  source_org TEXT NOT NULL,
  url TEXT NOT NULL,
  summary_ko TEXT NOT NULL,
  relevance TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_panama_paper_citations_product
  ON public.panama_paper_citations (product_id);
