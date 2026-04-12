/**
 * 규제 마일스톤 2건 — panama(market_segment=regulatory_milestone)
 */
import {
  insertRow,
  validatePanamaPhase1Common,
  type PanamaPhase1InsertRow,
} from "../utils/db_connector.js";
import { MACRO_PRODUCT_ID } from "../utils/product-dictionary.js";

const MILESTONES: readonly PanamaPhase1InsertRow[] = [
  {
    product_id: MACRO_PRODUCT_ID,
    market_segment: "regulatory_milestone",
    fob_estimated_usd: null,
    confidence: 0.95,
    crawled_at: new Date().toISOString(),
    pa_source: "minsa_official",
    pa_source_url: "https://www.minsa.gob.pa/",
    pa_released_at: "2023-06-28",
    pa_milestone_type: "fast_track_designation",
    pa_notes:
      "한국 고위생국 지정 (MINSA, 2023.6.28). 의약품 위생등록 기간 기존 2~3년 → 6개월 이하로 단축. 한국 고품질 제약 즉시 진입 가능.",
  },
  {
    product_id: MACRO_PRODUCT_ID,
    market_segment: "regulatory_milestone",
    fob_estimated_usd: null,
    confidence: 0.85,
    crawled_at: new Date().toISOString(),
    pa_source: "kotra_2026",
    pa_source_url: "https://dream.kotra.or.kr/",
    pa_released_at: "2024",
    pa_milestone_type: "price_system_reform",
    pa_notes:
      "파나마 정부 '의약품 가격 시스템' 도입 (2024). 기존 Pfizer·Bayer 중심 독과점 타파, 신규 브랜드 진입 유도. 출처: KOTRA 2026 파나마 진출전략 p.33.",
  },
];

export interface LoadRegulatoryMilestonesOptions {
  readonly dryRun?: boolean;
}

export async function loadRegulatoryMilestones(
  options: LoadRegulatoryMilestonesOptions = {},
): Promise<{ inserted: number; failed: number; messages: string[] }> {
  const dryRun = options.dryRun === true;
  const messages: string[] = [];
  let inserted = 0;
  let failed = 0;

  for (const row of MILESTONES) {
    validatePanamaPhase1Common(row);
    if (dryRun) {
      inserted += 1;
      continue;
    }
    const result = await insertRow(row);
    if (result.ok) {
      inserted += 1;
    } else {
      failed += 1;
      messages.push(result.message);
    }
  }

  if (!dryRun) {
    messages.unshift(`규제 마일스톤: 성공 ${inserted}건, 실패 ${failed}건`);
  } else {
    messages.push(`[dry-run] 규제 마일스톤 ${MILESTONES.length}건 변환만`);
  }

  return { inserted, failed, messages };
}
