import * as path from "node:path";
import * as fs from "node:fs/promises";

import {
  OUTPUT_DIR,
  PHASE1_TARGETS,
  ensureDir,
  fetchViaJina,
  resolveOutput,
  sanitizeToFileName,
  sleep,
  writeJsonFile,
} from "./jina_minsa_shared";

interface Phase1Item {
  url: string;
  success: boolean;
  size: number;
  file: string;
}

interface Phase1Summary {
  generated_at: string;
  output_dir: string;
  results: Phase1Item[];
}

export async function runPhase1(): Promise<Phase1Summary> {
  await ensureDir(OUTPUT_DIR);

  const results: Phase1Item[] = [];
  for (const target of PHASE1_TARGETS) {
    try {
      console.log(`[Phase1] Fetching: ${target}`);
      const text = await fetchViaJina(target);
      const fileName = `${sanitizeToFileName(target)}.txt`;
      const filePath = resolveOutput(fileName);
      await fs.writeFile(filePath, text, "utf-8");
      results.push({
        url: target,
        success: true,
        size: text.length,
        file: filePath,
      });
      console.log(`  ✓ Saved ${text.length} chars to ${fileName}`);
      await sleep(2000);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({
        url: target,
        success: false,
        size: 0,
        file: message,
      });
      console.error(`  ✗ ${message}`);
    }
  }

  const summary: Phase1Summary = {
    generated_at: new Date().toISOString(),
    output_dir: OUTPUT_DIR,
    results,
  };
  await writeJsonFile(path.join(OUTPUT_DIR, "_phase1_result.json"), summary);
  return summary;
}

async function main(): Promise<void> {
  const summary = await runPhase1();
  console.log("\n=== Phase 1 결과 요약 ===");
  console.log(JSON.stringify(summary.results, null, 2));
}

if (process.argv[1] !== undefined && process.argv[1].endsWith("jina_minsa_phase1.ts")) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[Phase1][fatal] ${message}`);
    process.exitCode = 1;
  });
}
