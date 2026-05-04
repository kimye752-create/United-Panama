-- ============================================================
-- Panama → Team DB Migration: Schema (DDL only)
-- Auto-generated from Personal DB OpenAPI introspection
-- Generated: 2026-05-04T15:50:21.808Z
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Table: panama ──
CREATE TABLE IF NOT EXISTS public.panama (
  id                           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id                   uuid NOT NULL,
  market_segment               text NOT NULL,
  fob_estimated_usd            numeric,
  confidence                   numeric NOT NULL,
  crawled_at                   timestamptz NOT NULL DEFAULT NOW(),
  pa_source                    text,
  pa_source_type               text,
  pa_source_url                text,
  pa_collected_at              text,
  pa_product_name_local        text,
  pa_ingredient_inn            text,
  pa_price_type                text,
  pa_price_local               numeric,
  pa_currency_unit             text,
  pa_package_unit              text,
  pa_decree_listed             boolean,
  pa_stock_status              text,
  pa_notes                     text,
  pa_milestone_type            text,
  pa_released_at               text,
  pa_refresh_cycle             text,
  pa_item_collected_at         timestamptz,
  pa_freshness_status          text,
  pa_freshness_checked_at      timestamptz
);

-- RLS for panama
ALTER TABLE public.panama ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_full_access_panama" ON public.panama;
CREATE POLICY "service_role_full_access_panama"
  ON public.panama FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "anon_read_only_panama" ON public.panama;
CREATE POLICY "anon_read_only_panama"
  ON public.panama FOR SELECT
  TO anon
  USING (true);


-- ── Table: panama_distributors ──
CREATE TABLE IF NOT EXISTS public.panama_distributors (
  id                           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name                 text NOT NULL,
  company_name_local           text,
  focus_area                   text,
  target_market                text,
  estimated_revenue_usd        numeric,
  has_gmp_certification        boolean,
  has_mah_capability           boolean,
  product_lines                text,
  korean_partnership_history   boolean,
  source                       text NOT NULL,
  source_url                   text,
  source_quote                 text,
  confidence                   numeric NOT NULL,
  collected_at                 timestamptz NOT NULL,
  ahp_psi_score                numeric,
  ahp_rank                     integer
);

-- RLS for panama_distributors
ALTER TABLE public.panama_distributors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_full_access_panama_distributors" ON public.panama_distributors;
CREATE POLICY "service_role_full_access_panama_distributors"
  ON public.panama_distributors FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "anon_read_only_panama_distributors" ON public.panama_distributors;
CREATE POLICY "anon_read_only_panama_distributors"
  ON public.panama_distributors FOR SELECT
  TO anon
  USING (true);


-- ── Table: panama_eml ──
CREATE TABLE IF NOT EXISTS public.panama_eml (
  id                           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id                   uuid NOT NULL,
  market_segment               text NOT NULL,
  fob_estimated_usd            numeric,
  confidence                   numeric NOT NULL,
  crawled_at                   timestamptz NOT NULL DEFAULT NOW(),
  pa_inn_name                  text NOT NULL,
  pa_eml_listed                boolean,
  pa_paho_procurable           boolean,
  pa_minsa_essential           boolean,
  pa_atc_code                  text,
  pa_therapeutic_class         text,
  pa_notes                     text,
  pa_source_url                text,
  pa_raw_data                  jsonb
);

-- RLS for panama_eml
ALTER TABLE public.panama_eml ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_full_access_panama_eml" ON public.panama_eml;
CREATE POLICY "service_role_full_access_panama_eml"
  ON public.panama_eml FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "anon_read_only_panama_eml" ON public.panama_eml;
CREATE POLICY "anon_read_only_panama_eml"
  ON public.panama_eml FOR SELECT
  TO anon
  USING (true);


-- ── Table: panama_ingredient_eligibility ──
CREATE TABLE IF NOT EXISTS public.panama_ingredient_eligibility (
  id                           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inn                          text NOT NULL,
  inn_es                       text,
  atc_code                     text,
  panama_distributable         boolean NOT NULL,
  example_registration_no      text,
  registered_brand_count       integer,
  market_status                text,
  evidence_source              text,
  evidence_url                 text,
  evidence_notes               jsonb,
  collected_at                 timestamptz,
  confidence                   numeric
);

-- RLS for panama_ingredient_eligibility
ALTER TABLE public.panama_ingredient_eligibility ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_full_access_panama_ingredient_eligibility" ON public.panama_ingredient_eligibility;
CREATE POLICY "service_role_full_access_panama_ingredient_eligibility"
  ON public.panama_ingredient_eligibility FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "anon_read_only_panama_ingredient_eligibility" ON public.panama_ingredient_eligibility;
