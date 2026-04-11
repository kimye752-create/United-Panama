/**
 * D1 작업 — Phase A 거시 수집 파이프라인 베이스
 * 정적 HTML 파싱 전용 추상 크롤러 — fetchHtml()로 cheerio DOM 제공
 * Polite Scraping 기법 ⑦: User-Agent 랜덤화 + 1.5~3초 랜덤 딜레이 내장
 */

import axios from "axios";
import { load, type CheerioAPI } from "cheerio";
import {
  BaseCrawler,
  type CrawlRowData,
  type PaSourceType,
} from "./BaseCrawler.js";
import type { MarketSegment } from "../../utils/db_connector.js";

// ─────────────────────────────────────────────────
// 상수
// ─────────────────────────────────────────────────

/** Polite Scraping ⑦ — 사이트별 차단을 피하기 위한 실제 브라우저 User-Agent 목록 */
const USER_AGENTS: readonly string[] = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
];

/** Polite Scraping ⑦ — 최소 딜레이 (ms) */
const DELAY_MIN_MS = 1_500;

/** Polite Scraping ⑦ — 최대 딜레이 (ms) */
const DELAY_MAX_MS = 3_000;

/** HTTP 요청 타임아웃 (ms) */
const REQUEST_TIMEOUT_MS = 15_000;

// ─────────────────────────────────────────────────
// 내부 유틸
// ─────────────────────────────────────────────────

/** DELAY_MIN_MS ~ DELAY_MAX_MS 범위의 랜덤 대기 */
function randomDelay(): Promise<void> {
  const ms =
    Math.floor(Math.random() * (DELAY_MAX_MS - DELAY_MIN_MS + 1)) +
    DELAY_MIN_MS;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** USER_AGENTS 배열에서 무작위 하나를 선택 */
function pickUserAgent(): string {
  const idx = Math.floor(Math.random() * USER_AGENTS.length);
  // noUncheckedIndexedAccess 대응: undefined 폴백
  return USER_AGENTS[idx] ?? USER_AGENTS[0] ?? "";
}

// ─────────────────────────────────────────────────
// 추상 클래스
// ─────────────────────────────────────────────────

/**
 * 정적 HTML을 파싱하는 크롤러의 공통 기반 클래스.
 * `fetchHtml(url)`은 랜덤 딜레이 → 랜덤 UA → axios GET → cheerio 로드 순서로 동작.
 * 하위 클래스는 `crawl()`만 구현하면 됩니다.
 */
export abstract class StaticCrawler extends BaseCrawler {
  constructor(
    name: string,
    sourceType: PaSourceType,
    market_segment: MarketSegment,
    baseConfidence: number,
  ) {
    super(name, sourceType, market_segment, baseConfidence);
  }

  /** 하위 클래스가 반드시 구현해야 하는 수집 메서드 */
  protected abstract override crawl(): Promise<CrawlRowData[]>;

  // ─────────────────────────────────────────────────
  // 보호 메서드 — 하위 크롤러에서 crawl() 내부에서 호출
  // ─────────────────────────────────────────────────

  /**
   * 대상 URL의 HTML을 가져와 cheerio DOM으로 반환합니다.
   *
   * - 요청 전 1.5~3초 랜덤 딜레이 (Polite Scraping ⑦)
   * - 매 호출마다 User-Agent 랜덤 교체 (Polite Scraping ⑦)
   * - 실패 시 한국어 오류와 함께 throw → run()의 try-catch가 처리
   *
   * @param url 수집 대상 전체 URL
   * @param extraHeaders 추가 헤더 (선택, 예: Referer, Accept-Language)
   */
  protected async fetchHtml(
    url: string,
    extraHeaders?: Record<string, string>,
  ): Promise<CheerioAPI> {
    // ① Polite Scraping: 랜덤 딜레이로 서버 부하 분산
    await randomDelay();

    const ua = pickUserAgent();

    const headers: Record<string, string> = {
      "User-Agent": ua,
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "es-PA,es;q=0.9,en;q=0.8",
      ...extraHeaders,
    };

    try {
      const response = await axios.get<string>(url, {
        timeout: REQUEST_TIMEOUT_MS,
        headers,
        // HTML로 응답받기 위해 responseType 명시
        responseType: "text",
      });

      // ② cheerio로 DOM 파싱하여 반환
      return load(response.data);
    } catch (error: unknown) {
      const reason =
        error instanceof Error ? error.message : String(error);
      throw new Error(
        `[${this.name}] HTML 수집 실패: ${url} — ${reason}. ` +
          `네트워크 연결·URL·방화벽 설정을 확인하세요.`,
        { cause: error },
      );
    }
  }
}

/*
  사용 예시 (ITA 정적 HTML 크롤러):

  class ItaCrawler extends StaticCrawler {
    constructor() {
      super("ITA", "static_pre_loaded", "macro", 0.85);
    }
    protected async crawl(): Promise<CrawlRowData[]> {
      const $ = await this.fetchHtml("https://www.trade.gov/country-commercial-guides/panama-healthcare");
      const text = $("article").text().trim();
      return [{ product_id: "uuid-pa-001", pa_source: "ita", pa_product_name_local: text.slice(0, 200) }];
    }
  }
*/
