/**
 * PanamaCompra OCDS 단독 적재 — `crawlPanamaCompra` 호출
 * 사용: npx tsx scripts/runners/preload_panamacompra.ts [--dry-run]
 */
/// <reference types="node" />

import { crawlPanamaCompra } from "../../src/crawlers/preload/pa_panamacompra.js";

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const result = await crawlPanamaCompra(dryRun);
  process.stdout.write(
    `${JSON.stringify({
      dryRun,
      inserted: result.inserted,
      failed: result.failed,
      rowCount: result.rows.length,
    })}\n`,
  );
  process.exit(0);
}

main().catch((e: unknown) => {
  process.stderr.write(`${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
