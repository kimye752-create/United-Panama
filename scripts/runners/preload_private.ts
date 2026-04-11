/**
 * Phase A 민간 preload — Arrocha → MetroPlus (Skeleton, --dry-run 전용)
 * 표준출력: JSON 1회(process.stdout.write)
 */
/// <reference types="node" />

import { ArrochaCrawler } from "../../src/crawlers/preload/pa_arrocha.js";
import { MetroPlusCrawler } from "../../src/crawlers/preload/pa_metroplus.js";
import type { CrawlRunResult } from "../../src/crawlers/base/BaseCrawler.js";

type StageReport = { inserted: number; failed: boolean; message?: string };

function summarize(result: CrawlRunResult): StageReport {
  if (result.ok) {
    return { inserted: result.inserted, failed: false };
  }
  return {
    inserted: result.inserted,
    failed: true,
    message: result.message,
  };
}

async function main(): Promise<void> {
  if (!process.argv.includes("--dry-run")) {
    process.stderr.write(
      "[preload_private] 경고: 민간 크롤러는 Skeleton입니다. --dry-run 없이 실제 수집은 실행하지 않습니다.\n",
    );
    process.exit(0);
  }

  const arrocha = new ArrochaCrawler();
  const metro = new MetroPlusCrawler();

  const ra = await arrocha.run();
  const rm = await metro.run();

  process.stdout.write(
    `${JSON.stringify({
      arrocha: summarize(ra),
      metroplus: summarize(rm),
      total: ra.inserted + rm.inserted,
      note: "Skeleton mode - Residential Proxy required for production",
    })}\n`,
  );
  process.exit(0);
}

main().catch((error: unknown) => {
  const msg = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${msg}\n`);
  process.exit(1);
});
