/**
 * Arrocha Shopify Search API v2 — panama 적재
 * MAX_LLM_CALLS_PER_RUN=0 과 동일(순수 HTTP, LLM 없음)
 */
/// <reference types="node" />

import { runArrochaShopifyV2 } from "../../src/crawlers/preload/pa_arrocha_v2.js";

process.env.MAX_LLM_CALLS_PER_RUN = "0";

async function main(): Promise<void> {
  const result = await runArrochaShopifyV2();
  process.stdout.write(`${JSON.stringify(result, null, 0)}\n`);
  if (!result.ok) {
    process.exitCode = 1;
  }
}

main().catch((e: unknown) => {
  process.stderr.write(`${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