CREATE POLICY "anon_read_only_panama_ingredient_eligibility"
  ON public.panama_ingredient_eligibility FOR SELECT
  TO anon
  USING (true);


-- ── Table: panama_macro_stats ──
CREATE TABLE IF NOT EXISTS public.panama_macro_stats (
  id                           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  population                   bigint,
  population_source            text,
  population_year              integer,
  gdp_per_capita_usd           numeric,
  gdp_total_usd_billion        numeric,
  gdp_source                   text,
  gdp_year                     integer,
  pharma_market_usd            numeric,
  pharma_market_source         text,
  pharma_market_year           integer,
  import_dependency_pct        numeric,
  import_dependency_source     text,
  data_source                  text,
  crawled_at                   timestamptz NOT NULL DEFAULT NOW()
);

-- RLS for panama_macro_stats
ALTER TABLE public.panama_macro_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_full_access_panama_macro_stats" ON public.panama_macro_stats;
CREATE POLICY "service_role_full_access_panama_macro_stats"
  ON public.panama_macro_stats FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "anon_read_only_panama_macro_stats" ON public.panama_macro_stats;
CREATE POLICY "anon_read_only_panama_macro_stats"
  ON public.panama_macro_stats FOR SELECT
  TO anon
  USING (true);


-- ── Table: panama_news_cache ──
CREATE TABLE IF NOT EXISTS public.panama_news_cache (
  id                           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  news_json                    jsonb NOT NULL,
  created_at                   timestamptz NOT NULL DEFAULT NOW()
);

-- RLS for panama_news_cache
ALTER TABLE public.panama_news_cache ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_full_access_panama_news_cache" ON public.panama_news_cache;
CREATE POLICY "service_role_full_access_panama_news_cache"
  ON public.panama_news_cache FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "anon_read_only_panama_news_cache" ON public.panama_news_cache;
CREATE POLICY "anon_read_only_panama_news_cache"
  ON public.panama_news_cache FOR SELECT
  TO anon
  USING (true);


-- ── Table: panama_paper_citations ──
CREATE TABLE IF NOT EXISTS public.panama_paper_citations (
  id                           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id                   text NOT NULL,
  inn                          text,
  atc4_code                    text,
  citation_no                  integer NOT NULL,
  title                        text NOT NULL,
  authors                      text,
  journal                      text,
  year                         integer,
  source_org                   text,
  url                          text,
  summary_ko                   text,
  relevance                    text,
  llm_model                    text,
  collected_at                 timestamptz
);

-- RLS for panama_paper_citations
ALTER TABLE public.panama_paper_citations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_full_access_panama_paper_citations" ON public.panama_paper_citations;
CREATE POLICY "service_role_full_access_panama_paper_citations"
  ON public.panama_paper_citations FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "anon_read_only_panama_paper_citations" ON public.panama_paper_citations;
CREATE POLICY "anon_read_only_panama_paper_citations"
  ON public.panama_paper_citations FOR SELECT
  TO anon
  USING (true);


-- ── Table: panama_partner_candidates ──
CREATE TABLE IF NOT EXISTS public.panama_partner_candidates (
  id                           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name                 text NOT NULL,
  company_name_normalized      text NOT NULL,
  phone                        text,
  email                        text,
  address                      text,
  website                      text,
  source_primary               text,
  collected_primary_at         timestamptz,
  revenue_usd                  numeric,
  employee_count               integer,
  founded_year                 integer,
  therapeutic_areas            text[],
  gmp_certified                boolean,
  import_history               boolean,
  import_history_detail        text,
  public_procurement_wins      integer,
  pharmacy_chain_operator      boolean,
  mah_capable                  boolean,
  korea_partnership            boolean,
  korea_partnership_detail     text,
  source_secondary             text[],
  collected_secondary_at       timestamptz,
  score_revenue                numeric,
  score_pipeline               numeric,
  score_gmp                    numeric,
  score_import                 numeric,
  score_pharmacy_chain         numeric,
  score_total_default          numeric,
  created_at                   timestamptz DEFAULT NOW(),
  updated_at                   timestamptz DEFAULT NOW(),
  registered_products          text[],
  cphi_category                text
);

-- RLS for panama_partner_candidates
ALTER TABLE public.panama_partner_candidates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_full_access_panama_partner_candidates" ON public.panama_partner_candidates;
CREATE POLICY "service_role_full_access_panama_partner_candidates"
  ON public.panama_partner_candidates FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "anon_read_only_panama_partner_candidates" ON public.panama_partner_candidates;
CREATE POLICY "anon_read_only_panama_partner_candidates"
  ON public.panama_partner_candidates FOR SELECT
  TO anon
  USING (true);


