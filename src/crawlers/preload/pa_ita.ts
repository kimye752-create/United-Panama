/**
 * D1 작업 — Phase A 거시 수집
 * ITA (International Trade Administration) — 파나마 헬스케어 시장 가이드 파싱
 * URL: https://www.trade.gov/country-commercial-guides/panama-healthcare
 * 골든 데이터: 시장 개요 / 주요 구매자 / 시장 진입 기회 3개 섹션
 */

import { StaticCrawler } from "../base/StaticCrawler.js";
import type { CrawlRowData } from "../base/BaseCrawler.js";
import { MACRO_PRODUCT_ID } from "../../utils/product-dictionary.js";

// ─────────────────────────────────────────────────
// 상수
// ─────────────────────────────────────────────────

const ITA_URL =
  "https://www.trade.gov/country-commercial-guides/panama-healthcare";

// MACRO_PRODUCT_ID는 src/utils/product-dictionary.ts에서 import

/**
 * 추출할 3개 섹션 — 섹션 제목 키워드로 h2/h3 탐색
 * trade.gov는 섹션 제목에 키워드가 포함되는 구조
 */
const TARGET_SECTIONS = [
  { key: "overview",  keyword: "overview",   label: "Market Overview" },
  { key: "buyers",    keyword: "buyer",      label: "Key Buyers" },
  { key: "best_pros", keyword: "best prosp", label: "Best Prospects" },
] as const;

// ─────────────────────────────────────────────────
// 크롤러
// ─────────────────────────────────────────────────

export class ItaCrawler extends StaticCrawler {
  constructor() {
    super("ITA", "static_pre_loaded", "macro", 0.85);
  }

  protected async crawl(): Promise<CrawlRowData[]> {
    const rows: CrawlRowData[] = [];
    const crawlTime = new Date().toISOString();

    try {
      const $ = await this.fetchHtml(ITA_URL);

      for (const section of TARGET_SECTIONS) {
        // h2·h3 중 키워드가 포함된 섹션 제목 탐색 (대소문자 무관)
        const heading = $("h2, h3").filter((_i, el) =>
          $(el).text().toLowerCase().includes(section.keyword),
        ).first();

        if (heading.length === 0) {
          console.warn(`[ITA] "${section.label}" 섹션을 찾지 못했습니다.`);
          continue;
        }

        // 섹션 제목 다음 단락들에서 텍스트 추출 (최대 500자)
        const paragraphs: string[] = [];
        heading.nextUntil("h2, h3", "p").each((_i, el) => {
          const text = $(el).text().trim();
          if (text.length > 0) paragraphs.push(text);
        });

        const content = paragraphs.join(" ").slice(0, 500);
        if (content.length === 0) continue;

        rows.push({
          product_id: MACRO_PRODUCT_ID,
          pa_source: "ita",
          pa_source_url: ITA_URL,
          pa_collected_at: crawlTime,
          pa_product_name_local: section.label,  // 섹션 제목
          pa_package_unit: content,              // 섹션 본문 요약 (500자)
          pa_price_type: "regulated",
          pa_decree_listed: false,
        });
      }
    } catch (error: unknown) {
      // 수집 실패 시 빈 배열로 run()이 정상 동작하도록
      console.error(
        "[ITA] 페이지 수집 실패. URL 또는 HTML 구조를 확인하세요:",
        error instanceof Error ? error.message : String(error),
      );
      return [];
    }

    return rows;
  }
}
