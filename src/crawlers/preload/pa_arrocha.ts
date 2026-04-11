/**
 * Arrocha — 민간 소매(Cloudflare WAF 회피용 Playwright Stealth + Residential Proxy 필요)
 * Phase A Skeleton: 세션 8+ 프록시 자격 증명·Stealth 연동 예정.
 */
/// <reference types="node" />

import { BaseCrawler, type CrawlRowData } from "../base/BaseCrawler.js";

const PA_SOURCE = "arrocha" as const;

function isDryRun(): boolean {
  return process.argv.includes("--dry-run");
}

export class ArrochaCrawler extends BaseCrawler {
  constructor() {
    super("Arrocha", "static_pre_loaded", "private", 0.65);
  }

  protected async crawl(): Promise<CrawlRowData[]> {
    if (isDryRun()) {
      return [
        {
          product_id: "bdfc9883-6040-438a-8e7a-df01f1230682",
          pa_source: PA_SOURCE,
          pa_source_url: "https://arrocha.example/skeleton/dry-run-1",
          pa_product_name_local: "Hidroxiurea 500mg",
          pa_price_local: 28.5,
          pa_currency_unit: "USD",
          pa_package_unit: "caja x 30 caps",
          pa_price_type: "retail_normal",
          pa_stock_status: "unknown",
          confidence: 0.65,
        },
        {
          product_id: "fcae4399-aa80-4318-ad55-89d6401c10a9",
          pa_source: PA_SOURCE,
          pa_source_url: "https://arrocha.example/skeleton/dry-run-2",
          pa_product_name_local: "Cilostazol 100mg",
          pa_price_local: 42,
          pa_currency_unit: "USD",
          pa_package_unit: "caja x 20 tabs",
          pa_price_type: "retail_normal",
          pa_stock_status: "unknown",
          confidence: 0.65,
        },
      ];
    }

    throw new Error(
      "Arrocha: Cloudflare WAF + Residential Proxy required - planned session 8+ with proxy credentials",
    );
  }
}
