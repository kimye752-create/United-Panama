-- 3공정 파트너 후보 통합 테이블
create table if not exists panama_partner_candidates (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  company_name_normalized text not null,
  phone text,
  email text,
  address text,
  website text,
  source_primary text,
  collected_primary_at timestamptz,
  revenue_usd numeric,
  employee_count integer,
  founded_year integer,
  therapeutic_areas text[],
  gmp_certified boolean,
  import_history boolean,
  import_history_detail text,
  public_procurement_wins integer,
  pharmacy_chain_operator boolean,
  mah_capable boolean,
  korea_partnership boolean,
  korea_partnership_detail text,
  source_secondary text[],
  collected_secondary_at timestamptz,
  score_revenue numeric,
  score_pipeline numeric,
  score_gmp numeric,
  score_import numeric,
  score_pharmacy_chain numeric,
  score_total_default numeric,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (company_name_normalized)
);

create index if not exists idx_partner_score_default
  on panama_partner_candidates (score_total_default desc);

