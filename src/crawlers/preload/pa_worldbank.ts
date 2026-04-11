/**
 * D1 작업 — Phase A 거시 수집
 * World Bank API — 파나마 GDP·인구·보건지출 3개 지표 수집 (골든 데이터)
 * API: https://api.worldbank.org/v2/country/PA/indicator/{indicator}?format=json&per_page=1&mrv=1
 */

import { ApiCrawler } from "../base/ApiCrawler.js";
import type { CrawlRowData } from "../base/BaseCrawler.js";
import { MACRO_PRODUCT_ID } from "../../utils/product-dictionary.js";

// ─────────────────────────────────────────────────
// 타입 정의
// ─────────────────────────────────────────────────

/** World Bank API 응답 첫 번째 원소 — 페이지네이션 메타 */
type WorldBankMeta = {
  page: number;
  pages: number;
  per_page: number;
  total: number;
};

/** World Bank 데이터 포인트 */
type WorldBankRecord = {
  indicator: { id: string; value: string };
  country: { id: string; value: string };
  date: string;       // 기준 연도 (예: "2022")
  value: number | null;
  unit: string;
};

/**
 * World Bank API 응답은 [메타, 데이터배열] 2원소 배열.
 * 예: [{ page:1, ... }, [{ indicator:{...}, value:76627000000, ... }]]
 */
type WorldBankApiResponse = [WorldBankMeta, WorldBankRecord[]];

// ─────────────────────────────────────────────────
// 상수
// ─────────────────────────────────────────────────

// MACRO_PRODUCT_ID는 src/utils/product-dictionary.ts에서 import

/**
 * 수집할 3개 지표 — 골든 데이터
 * GDP, 인구, 보건지출(% of GDP)
 */
const WB_INDICATORS = [
  {
    id: "NY.GDP.MKTP.CD",
    label: "GDP (current US$)",
    packageUnit: "current_usd",
  },
  {
    id: "SP.POP.TOTL",
    label: "Population, total",
    packageUnit: "persons",
  },
  {
    id: "SH.XPD.CHEX.GD.ZS",
    label: "Health expenditure (% of GDP)",
    packageUnit: "pct_gdp",
  },
] as const;

// ─────────────────────────────────────────────────
// 크롤러
// ─────────────────────────────────────────────────

export class WorldBankCrawler extends ApiCrawler<WorldBankApiResponse> {
  constructor() {
    super(
      "WorldBank",
      "static_pre_loaded",
      "macro",
      0.92,
      "https://api.worldbank.org",
      // 기본 endpoint — crawl() 내부에서 overrideEndpoint로 지표별 교체
      "/v2/country/PA/indicator/NY.GDP.MKTP.CD",
      { Accept: "application/json" },
    );
  }

  protected async crawl(): Promise<CrawlRowData[]> {
    const rows: CrawlRowData[] = [];
    const crawlTime = new Date().toISOString();

    for (const indicator of WB_INDICATORS) {
      try {
        const endpoint = `/v2/country/PA/indicator/${indicator.id}`;
        const data = await this.fetchJson(
          { format: "json", per_page: 1, mrv: 1 },
          endpoint,
        );

        // noUncheckedIndexedAccess 대응: undefined 가능성 처리
        const first = data[1][0];
        if (first === undefined || first.value === null) {
          console.warn(
            `[WorldBank] ${indicator.id}: 최신 데이터가 없습니다. 건너뜁니다.`,
          );
          continue;
        }

        rows.push({
          product_id: MACRO_PRODUCT_ID,
          pa_source: "worldbank",
          pa_source_url: `https://data.worldbank.org/indicator/${indicator.id}?locations=PA`,
          pa_collected_at: first.date,          // 데이터 실제 기준 연도
          pa_product_name_local: indicator.label,
          pa_price_local: first.value,
          pa_currency_unit: "USD",
          pa_package_unit: indicator.packageUnit, // 단위 설명
        });
      } catch (error: unknown) {
        // 개별 지표 실패 시 로그 후 다음 지표 계속 수집
        console.error(
          `[WorldBank] ${indicator.id} 수집 실패 (${crawlTime}):`,
          error instanceof Error ? error.message : String(error),
        );
      }
    }

    return rows;
  }
}