-- ── Table: panama_partner_psi_precomputed ──
CREATE TABLE IF NOT EXISTS public.panama_partner_psi_precomputed (
  id                           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id                   uuid NOT NULL,
  product_id                   uuid NOT NULL,
  pipeline_tier                integer NOT NULL,
  conflict_level               text NOT NULL,
  conflict_insight             text,
  revenue_tier                 integer NOT NULL,
  revenue_score                integer NOT NULL,
  pipeline_score               integer NOT NULL,
  manufacturing_score          integer NOT NULL,
  import_experience_score      integer NOT NULL,
  pharmacy_chain_score         integer NOT NULL,
  psi_base                     numeric NOT NULL,
  notes                        text,
  created_at                   timestamptz DEFAULT NOW(),
  updated_at                   timestamptz DEFAULT NOW()
);

-- RLS for panama_partner_psi_precomputed
ALTER TABLE public.panama_partner_psi_precomputed ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_full_access_panama_partner_psi_precomputed" ON public.panama_partner_psi_precomputed;
CREATE POLICY "service_role_full_access_panama_partner_psi_precomputed"
  ON public.panama_partner_psi_precomputed FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "anon_read_only_panama_partner_psi_precomputed" ON public.panama_partner_psi_precomputed;
CREATE POLICY "anon_read_only_panama_partner_psi_precomputed"
  ON public.panama_partner_psi_precomputed FOR SELECT
  TO anon
  USING (true);


-- ── Table: panama_perplexity_cache ──
CREATE TABLE IF NOT EXISTS public.panama_perplexity_cache (
  id                           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inn_target                   text NOT NULL,
  papers                       jsonb NOT NULL,
  generated_at                 timestamptz,
  expires_at                   timestamptz NOT NULL
);

-- RLS for panama_perplexity_cache
ALTER TABLE public.panama_perplexity_cache ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_full_access_panama_perplexity_cache" ON public.panama_perplexity_cache;
CREATE POLICY "service_role_full_access_panama_perplexity_cache"
  ON public.panama_perplexity_cache FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "anon_read_only_panama_perplexity_cache" ON public.panama_perplexity_cache;
CREATE POLICY "anon_read_only_panama_perplexity_cache"
  ON public.panama_perplexity_cache FOR SELECT
  TO anon
  USING (true);


-- ── Table: panama_product_registration ──
CREATE TABLE IF NOT EXISTS public.panama_product_registration (
  id                           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id                   uuid NOT NULL,
  self_brand                   text NOT NULL,
  self_inn_combined            text NOT NULL,
  self_concentration           text NOT NULL,
  self_form                    text NOT NULL,
  is_combination               boolean NOT NULL,
  is_special_form              boolean,
  special_form_type            text,
  identical_set_registered     boolean,
  identical_registration_no    text,
  identical_examples           jsonb,
  similar_combination_exists   boolean,
  similar_examples             jsonb,
  individual_ingredients_registered boolean,
  individual_examples          jsonb,
  registration_path            text,
  estimated_cost_usd           numeric,
  estimated_duration_days      integer,
  market_entry_priority        integer,
  market_entry_category        text,
  evidence_source              text,
  evidence_url                 text,
  evidence_notes               jsonb,
  collected_at                 timestamptz,
  collected_by                 text,
  confidence                   numeric
);

-- RLS for panama_product_registration
ALTER TABLE public.panama_product_registration ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_full_access_panama_product_registration" ON public.panama_product_registration;
CREATE POLICY "service_role_full_access_panama_product_registration"
  ON public.panama_product_registration FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "anon_read_only_panama_product_registration" ON public.panama_product_registration;
CREATE POLICY "anon_read_only_panama_product_registration"
  ON public.panama_product_registration FOR SELECT
  TO anon
  USING (true);


-- ── Table: panama_report_cache ──
CREATE TABLE IF NOT EXISTS public.panama_report_cache (
  id                           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id                   uuid NOT NULL,
  case_grade                   text NOT NULL,
  report_payload               jsonb NOT NULL,
  llm_model                    text NOT NULL,
  generated_at                 timestamptz NOT NULL,
  expires_at                   timestamptz NOT NULL,
  pdf_base64                   text,
  pdf_filename                 text
);

-- RLS for panama_report_cache
ALTER TABLE public.panama_report_cache ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_full_access_panama_report_cache" ON public.panama_report_cache;
CREATE POLICY "service_role_full_access_panama_report_cache"
  ON public.panama_report_cache FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "anon_read_only_panama_report_cache" ON public.panama_report_cache;
CREATE POLICY "anon_read_only_panama_report_cache"
  ON public.panama_report_cache FOR SELECT
  TO anon
  USING (true);


