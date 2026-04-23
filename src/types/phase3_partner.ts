export type EvaluationCriterion =
  | "revenue"
  | "pipeline"
  | "gmp"
  | "import"
  | "pharmacy_chain";

export interface PartnerCandidate {
  id: string;
  company_name: string;
  company_name_normalized: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  website: string | null;
  source_primary: string | null;
  collected_primary_at: string | null;
  revenue_usd: number | null;
  employee_count: number | null;
  founded_year: number | null;
  therapeutic_areas: string[] | null;
  gmp_certified: boolean | null;
  import_history: boolean | null;
  import_history_detail: string | null;
  public_procurement_wins: number | null;
  pharmacy_chain_operator: boolean | null;
  mah_capable: boolean | null;
  korea_partnership: boolean | null;
  korea_partnership_detail: string | null;
  source_secondary: string[] | null;
  collected_secondary_at: string | null;
  registered_products: string[] | null;
  cphi_category: string | null;
  product_relevance_reason: string | null;
  score_revenue: number | null;
  score_pipeline: number | null;
  score_gmp: number | null;
  score_import: number | null;
  score_pharmacy_chain: number | null;
  score_total_default: number | null;
  // SG 팀장 양식 정합을 위해 추가된 필드 (없으면 null)
  fax: string | null;                 // 팩스 번호
  booth: string | null;               // CPHI 등 전시회 부스 번호
  business_regions: string[] | null;  // 사업 지역 (국가 리스트)
}

export interface PartnerScores {
  revenue: number;
  pipeline: number;
  gmp: number;
  import: number;
  pharmacy_chain: number;
}

