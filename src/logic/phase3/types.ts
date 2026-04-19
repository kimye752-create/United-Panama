// 3공정 PSI 점수화 시스템 공용 타입

export type PSICriterionKey =
  | "revenue"
  | "pipeline"
  | "manufacture"
  | "import"
  | "pharmacy";

export type PSICheckedState = Record<PSICriterionKey, boolean>;

export const PSI_BASIC_WEIGHTS: Record<PSICriterionKey, number> = {
  revenue: 0.35,
  pipeline: 0.28,
  manufacture: 0.2,
  import: 0.12,
  pharmacy: 0.05,
};

export const PSI_CRITERION_PRIORITY: PSICriterionKey[] = [
  "revenue",
  "pipeline",
  "manufacture",
  "import",
  "pharmacy",
];

export type RevenueTier = 1 | 2 | 3 | 4 | 5;
export type PipelineTier = 1 | 2 | 3 | 4 | 5;
export type ImportExperienceLevel = "abundant" | "some" | "none";
export type PharmacyChainLevel = "large" | "small" | "none";
export type RevenueDataSource =
  | "dnb_official"
  | "homepage"
  | "estimated_by_employees"
  | "estimated_by_age"
  | "estimated_by_homepage_signals"
  | "missing";

export type ConflictLevel =
  | "direct_competition"
  | "upgrade_opportunity"
  | "adjacent_category"
  | "none";

export interface PartnerPSIRecord {
  id: string;
  partner_id: string;
  product_id: string;

  revenue_tier_score: number;
  pipeline_tier_score: number;
  manufacturing_score: number;
  import_experience_score: number;
  pharmacy_chain_score: number;

  revenue_tier_label: string;
  pipeline_tier_label: string;
  manufacturing_label: string;
  import_experience_label: string;
  pharmacy_chain_label: string;

  psi_total_default: number;

  revenue_data_source: RevenueDataSource;
  pipeline_matched_atc: string | null;
  pipeline_matched_products: string[] | null;
  import_evidence_source: string | null;
  import_evidence_count: number;

  conflict_level: ConflictLevel;
  conflict_insight: string | null;

  is_manually_reviewed: boolean;
  manual_review_notes: string | null;

  computed_at: string;
  psi_version: string;
}

/** 하드코딩 partners-data 연동 시 UI 전용 (optional) */
export interface PartnerWithPSIHardcodedDisplay {
  hc_catalog_rank: number;
  hc_country_code: string;
  hc_country_name: string;
  hc_minsa_license: string;
  hc_one_line_intro: string;
  hc_company_description: string;
  hc_five_factors: {
    revenue: string;
    manufacturing: string;
    pharmacyChain: string;
    pipeline: string;
    importExperience: string;
  };
}

export interface PartnerWithPSI extends PartnerPSIRecord {
  company_name: string;
  company_type: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  city: string | null;
  address: string | null;
  business_description: string | null;
  /** 세션 28 카탈로그 UI 필드 — 없으면 레거시 DB 행 */
  hc_display?: PartnerWithPSIHardcodedDisplay;
}

export interface DynamicPSIResult {
  partner_id: string;
  dynamic_psi: number;
  normalized_weights: Partial<Record<PSICriterionKey, number>>;
}
