/**
 * Metro Plus — 민간 소매(Cloudflare Turnstile 회피용 Playwright + Residential Proxy 필요)
 * Phase A Skeleton: 세션 8+ 연동 예정.
 */
/// <reference types="node" />

import { BaseCrawler, type CrawlRowData } from "../base/BaseCrawler.js";

const PA_SOURCE = "metroplus" as const;

function isDryRun(): boolean {
  return process.argv.includes("--dry-run");
}

export class MetroPlusCrawler extends BaseCrawler {
  constructor() {
    super("MetroPlus", "static_pre_loaded", "private", 0.65);
  }

  protected async crawl(): Promise<CrawlRowData[]> {
    if (isDryRun()) {
      return [
        {
          product_id: "f88b87b8-c0ab-4f6e-ba34-e9330d1d4e18",
          pa_source: PA_SOURCE,
          pa_source_url: "https://metroplus.example/skeleton/dry-run-1",
          pa_product_name_local: "Omega-3 1000mg",
          pa_price_local: 35,
          pa_currency_unit: "USD",
          pa_package_unit: "frasco x 60 caps",
          pa_price_type: "retail_normal",
          pa_stock_status: "unknown",
          confidence: 0.65,
        },
      ];
    }

    throw new Error(
      "MetroPlus: Cloudflare Turnstile + Residential Proxy required - planned session 8+",
    );
  }
}
