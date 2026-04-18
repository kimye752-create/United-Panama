/**
 * 64사 × 8제품 PSI + 경쟁/기회 플래그 사전 계산 스크립트 뼈대.
 * 수기 매칭 CSV 완료 후 파싱 로직을 연결해 실행.
 *
 * 사용: npx tsx scripts/runners/compute_partner_psi.ts [csv_path]
 */
import { createClient } from "@supabase/supabase-js";

import { detectConflict } from "../../src/logic/phase3/conflict_detector";
import { computeDefaultPSI } from "../../src/logic/phase3/default_psi_compute";
import type {
  ImportExperienceLevel,
  PharmacyChainLevel,
  PipelineTier,
} from "../../src/logic/phase3/types";
import {
  quantizeImportExperience,
  quantizeManufacturing,
  quantizePharmacyChain,
  quantizePipeline,
  quantizeRevenue,
} from "../../src/logic/phase3/tier_quantizer";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_KEY;

if (supabaseUrl === undefined || supabaseUrl === "" || supabaseKey === undefined || supabaseKey === "") {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY (또는 SUPABASE_*) 환경변수가 필요합니다.");
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface ManualMatchingRow {
  partner_id: string;
  company_name: string;
  revenue_usd: number | null;
  employee_count: number | null;
  year_established: number | null;
  has_manufacturing: boolean;
  import_level: ImportExperienceLevel;
  pharmacy_level: PharmacyChainLevel;
  import_evidence_count: number;
  pipeline_by_product: Record<
    string,
    {
      tier: PipelineTier;
      matched_atc: string | null;
      matched_products: string[];
    }
  >;
  manual_notes: string | null;
}

const PRODUCT_KEY_MAP: Record<string, string> = {
  "2504d79b-c2ce-4660-9ea7-5576c8bb755f": "rosumeg",
  "859e60f9-8544-43b3-a6a0-f6c7529847eb": "atmeg",
  "fcae4399-aa80-4318-ad55-89d6401c10a9": "ciloduo",
  "24738c3b-3a5b-40a9-9e8e-889ec075b453": "gastiin",
  "f88b87b8-c0ab-4f6e-ba34-e9330d1d4e18": "omethyl",
  "014fd4d2-dc66-4fc1-8d4f-59695183387f": "sereterol",
  "895f49ae-6ce3-44a3-93bd-bb77e027ba59": "gadvoa",
  "bdfc9883-6040-438a-8e7a-df01f1230682": "hydrine",
};

export async function computeForPartner(row: ManualMatchingRow): Promise<void> {
  const revenueResult = quantizeRevenue({
    revenue_usd: row.revenue_usd,
    employee_count: row.employee_count,
    year_established: row.year_established,
  });

  const manufacturingResult = quantizeManufacturing(row.has_manufacturing);
  const importResult = quantizeImportExperience(row.import_level);
  const pharmacyResult = quantizePharmacyChain(row.pharmacy_level);

  const rows: Record<string, unknown>[] = [];

  for (const [productId, pipelineData] of Object.entries(row.pipeline_by_product)) {
    const pipelineResult = quantizePipeline(pipelineData.tier);
    const productKey = PRODUCT_KEY_MAP[productId];

    if (productKey === undefined) {
      console.warn(`알 수 없는 product_id: ${productId}`);
      continue;
    }

    const conflictResult = detectConflict({
      product_key: productKey,
      pipeline_tier: pipelineData.tier,
      partner_matched_products: pipelineData.matched_products,
    });

    const psi = computeDefaultPSI({
      revenue_tier_score: revenueResult.score,
      pipeline_tier_score: pipelineResult.score,
      manufacturing_score: manufacturingResult.score,
      import_experience_score: importResult.score,
      pharmacy_chain_score: pharmacyResult.score,
    });

    rows.push({
      partner_id: row.partner_id,
      product_id: productId,
      revenue_tier_score: revenueResult.score,
      pipeline_tier_score: pipelineResult.score,
      manufacturing_score: manufacturingResult.score,
      import_experience_score: importResult.score,
      pharmacy_chain_score: pharmacyResult.score,
      revenue_tier_label: revenueResult.label,
      pipeline_tier_label: pipelineResult.label,
      manufacturing_label: manufacturingResult.label,
      import_experience_label: importResult.label,
      pharmacy_chain_label: pharmacyResult.label,
      psi_total_default: psi,
      revenue_data_source: revenueResult.source,
      pipeline_matched_atc: pipelineData.matched_atc,
      pipeline_matched_products: pipelineData.matched_products,
      import_evidence_source: row.import_evidence_count > 0 ? "panamacompra_v3" : null,
      import_evidence_count: row.import_evidence_count,
      conflict_level: conflictResult.level,
      conflict_insight: conflictResult.insight,
      is_manually_reviewed: true,
      manual_review_notes: row.manual_notes,
    });
  }

  const { error } = await supabase.from("panama_partner_psi_precomputed").upsert(rows, {
    onConflict: "partner_id,product_id",
  });

  if (error !== null) {
    throw new Error(`파트너 PSI 저장 실패: ${row.company_name} / ${error.message}`);
  }

  console.log(`✓ ${row.company_name} (${String(rows.length)}행)`);
}

async function main(): Promise<void> {
  const csvPath = process.argv[2];
  if (csvPath === undefined || csvPath === "") {
    console.log("사전 계산 스크립트 뼈대 완성. 사용법: npx tsx scripts/runners/compute_partner_psi.ts <csv_path>");
    console.log("수기 매칭 CSV 수령 후 파싱 로직을 연결하세요.");
    return;
  }

  void csvPath;
  // TODO: CSV 파싱 로직 (수기 매칭 CSV 완료 후 구현)
  // const rows = parseCSV(csvPath);
  // for (const row of rows) {
  //   await computeForPartner(row);
  // }

  console.log("CSV 파싱 미구현 — 경로만 확인:", csvPath);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
