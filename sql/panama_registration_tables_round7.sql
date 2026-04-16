-- 차원 1: 성분(INN) 단위 유통 가능성
CREATE TABLE IF NOT EXISTS panama_ingredient_eligibility (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inn TEXT NOT NULL,
  inn_es TEXT,
  atc_code TEXT,

  panama_distributable BOOLEAN NOT NULL,
  example_registration_no TEXT,
  registered_brand_count INT,
  market_status TEXT, -- 'mainstream' / 'niche' / 'minimal' / 'absent'

  evidence_source TEXT,
  evidence_url TEXT,
  evidence_notes JSONB,
  collected_at TIMESTAMPTZ DEFAULT NOW(),
  confidence DECIMAL(3,2),

  UNIQUE(inn)
);

-- 차원 2: 자사 제품(복합제 세트) 등록 여부
CREATE TABLE IF NOT EXISTS panama_product_registration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL,

  self_brand TEXT NOT NULL,
  self_inn_combined TEXT NOT NULL,
  self_concentration TEXT NOT NULL,
  self_form TEXT NOT NULL,
  is_combination BOOLEAN NOT NULL,
  is_special_form BOOLEAN,
  special_form_type TEXT,

  identical_set_registered BOOLEAN,
  identical_registration_no TEXT,
  identical_examples JSONB,

  similar_combination_exists BOOLEAN,
  similar_examples JSONB,

  individual_ingredients_registered BOOLEAN,
  individual_examples JSONB,

  registration_path TEXT,
  estimated_cost_usd DECIMAL,
  estimated_duration_days INT,
  market_entry_priority INT,
  market_entry_category TEXT,

  evidence_source TEXT,
  evidence_url TEXT,
  evidence_notes JSONB,
  collected_at TIMESTAMPTZ DEFAULT NOW(),
  collected_by TEXT,
  confidence DECIMAL(3,2),

  UNIQUE(product_id)
);

CREATE INDEX IF NOT EXISTS idx_ingredient_inn ON panama_ingredient_eligibility(inn);
CREATE INDEX IF NOT EXISTS idx_product_registration_product ON panama_product_registration(product_id);
CREATE INDEX IF NOT EXISTS idx_product_registration_status ON panama_product_registration(market_entry_category);
