/**
 * DNFD — 절차 메타 JSON 적재 + (선택) Playwright 등록 조회
 */
/// <reference types="node" />

import { runDnfdConsultaPreload } from "../../src/crawlers/preload/pa_dnfd_consulta.js";
import { loadDnfdProcedureMeta } from "../../src/seed_loaders/load_dnfd_procedure.js";

async function main(): Promise<void> {
  const dry = process.argv.includes("--dry-run");
  process.env.MAX_LLM_CALLS_PER_RUN = "0";

  const meta = await loadDnfdProcedureMeta(dry);
  process.stdout.write(`[dnfd_procedure_meta] ${meta.message}\n`);
  if (!meta.ok) {
    process.stderr.write("절차 메타 적재 실패로 중단합니다.\n");
    process.exit(1);
  }

  const crawl = await runDnfdConsultaPreload();
  process.stdout.write(`[dnfd_consulta] ${crawl.message} (inserted=${String(crawl.inserted)})\n`);
  if (!crawl.ok) {
    process.stderr.write(`${crawl.message}\n`);
    process.exitCode = 1;
  }
}

main().catch((e: unknown) => {
  process.stderr.write(`${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
