import { createSupabaseServer } from "@/lib/supabase-server";
import { lookupByNormalizedName } from "@/src/data/pharmchoices_static";
import type { PartnerCandidate } from "@/src/types/phase3_partner";

import { filterOutGlobalMnc } from "./global_mnc_filter";

const FALLBACK_PARTNERS: PartnerCandidate[] = [
  {
    id: "fallback-1",
    company_name: "ALFARMA S.A.",
    company_name_normalized: "alfarma sa",
    phone: null,
    email: null,
    address: "Panama City",
    website: null,
    source_primary: "pharmchoices",
    collected_primary_at: new Date().toISOString(),
    revenue_usd: 84_000_000,
    employee_count: 180,
    founded_year: 2001,
    therapeutic_areas: ["Cardiology", "Hospital Supply"],
    gmp_certified: true,
    import_history: true,
    import_history_detail: "pharmaceutical import track record",
    public_procurement_wins: 21,
    pharmacy_chain_operator: false,
    mah_capable: true,
    korea_partnership: false,
    korea_partnership_detail: null,
    source_secondary: ["https://pharmchoices.com/full-list-of-pharmaceutical-companies-in-panama/"],
    collected_secondary_at: null,
    registered_products: null,
    cphi_category: null,
    product_relevance_reason: null,
    score_revenue: null,
    score_pipeline: null,
    score_gmp: null,
    score_import: null,
    score_pharmacy_chain: null,
    score_total_default: null,
    fax: null,
    booth: null,
    business_regions: null,
  },
  {
    id: "fallback-2",
    company_name: "SEVEN PHARMA PANAMA",
    company_name_normalized: "seven pharma panama",
    phone: null,
    email: null,
    address: "Panama City",
    website: null,
    source_primary: "dnb_panama",
    collected_primary_at: new Date().toISOString(),
    revenue_usd: 47_000_000,
    employee_count: 120,
    founded_year: 2008,
    therapeutic_areas: ["Respiratory", "Retail Distribution"],
    gmp_certified: false,
    import_history: true,
    import_history_detail: "medical product imports",
    public_procurement_wins: 9,
    pharmacy_chain_operator: true,
    mah_capable: false,
    korea_partnership: false,
    korea_partnership_detail: null,
    source_secondary: ["https://www.dnb.com/business-directory/company-information.pharmaceuticals.pa.html"],
    collected_secondary_at: null,
    registered_products: null,
    cphi_category: null,
    product_relevance_reason: null,
    score_revenue: null,
    score_pipeline: null,
    score_gmp: null,
    score_import: null,
    score_pharmacy_chain: null,
    score_total_default: null,
    fax: null,
    booth: null,
    business_regions: null,
  },
];

function parseTextArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const out: string[] = [];
  for (const item of value) {
    if (typeof item === "string" && item.trim() !== "") {
      out.push(item.trim());
    }
  }
  return out.length > 0 ? out : null;
}

function toNumberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return null;
}

function toBooleanOrNull(value: unknown): boolean | null {
  if (value === true || value === false) {
    return value;
  }
  return null;
}

function toStringOrNull(value: unknown): string | null {
  if (typeof value === "string" && value.trim() !== "") {
    return value.trim();
  }
  return null;
}

