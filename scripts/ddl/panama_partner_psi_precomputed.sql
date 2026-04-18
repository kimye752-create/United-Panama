CREATE TABLE IF NOT EXISTS panama_partner_psi_precomputed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES panama_partner_candidates(id) ON DELETE CASCADE,
  product_id UUID NOT NULL,

  revenue_tier_score INTEGER NOT NULL CHECK (revenue_tier_score BETWEEN 0 AND 100),
  pipeline_tier_score INTEGER NOT NULL CHECK (pipeline_tier_score BETWEEN 0 AND 100),
  manufacturing_score INTEGER NOT NULL CHECK (manufacturing_score IN (0, 100)),
  import_experience_score INTEGER NOT NULL CHECK (import_experience_score IN (0, 50, 100)),
  pharmacy_chain_score INTEGER NOT NULL CHECK (pharmacy_chain_score IN (0, 50, 100)),

  revenue_tier_label TEXT NOT NULL,
  pipeline_tier_label TEXT NOT NULL,
  manufacturing_label TEXT NOT NULL,
  import_experience_label TEXT NOT NULL,
  pharmacy_chain_label TEXT NOT NULL,

  psi_total_default NUMERIC(6,2) NOT NULL,

  revenue_data_source TEXT NOT NULL,
  pipeline_matched_atc TEXT,
  pipeline_matched_products TEXT[],
  import_evidence_source TEXT,
  import_evidence_count INTEGER DEFAULT 0,

  conflict_level TEXT CHECK (conflict_level IN (
    'direct_competition',
    'upgrade_opportunity',
    'adjacent_category',
    'none'
  )),
  conflict_insight TEXT,

  is_manually_reviewed BOOLEAN DEFAULT false,
  manual_review_notes TEXT,

  computed_at TIMESTAMPTZ DEFAULT now(),
  psi_version TEXT DEFAULT 'v1',

  UNIQUE(partner_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_psi_product_total
  ON panama_partner_psi_precomputed(product_id, psi_total_default DESC);

CREATE INDEX IF NOT EXISTS idx_psi_partner
  ON panama_partner_psi_precomputed(partner_id);

CREATE INDEX IF NOT EXISTS idx_psi_manual_reviewed
  ON panama_partner_psi_precomputed(is_manually_reviewed)
  WHERE is_manually_reviewed = true;

CREATE INDEX IF NOT EXISTS idx_psi_conflict_level
  ON panama_partner_psi_precomputed(conflict_level)
  WHERE conflict_level IN ('upgrade_opportunity', 'direct_competition');

ALTER TABLE panama_partner_psi_precomputed DISABLE ROW LEVEL SECURITY;
