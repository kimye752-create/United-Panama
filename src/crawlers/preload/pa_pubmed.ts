/**
 * D1 작업 — Phase A 거시 수집
 * PubMed E-utilities — 8종 INN 영문 논문 건수 수집 (골든 데이터)
 * API: https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi
 * NCBI 권장 속도: 3 req/s 이하 → 요청 간 400ms 딜레이 적용
 */

import { ApiCrawler } from "../base/ApiCrawler.js";
import type { CrawlRowData } from "../base/BaseCrawler.js";
import { TARGET_PRODUCTS } from "../../utils/product-dictionary.js";

// ─────────────────────────────────────────────────
// 타입 정의
// ─────────────────────────────────────────────────

/** PubMed E-utilities esearch API 응답 */
type PubMedESearchResult = {
  header: { type: string; version: string };
  esearchresult: {
    count: string;       // 논문 건수 (문자열 — parseInt 필요)
    retmax: string;
    retstart: string;
    idlist: string[];
    querytranslation: string;
  };
};

// ─────────────────────────────────────────────────
// 내부 유틸
// ─────────────────────────────────────────────────

/** NCBI 속도 제한 준수용 대기 함수 (400ms) */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─────────────────────────────────────────────────
// 크롤러
// ─────────────────────────────────────────────────

export class PubMedCrawler extends ApiCrawler<PubMedESearchResult> {
  constructor() {
    super(
      "PubMed",
      "static_pre_loaded",
      "macro",
      0.90,
      "https://eutils.ncbi.nlm.nih.gov",
      "/entrez/eutils/esearch.fcgi",
      { Accept: "application/json" },
    );
  }

  protected async crawl(): Promise<CrawlRowData[]> {
    const rows: CrawlRowData[] = [];
    const crawlTime = new Date().toISOString();

    for (const product of TARGET_PRODUCTS) {
      // NCBI 속도 제한 준수: 요청 간 400ms 대기
      await sleep(400);

      try {
        // "INN Panama" 조합으로 파나마 현지 임상·약가 관련 논문 검색
        const term = `${product.who_inn_en} Panama`;
        const data = await this.fetchJson({
          db: "pubmed",
          term,
          retmode: "json",
          retmax: 0,   // ID 목록은 불필요, 건수만 확인
        });

        const countStr = data.esearchresult.count;
        const paperCount = parseInt(countStr, 10);

        if (Number.isNaN(paperCount)) {
          console.warn(
            `[PubMed] ${product.who_inn_en}: count 파싱 실패 (원본값: "${countStr}"). 건너뜁니다.`,
          );
          continue;
        }

        // panama_search_keywords 첫 번째 항목 = 스페인어 현지 INN
        const innEs = product.panama_search_keywords[0] ?? product.who_inn_en;
        rows.push({
          product_id: product.product_id,
          pa_source: "pubmed",
          pa_source_url: `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(term)}`,
          pa_collected_at: crawlTime,
          pa_ingredient_inn: product.who_inn_en,  // 검색에 사용한 INN (영문)
          pa_product_name_local: innEs,           // 스페인어 INN (DB 일관성)
          pa_price_local: paperCount,             // 논문 건수를 수치 지표로 저장
          pa_currency_unit: "USD",
          pa_package_unit: "papers",             // 단위: 논문 편수
          pa_price_type: "pubmed_count",         // 커스텀 가격 유형 태그
        });
      } catch (error: unknown) {
        // 개별 INN 실패 시 로그 후 다음 INN 계속
        console.error(
          `[PubMed] ${product.who_inn_en} 수집 실패:`,
          error instanceof Error ? error.message : String(error),
        );
      }
    }

    return rows;
  }
}