function normalizeCandidate(row: Record<string, unknown>): PartnerCandidate | null {
  const id = toStringOrNull(row["id"]);
  const companyName = toStringOrNull(row["company_name"]);
  if (id === null || companyName === null) {
    return null;
  }
  return {
    id,
    company_name: companyName,
    company_name_normalized: toStringOrNull(row["company_name_normalized"]) ?? companyName.toLowerCase(),
    phone: toStringOrNull(row["phone"]),
    email: toStringOrNull(row["email"]),
    address: toStringOrNull(row["address"]),
    website: toStringOrNull(row["website"]),
    source_primary: toStringOrNull(row["source_primary"]),
    collected_primary_at: toStringOrNull(row["collected_primary_at"]),
    revenue_usd: toNumberOrNull(row["revenue_usd"]),
    employee_count: toNumberOrNull(row["employee_count"]),
    founded_year: toNumberOrNull(row["founded_year"]),
    therapeutic_areas: parseTextArray(row["therapeutic_areas"]),
    gmp_certified: toBooleanOrNull(row["gmp_certified"]),
    import_history: toBooleanOrNull(row["import_history"]),
    import_history_detail: toStringOrNull(row["import_history_detail"]),
    public_procurement_wins: toNumberOrNull(row["public_procurement_wins"]),
    pharmacy_chain_operator: toBooleanOrNull(row["pharmacy_chain_operator"]),
    mah_capable: toBooleanOrNull(row["mah_capable"]),
    korea_partnership: toBooleanOrNull(row["korea_partnership"]),
    korea_partnership_detail: toStringOrNull(row["korea_partnership_detail"]),
    source_secondary: parseTextArray(row["source_secondary"]),
    collected_secondary_at: toStringOrNull(row["collected_secondary_at"]),
    registered_products: parseTextArray(row["registered_products"]),
    cphi_category: toStringOrNull(row["cphi_category"]),
    product_relevance_reason: toStringOrNull(row["product_relevance_reason"]),
    score_revenue: toNumberOrNull(row["score_revenue"]),
    score_pipeline: toNumberOrNull(row["score_pipeline"]),
    score_gmp: toNumberOrNull(row["score_gmp"]),
    score_import: toNumberOrNull(row["score_import"]),
    score_pharmacy_chain: toNumberOrNull(row["score_pharmacy_chain"]),
    score_total_default: toNumberOrNull(row["score_total_default"]),
    fax: toStringOrNull(row["fax"]),
    booth: toStringOrNull(row["booth"]),
    business_regions: parseTextArray(row["business_regions"]),
  };
}

/**
 * PharmChoices 정적 데이터를 후보에 병합한다.
 * DB에 null로 저장된 연락처·역량 필드를 정적 데이터로 채운다.
 */
function mergePharmChoicesStatic(candidate: PartnerCandidate): PartnerCandidate {
  const entry = lookupByNormalizedName(candidate.company_name_normalized);
  if (entry === null) return candidate;
  return {
    ...candidate,
    phone:                   candidate.phone                   ?? entry.phone,
    email:                   candidate.email                   ?? entry.email,
    website:                 candidate.website                 ?? entry.website,
    address:                 candidate.address                 ?? entry.address,
    import_history:          candidate.import_history          ?? entry.import_history,
    gmp_certified:           candidate.gmp_certified           ?? entry.gmp_certified,
    mah_capable:             candidate.mah_capable             ?? entry.mah_capable,
    pharmacy_chain_operator: candidate.pharmacy_chain_operator ?? entry.pharmacy_chain_operator,
    import_history_detail:   candidate.import_history_detail   ?? entry.import_history_detail,
    public_procurement_wins: candidate.public_procurement_wins ?? entry.public_procurement_wins,
    therapeutic_areas:       candidate.therapeutic_areas       ?? entry.therapeutic_areas,
  };
}

export async function fetchPartnerCandidatesFromDB(): Promise<PartnerCandidate[]> {
  try {
    const sb = createSupabaseServer();
    const { data, error } = await sb
      .from("panama_partner_candidates")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(300);
    if (error !== null || data === null) {
      return filterOutGlobalMnc(FALLBACK_PARTNERS.map(mergePharmChoicesStatic));
    }
    const out: PartnerCandidate[] = [];
    for (const row of data as Record<string, unknown>[]) {
      const normalized = normalizeCandidate(row);
      if (normalized !== null) {
        out.push(normalized);
      }
    }
    if (out.length === 0) {
      return filterOutGlobalMnc(FALLBACK_PARTNERS.map(mergePharmChoicesStatic));
    }
    // PharmChoices 정적 데이터 병합 후 글로벌 MNC 제외
    return filterOutGlobalMnc(out.map(mergePharmChoicesStatic));
  } catch {
    return filterOutGlobalMnc(FALLBACK_PARTNERS.map(mergePharmChoicesStatic));
  }
}

