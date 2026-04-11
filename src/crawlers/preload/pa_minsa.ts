/**
 * MINSA faddi 의약품 등록 — CSRF·세션 필요 시 Skeleton 전환
 * dry-run: mock 2건 / 실제: 세션 8 수동 쿠키 주입 예정
 */
/// <reference types="node" />

import { BaseCrawler, type CrawlRowData } from "../base/BaseCrawler.js";
import {
  getRandomUserAgent,
  randomDelay,
} from "../../crawler/stealth_setup.js";

const PA_SOURCE = "minsa" as const;
const HOME = "https://www.minsa.gob.pa/";
const MAX_ATTEMPTS = 3;

function isDryRun(): boolean {
  return process.argv.includes("--dry-run");
}

export class MinsaCrawler extends BaseCrawler {
  constructor() {
    super("Minsa", "static_pre_loaded", "public", 0.7);
  }

  protected async crawl(): Promise<CrawlRowData[]> {
    if (isDryRun()) {
      return [
        {
          product_id: "bdfc9883-6040-438a-8e7a-df01f1230682",
          pa_source: PA_SOURCE,
          pa_source_url: `${HOME}dry-run-1`,
          pa_product_name_local: "[DRY-RUN] MINSA mock A",
          pa_price_local: null,
          pa_currency_unit: "PAB",
          pa_price_type: "registry",
          confidence: 0.7,
        },
        {
          product_id: "2504d79b-c2ce-4660-9ea7-5576c8bb755f",
          pa_source: PA_SOURCE,
          pa_source_url: `${HOME}dry-run-2`,
          pa_product_name_local: "[DRY-RUN] MINSA mock B",
          pa_price_local: null,
          pa_currency_unit: "PAB",
          pa_price_type: "registry",
          confidence: 0.7,
        },
      ];
    }

    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      try {
        await randomDelay();
        const res = await fetch(HOME, {
          headers: {
            "User-Agent": getRandomUserAgent(),
            Accept: "text/html,*/*",
          },
        });
        await res.text();
      } catch {
        /* 연속 실패는 다음 루프에서 재시도 */
      }
    }

    throw new Error(
      "MINSA: CSRF session required, manual cookie injection planned in session 8",
    );
  }
}
