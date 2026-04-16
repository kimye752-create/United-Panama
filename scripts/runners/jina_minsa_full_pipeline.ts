import * as path from "node:path";

import { OUTPUT_DIR, writeJsonFile } from "./jina_minsa_shared";
import { runPhase1 } from "./jina_minsa_phase1";
import { runPhase2 } from "./jina_minsa_phase2";
import { runPhase3 } from "./jina_minsa_phase3";
import { runPhase4 } from "./jina_minsa_phase4";
import { runPhase5 } from "./jina_minsa_phase5";

interface PipelineSummary {
  generated_at: string;
  phase1: { success_count: number; fail_count: number };
  phase2: { found_count: number; unique_count: number };
  phase3: { skipped: boolean; success_count: number; fail_count: number };
  phase4: { extracted_products: number; overlap_count: number };
  phase5: { ingredient_upsert_count: number; product_upsert_count: number };
}

async function main(): Promise<void> {
  const phase1 = await runPhase1();
  const phase1Success = phase1.results.filter((item) => item.success).length;
  const phase1Fail = phase1.results.length - phase1Success;
  if (phase1Success === 0) {
    console.log("⚠ Phase 1 모두 실패. Phase 2~5를 건너뜁니다.");
    return;
  }

  const phase2 = await runPhase2();
  const phase3 = await runPhase3();
  const phase4 = await runPhase4();
  const phase5 = await runPhase5();

  const phase3Success = phase3.results.filter((item) => item.success).length;
  const phase3Fail = phase3.results.length - phase3Success;

  const summary: PipelineSummary = {
    generated_at: new Date().toISOString(),
    phase1: { success_count: phase1Success, fail_count: phase1Fail },
    phase2: {
      found_count: phase2.found_count,
      unique_count: phase2.unique_urls.length,
    },
    phase3: {
      skipped: phase3.skipped,
      success_count: phase3Success,
      fail_count: phase3Fail,
    },
    phase4: {
      extracted_products: phase4.extracted.length,
      overlap_count: phase4.overlap_with_panamacompra_v3.length,
    },
    phase5: {
      ingredient_upsert_count: phase5.ingredient_upsert_count,
      product_upsert_count: phase5.product_upsert_count,
    },
  };
  await writeJsonFile(path.join(OUTPUT_DIR, "_full_pipeline_summary.json"), summary);
  console.log("\n=== Full Pipeline 완료 ===");
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[FullPipeline][fatal] ${message}`);
  process.exitCode = 1;
});