-- ── Table: panama_report_session ──
CREATE TABLE IF NOT EXISTS public.panama_report_session (
  id                           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id                   uuid NOT NULL,
  country                      text NOT NULL,
  market_report_id             uuid,
  pricing_public_report_id     uuid,
  pricing_private_report_id    uuid,
  partner_report_id            uuid,
  combined_report_id           uuid,
  market_completed_at          timestamptz,
  pricing_completed_at         timestamptz,
  partner_completed_at         timestamptz,
  combined_generated_at        timestamptz,
  can_download_combined        boolean,
  created_at                   timestamptz DEFAULT NOW(),
  updated_at                   timestamptz DEFAULT NOW()
);

-- RLS for panama_report_session
ALTER TABLE public.panama_report_session ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_full_access_panama_report_session" ON public.panama_report_session;
CREATE POLICY "service_role_full_access_panama_report_session"
  ON public.panama_report_session FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "anon_read_only_panama_report_session" ON public.panama_report_session;
CREATE POLICY "anon_read_only_panama_report_session"
  ON public.panama_report_session FOR SELECT
  TO anon
  USING (true);


-- ── Table: panama_therapeutic_stats ──
CREATE TABLE IF NOT EXISTS public.panama_therapeutic_stats (
  id                           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id                   text NOT NULL,
  atc4_code                    text,
  therapeutic_area             text NOT NULL,
  health_expenditure_pct_gdp   numeric,
  health_expenditure_usd_per_capita numeric,
  prevalence_rate_pct          numeric,
  prevalence_source            text,
  prevalence_year              integer,
  therapeutic_market_usd       numeric,
  therapeutic_market_source    text,
  therapeutic_market_year      integer,
  data_source                  text NOT NULL,
  crawled_at                   timestamptz DEFAULT NOW(),
  raw_response                 jsonb
);

-- RLS for panama_therapeutic_stats
ALTER TABLE public.panama_therapeutic_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_full_access_panama_therapeutic_stats" ON public.panama_therapeutic_stats;
CREATE POLICY "service_role_full_access_panama_therapeutic_stats"
  ON public.panama_therapeutic_stats FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "anon_read_only_panama_therapeutic_stats" ON public.panama_therapeutic_stats;
CREATE POLICY "anon_read_only_panama_therapeutic_stats"
  ON public.panama_therapeutic_stats FOR SELECT
  TO anon
  USING (true);


-- ── Table: reports → renamed to panama_reports ──
CREATE TABLE IF NOT EXISTS public.panama_reports (
  id                           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id                   uuid,
  type                         text NOT NULL,
  pdf_storage_path             text,
  report_data                  jsonb,
  metadata                     jsonb,
  created_at                   timestamptz DEFAULT NOW()
);

-- panama_reports: RLS DISABLED (matches Personal DB behavior — reports/llm_outputs were created without RLS)
ALTER TABLE public.panama_reports DISABLE ROW LEVEL SECURITY;


-- ── Table: llm_outputs → renamed to panama_llm_outputs ──
CREATE TABLE IF NOT EXISTS public.panama_llm_outputs (
  id                           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id                   uuid,
  report_id                    uuid,
  product_id                   text NOT NULL,
  country                      text NOT NULL,
  domain                       text NOT NULL,
  llm_model                    text NOT NULL,
  llm_source                   text NOT NULL,
  market_macro_overview        text,
  market_regulatory_path       text,
  market_price_context         text,
  market_risk_factors          text,
  market_action_recommendation text,
  pricing_market_segment       text,
  pricing_input_summary        text,
  pricing_fob_calculation      text,
  pricing_scenarios            text,
  pricing_incoterms            text,
  pricing_risk_recommendation  text,
  partner_top10                jsonb,
  partner_count                integer,
  raw_payload                  jsonb NOT NULL,
  input_context                jsonb,
  generated_at                 timestamptz NOT NULL,
  src_public_procurement_count integer,
  src_private_retail_count     integer,
  src_pub_avg_pab              numeric,
  src_priv_avg_pab             numeric,
  src_eml_who                  boolean,
  src_eml_paho                 boolean,
  src_eml_minsa                boolean,
  src_case_grade               text,
  src_reference_price_pab      numeric,
  src_fob_agg_usd              numeric,
  src_fob_avg_usd              numeric,
  src_fob_cons_usd             numeric,
  src_candidates_total         integer,
  src_psi_top1_score           numeric,
  src_psi_top1_name            text
);

-- panama_llm_outputs: RLS DISABLED (matches Personal DB behavior — reports/llm_outputs were created without RLS)
ALTER TABLE public.panama_llm_outputs DISABLE ROW LEVEL SECURITY;


-- ============================================================
-- Verification: count tables created
-- ============================================================
SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'panama%' ORDER BY table_name;