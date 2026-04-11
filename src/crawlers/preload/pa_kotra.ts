/**
 * D1 작업 — Phase A 거시 수집
 * KOTRA 파나마 무역관 — 최신 시장 보고서 3건 파싱
 * ★ 2023.6 대한민국 '위생 선진국' 지정 관련 보고서 포함 가능
 *
 * TODO: 실제 URL 확인 필요 — 아래 URL은 KOTRA dream 포털 파나마 국가 리포트 추정값
 * 확인 경로: https://dream.kotra.or.kr → 해외시장뉴스 → 국가별(파나마)
 */

import { StaticCrawler } from "../base/StaticCrawler.js";
import type { CrawlRowData } from "../base/BaseCrawler.js";
import { MACRO_PRODUCT_ID } from "../../utils/product-dictionary.js";

// ─────────────────────────────────────────────────
// 상수
// ─────────────────────────────────────────────────

// TODO: 실제 URL 확인 필요 — KOTRA dream 파나마 뉴스 목록 페이지
const KOTRA_URL =
  "https://dream.kotra.or.kr/kotranews/cms/news/actionKotraBoardList.do?MENU_ID=180&pNatCd=PA&pCurrentPage=1&pSortField=BD_WRTDATE&pSortDirection=DESC";

// MACRO_PRODUCT_ID는 src/utils/product-dictionary.ts에서 import

/** 수집할 최대 보고서 건수 (골든 데이터 3건) */
const MAX_REPORTS = 3;

// ─────────────────────────────────────────────────
// 크롤러
// ─────────────────────────────────────────────────

export class KotraCrawler extends StaticCrawler {
  constructor() {
    super("KOTRA", "static_pre_loaded", "macro", 0.82);
  }

  protected async crawl(): Promise<CrawlRowData[]> {
    const rows: CrawlRowData[] = [];
    const crawlTime = new Date().toISOString();

    try {
      const $ = await this.fetchHtml(KOTRA_URL, {
        // KOTRA dream 포털은 한국어 환경 헤더가 필요할 수 있음
        "Accept-Language": "ko-KR,ko;q=0.9",
        Referer: "https://dream.kotra.or.kr/",
      });

      // KOTRA dream 포털 뉴스 목록 셀렉터 (JSP 렌더링 기반 — TODO: 실제 구조 확인)
      // 일반적인 패턴: .board-list tbody tr 또는 .news-list li
      const items = $(".board-list tbody tr, .news-list li, ul.list-type li").slice(0, MAX_REPORTS);

      if (items.length === 0) {
        console.warn(
          "[KOTRA] 보고서 목록을 찾지 못했습니다. 셀렉터 또는 URL을 확인하세요.",
        );
        return [];
      }

      items.each((_i, el) => {
        // TODO: 실제 HTML 구조 확인 후 셀렉터 정교화 필요
        const titleEl = $(el).find("a, .title, td:nth-child(2)").first();
        const title = titleEl.text().trim();
        const href = titleEl.attr("href") ?? "";
        const dateEl = $(el).find(".date, td:last-child, time").first();
        const dateText = dateEl.text().trim();

        if (title.length === 0) return;

        const fullUrl = href.startsWith("http")
          ? href
          : `https://dream.kotra.or.kr${href}`;

        rows.push({
          product_id: MACRO_PRODUCT_ID,
          pa_source: "kotra",
          pa_source_url: fullUrl,
          pa_collected_at: dateText.length > 0 ? dateText : crawlTime,
          pa_product_name_local: title,  // 보고서 제목 (한국어)
          pa_price_type: "regulated",
          pa_decree_listed: false,
          pa_stock_status: "unknown",
        });
      });
    } catch (error: unknown) {
      // 수집 실패 시 빈 배열로 run()이 정상 동작하도록
      console.error(
        "[KOTRA] 페이지 수집 실패. URL·셀렉터를 확인하세요:",
        error instanceof Error ? error.message : String(error),
      );
      return [];
    }

    return rows;
  }
}
