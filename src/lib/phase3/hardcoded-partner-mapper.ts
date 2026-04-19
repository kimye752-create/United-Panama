import type { Partner as HardcodedPartner, ProductId } from "@/src/lib/phase3/partners-data";
import type { ConflictLevel, PartnerWithPSI, RevenueDataSource } from "@/src/logic/phase3/types";

function toConflictLevel(level: string | undefined): ConflictLevel {
  if (
    level === "direct_competition" ||
    level === "upgrade_opportunity" ||
    level === "adjacent_category" ||
    level === "none"
  ) {
    return level;
  }
  return "none";
}

/**
 * 하드코딩 20사 레코드 → PartnerWithPSI
 * - basePSI·rank·5대 점수는 재계산 없이 원본 전달 (psi_total_default = basePSI)
 * - 선택 제품 매칭 행만 conflict/insight에 반영
 */
export function mapHardcodedPartnerToWithPSI(
  p: HardcodedPartner,
  productIdUuid: string,
  selectedSlug: ProductId | null,
): PartnerWithPSI {
  const match =
    selectedSlug !== null ? p.productMatches.find((m) => m.productId === selectedSlug) : undefined;

  const now = new Date().toISOString();

  return {
    id: `hc-${p.id}-${productIdUuid}`,
    partner_id: p.id,
    product_id: productIdUuid,
    revenue_tier_score: p.revenueScore,
    pipeline_tier_score: p.pipelineAvgScore,
    manufacturing_score: p.manufacturingScore,
    import_experience_score: p.importExperienceScore,
    pharmacy_chain_score: p.pharmacyChainScore,
    revenue_tier_label: `Tier ${String(p.revenueTier)}`,
    pipeline_tier_label: `평균 ${String(p.pipelineAvgScore)}`,
    manufacturing_label: `${String(p.manufacturingScore)}점`,
    import_experience_label: `${String(p.importExperienceScore)}점`,
    pharmacy_chain_label: `${String(p.pharmacyChainScore)}점`,
    psi_total_default: p.basePSI,
    revenue_data_source: "dnb_official" as RevenueDataSource,
    pipeline_matched_atc: null,
    pipeline_matched_products: p.productMatches.map((m) => m.productName),
    import_evidence_source: null,
    import_evidence_count: 0,
    conflict_level: toConflictLevel(match?.conflictLevel),
    conflict_insight: match !== undefined ? match.shortInsight : null,
    is_manually_reviewed: true,
    manual_review_notes: null,
    computed_at: now,
    psi_version: "hc-v2",
    company_name: p.partnerName,
    company_type: p.groupName,
    phone: p.phone,
    email: p.email,
    website: p.website,
    city: null,
    address: p.address,
    business_description: p.keyPortfolio,
    hc_display: {
      hc_catalog_rank: p.rank,
      hc_country_code: p.countryCode,
      hc_country_name: p.countryName,
      hc_minsa_license: p.minsaLicense,
      hc_one_line_intro: p.oneLineIntro,
      hc_company_description: p.companyDescription,
      hc_five_factors: {
        revenue: p.fiveFactorsDescription.revenue,
        manufacturing: p.fiveFactorsDescription.manufacturing,
        pharmacyChain: p.fiveFactorsDescription.pharmacyChain,
        pipeline: p.fiveFactorsDescription.pipeline,
        importExperience: p.fiveFactorsDescription.importExperience,
      },
    },
  };
}
