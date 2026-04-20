import { NextResponse } from "next/server";

import { createSupabaseServer } from "@/lib/supabase-server";
import type { ConflictLevel, PartnerWithPSI, RevenueDataSource } from "@/src/logic/phase3/types";

export const maxDuration = 15;

interface Phase3AnalyzeRequest {
  product_id: string;
}

interface PartnerCandidateRow {
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
  psi_total_default: number | string;
  revenue_data_source: string;
  pipeline_matched_atc: string | null;
  pipeline_matched_products: string[] | null;
  import_evidence_source: string | null;
  import_evidence_count: number | null;
  conflict_level: string | null;
  conflict_insight: string | null;
  is_manually_reviewed: boolean | null;
  manual_review_notes: string | null;
  computed_at: string;
  psi_version: string;
  panama_partner_candidates:
    | {
        company_name: string;
        company_type: string | null;
        phone: string | null;
        email: string | null;
        website: string | null;
        city: string | null;
        address: string | null;
        business_description: string | null;
      }
    | {
        company_name: string;
        company_type: string | null;
        phone: string | null;
        email: string | null;
        website: string | null;
        city: string | null;
        address: string | null;
        business_description: string | null;
      }[]
    | null;
}

function parseConflictLevel(raw: string | null): ConflictLevel {
  if (
    raw === "direct_competition" ||
    raw === "upgrade_opportunity" ||
    raw === "adjacent_category" ||
    raw === "none"
  ) {
    return raw;
  }
  return "none";
}

function parseRevenueSource(raw: string): RevenueDataSource {
  if (
    raw === "dnb_official" ||
    raw === "homepage" ||
    raw === "estimated_by_employees" ||
    raw === "estimated_by_age" ||
    raw === "estimated_by_homepage_signals" ||
    raw === "missing"
  ) {
    return raw;
  }
  return "missing";
}

export async function POST(req: Request): Promise<Response> {
  try {
    const body = (await req.json()) as Phase3AnalyzeRequest;

    if (typeof body.product_id !== "string" || body.product_id.trim() === "") {
      return NextResponse.json({ error: "product_id 필수" }, { status: 400 });
    }

    const supabase = createSupabaseServer();

    const { data, error } = await supabase
      .from("panama_partner_psi_precomputed")
      .select(
        `
          *,
          panama_partner_candidates (
            company_name,
            company_type,
            phone,
            email,
            website,
            city,
            address,
            business_description
          )
        `,
      )
      .eq("product_id", body.product_id)
      .order("psi_total_default", { ascending: false })
      .limit(20);

    if (error !== null) {
      return NextResponse.json({ error: `DB 조회 실패: ${error.message}` }, { status: 500 });
    }

    const rows = (data ?? []) as PartnerCandidateRow[];

    const partners: PartnerWithPSI[] = [];
    for (const row of rows) {
      let candidate = row.panama_partner_candidates;
      if (Array.isArray(candidate)) {
        candidate = candidate[0] ?? null;
      }
      if (candidate === null || typeof candidate !== "object") {
        continue;
      }

      partners.push({
        id: row.id,
        partner_id: row.partner_id,
        product_id: row.product_id,
        revenue_tier_score: row.revenue_tier_score,
        pipeline_tier_score: row.pipeline_tier_score,
        manufacturing_score: row.manufacturing_score,
        import_experience_score: row.import_experience_score,
        pharmacy_chain_score: row.pharmacy_chain_score,
        revenue_tier_label: row.revenue_tier_label,
        pipeline_tier_label: row.pipeline_tier_label,
        manufacturing_label: row.manufacturing_label,
        import_experience_label: row.import_experience_label,
        pharmacy_chain_label: row.pharmacy_chain_label,
        psi_total_default: Number(row.psi_total_default),
        revenue_data_source: parseRevenueSource(row.revenue_data_source),
        pipeline_matched_atc: row.pipeline_matched_atc,
        pipeline_matched_products: row.pipeline_matched_products,
        import_evidence_source: row.import_evidence_source,
        import_evidence_count: row.import_evidence_count ?? 0,
        conflict_level: parseConflictLevel(row.conflict_level),
        conflict_insight: row.conflict_insight,
        is_manually_reviewed: row.is_manually_reviewed ?? false,
        manual_review_notes: row.manual_review_notes,
        computed_at: row.computed_at,
        psi_version: row.psi_version,
        company_name: candidate.company_name,
        company_type: candidate.company_type,
        phone: candidate.phone,
        email: candidate.email,
        website: candidate.website,
        city: candidate.city,
        address: candidate.address,
        business_description: candidate.business_description,
      });
    }

    return NextResponse.json({
      partners,
      total_count: partners.length,
      product_id: body.product_id,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: `3단계 파트너 조사 분석 실패: ${message}` }, { status: 500 });
  }
}
