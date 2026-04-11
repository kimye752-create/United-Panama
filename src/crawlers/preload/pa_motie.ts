/**
 * D1 작업 — Phase A 거시 수집
 * 산자부(MOTIE) — 한-중미 FTA 파나마 관련 3개 데이터 포인트 파싱
 * ★ 2021.3.1 전체 발효 완료 (파나마·코스타리카·온두라스·엘살바도르·니카라과)
 *
 * TODO: 실제 URL 확인 필요 — 아래 URL은 FTA 포털 중미 협정 페이지 추정값
 * 확인 경로 1: https://www.fta.go.kr/ca/ (FTA 포털 중미)
 * 확인 경로 2: https://www.motie.go.kr → 통상 → FTA → 한-중미 FTA
 */

import { StaticCrawler } from "../base/StaticCrawler.js";
import type { CrawlRowData } from "../base/BaseCrawler.js";
import { MACRO_PRODUCT_ID } from "../../utils/product-dictionary.js";

// ─────────────────────────────────────────────────
// 상수
// ─────────────────────────────────────────────────

// TODO: 실제 URL 확인 필요 — FTA 포털 한-중미(CA) 협정 메인 페이지
const MOTIE_URL = "https://www.fta.go.kr/ca/";

// MACRO_PRODUCT_ID는 src/utils/product-dictionary.ts에서 import

/**
 * 추출 목표 3개 데이터 포인트 (골든 데이터)
 * 1. 발효일 / 2. 관세 철폐율 / 3. 의약품 관련 조항
 */
const FTA_SECTIONS = [
  { keyword: "발효",      label: "FTA 발효 정보" },
  { keyword: "관세",      label: "관세 철폐 조항" },
  { keyword: "의약",      label: "의약품 관련 조항" },
] as const;

// ─────────────────────────────────────────────────
// 크롤러
// ─────────────────────────────────────────────────

export class MotieCrawler extends StaticCrawler {
  constructor() {
    super("MOTIE", "static_pre_loaded", "macro", 0.83);
  }

  protected async crawl(): Promise<CrawlRowData[]> {
    const rows: CrawlRowData[] = [];
    const crawlTime = new Date().toISOString();

    try {
      const $ = await this.fetchHtml(MOTIE_URL, {
        "Accept-Language": "ko-KR,ko;q=0.9",
        Referer: "https://www.fta.go.kr/",
      });

      // 페이지 전체 텍스트에서 FTA 섹션별 키워드 탐색
      // TODO: 실제 HTML 구조 확인 후 셀렉터 정교화 필요
      const bodyText = $("main, #content, .content-area, body").first().text();

      for (const section of FTA_SECTIONS) {
        // 키워드 앞뒤 200자를 컨텍스트로 추출
        const idx = bodyText.indexOf(section.keyword);
        if (idx === -1) {
          console.warn(
            `[MOTIE] "${section.label}" 키워드를 페이지에서 찾지 못했습니다.`,
          );
          continue;
        }

        const start = Math.max(0, idx - 50);
        const end = Math.min(bodyText.length, idx + 200);
        const snippet = bodyText.slice(start, end).trim().replace(/\s+/g, " ");

        if (snippet.length === 0) continue;

        rows.push({
          product_id: MACRO_PRODUCT_ID,
          pa_source: "motie",
          pa_source_url: MOTIE_URL,
          pa_collected_at: crawlTime,
          pa_product_name_local: section.label,  // FTA 항목 구분명
          pa_package_unit: snippet,              // 추출된 텍스트 스니펫
          pa_price_type: "regulated",
          pa_decree_listed: true,               // FTA = 정부 협정 등재
          pa_stock_status: "unknown",
        });
      }
    } catch (error: unknown) {
      // 수집 실패 시 빈 배열로 run()이 정상 동작하도록
      console.error(
        "[MOTIE] 페이지 수집 실패. URL을 확인하세요:",
        error instanceof Error ? error.message : String(error),
      );
      return [];
    }

    return rows;
  }
}
