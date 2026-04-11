/**
 * Phase A 공공 사전 수집 — ACODECO → MINSA → CSS 순차 실행
 * 실패해도 다음 단계 진행. 표준출력은 JSON 1회(process.stdout.write).
 */
/// <reference types="node" />

import { AcodecoCrawler } from "../../src/crawlers/preload/pa_acodeco.js";
import { CssCrawler } from "../../src/crawlers/preload/pa_css.js";
import { MinsaCrawler } from "../../src/crawlers/preload/pa_minsa.js";
import type { CrawlRunResult } from "../../src/crawlers/base/BaseCrawler.js";

type Stage = "acodeco" | "minsa" | "css";

type StageReport = {
  inserted: number;
  failed: boolean;
  message?: string;
};

type PublicReport = Record<Stage, StageReport> & { total: number };

type RunnableCrawler = {
  readonly name: string;
  run(): Promise<CrawlRunResult>;
};

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
  const stages: ReadonlyArray<{ key: Stage; crawler: RunnableCrawler }> = [
    { key: "acodeco", crawler: new AcodecoCrawler() },
    { key: "minsa", crawler: new MinsaCrawler() },
    { key: "css", crawler: new CssCrawler() },
  ];

  const report: PublicReport = {
    acodeco: { inserted: 0, failed: false },
    minsa: { inserted: 0, failed: false },
    css: { inserted: 0, failed: false },
    total: 0,
  };

  for (const { key, crawler } of stages) {
    const r = await crawler.run();
    report[key] = summarize(r);
    report.total += r.inserted;
  }

  process.stdout.write(`${JSON.stringify(report)}\n`);
  process.exit(0);
}

main().catch((error: unknown) => {
  const msg = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${msg}\n`);
  process.exit(1);
});
