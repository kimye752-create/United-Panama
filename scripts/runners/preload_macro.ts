/**
 * D1 작업 — Phase A 거시 수집 진입점
 * 5개 거시 크롤러를 순차 실행하고 결과를 집계·출력합니다.
 * GitHub Actions workflow_dispatch 또는 로컬 수동 실행용.
 *
 * 실행 방법: npx tsx scripts/runners/preload_macro.ts
 */
/// <reference types="node" />

import { WorldBankCrawler } from "../../src/crawlers/preload/pa_worldbank.js";
import { PubMedCrawler } from "../../src/crawlers/preload/pa_pubmed.js";
import { ItaCrawler } from "../../src/crawlers/preload/pa_ita.js";
import { KotraCrawler } from "../../src/crawlers/preload/pa_kotra.js";
import { MotieCrawler } from "../../src/crawlers/preload/pa_motie.js";
import type { CrawlRunResult } from "../../src/crawlers/base/BaseCrawler.js";

// ─────────────────────────────────────────────────
// 타입 정의
// ─────────────────────────────────────────────────

/** 각 크롤러의 실행 요약 */
type CrawlerSummary = {
  name: string;
  result: CrawlRunResult;
  elapsedMs: number;
};

// ─────────────────────────────────────────────────
// 유틸
// ─────────────────────────────────────────────────

/** 밀리초를 "1.23s" 형태로 변환 */
function formatMs(ms: number): string {
  return `${(ms / 1000).toFixed(2)}s`;
}

/** 결과 상태 한국어 표기 */
function statusLabel(result: CrawlRunResult): string {
  return result.ok ? "✅ 성공" : "❌ 실패";
}

// ─────────────────────────────────────────────────
// 메인
// ─────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("=".repeat(60));
  console.log("  파나마 1공정 Phase A — 거시 사전 수집 시작");
  console.log(`  실행 시각: ${new Date().toISOString()}`);
  console.log("=".repeat(60));

  // 5개 크롤러를 순서대로 정의 (ARCHITECTURE.md D1 순서 준수)
  const crawlers = [
    new WorldBankCrawler(),
    new PubMedCrawler(),
    new ItaCrawler(),
    new KotraCrawler(),
    new MotieCrawler(),
  ];

  const summaries: CrawlerSummary[] = [];

  // 크롤러 순차 실행 (병렬 금지 — Polite Scraping 원칙)
  for (const crawler of crawlers) {
    console.log(`\n▶ [${crawler.name}] 수집 시작...`);
    const startMs = Date.now();

    const result = await crawler.run();
    const elapsedMs = Date.now() - startMs;

    summaries.push({ name: crawler.name, result, elapsedMs });

    // 크롤러별 즉시 결과 출력
    if (result.ok) {
      console.log(
        `  ✅ [${crawler.name}] 완료 — ${result.inserted}건 적재 (${formatMs(elapsedMs)})`,
      );
    } else {
      console.error(
        `  ❌ [${crawler.name}] 실패 — ${result.inserted}건 적재 후 오류 (${formatMs(elapsedMs)})`,
      );
      console.error(`     원인: ${result.message}`);
    }
  }

  // ─────────────────────────────────────────────────
  // 최종 집계 요약 출력
  // ─────────────────────────────────────────────────
  const totalInserted = summaries.reduce(
    (acc, s) => acc + s.result.inserted,
    0,
  );
  const failedCrawlers = summaries.filter((s) => !s.result.ok);
  const successCount = summaries.length - failedCrawlers.length;

  console.log("\n" + "=".repeat(60));
  console.log("  Phase A 거시 수집 최종 결과");
  console.log("=".repeat(60));
  console.log(
    `  크롤러: ${successCount}/${summaries.length}개 성공  |  총 적재: ${totalInserted}건`,
  );
  console.log("-".repeat(60));

  // 크롤러별 결과 테이블
  for (const s of summaries) {
    const status = statusLabel(s.result);
    const inserted = String(s.result.inserted).padStart(3);
    const elapsed = formatMs(s.elapsedMs).padStart(7);
    console.log(`  ${status}  ${s.name.padEnd(12)}  ${inserted}건  ${elapsed}`);
  }

  // 실패 크롤러 상세 메시지
  if (failedCrawlers.length > 0) {
    console.log("\n  [실패 상세]");
    for (const s of failedCrawlers) {
      if (!s.result.ok) {
        console.log(`  - ${s.name}: ${s.result.message}`);
      }
    }
  }

  console.log("=".repeat(60));
  console.log(`  종료 시각: ${new Date().toISOString()}`);
  console.log("=".repeat(60));

  // GitHub Actions 판정용 종료 코드
  // 하나라도 실패하면 exit(1) → workflow 실패로 기록
  process.exit(failedCrawlers.length > 0 ? 1 : 0);
}

// main() 자체 에러는 최상위에서 catch하여 exit(1)
main().catch((error: unknown) => {
  console.error(
    "[preload_macro] 예기치 않은 오류로 프로세스가 중단되었습니다:",
    error instanceof Error ? error.message : String(error),
  );
  process.exit(1);
});
