/**
 * D1 작업 — Phase A 거시 수집 파이프라인 베이스
 * REST API 전용 추상 크롤러 — fetchJson()으로 타입 안전 HTTP GET 제공
 */
/// <reference types="node" />

import axios, { type AxiosRequestConfig } from "axios";
import {
  BaseCrawler,
  type CrawlRowData,
  type PaSourceType,
} from "./BaseCrawler.js";
import type { MarketSegment } from "../../utils/db_connector.js";

// ─────────────────────────────────────────────────
// 상수
// ─────────────────────────────────────────────────

/** HTTP 요청 타임아웃 (10초) */
const REQUEST_TIMEOUT_MS = 10_000;

/** 최대 재시도 횟수 (첫 시도 제외) */
const MAX_RETRIES = 2;

// ─────────────────────────────────────────────────
// 내부 유틸
// ─────────────────────────────────────────────────

/** 지수 백오프용 대기 함수 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─────────────────────────────────────────────────
// 추상 클래스
// ─────────────────────────────────────────────────

/**
 * REST API를 호출하는 크롤러의 공통 기반 클래스.
 * 제너릭 `T`는 API 응답 JSON 구조를 나타냅니다.
 * 하위 클래스는 `crawl()`만 구현하면 됩니다.
 */
export abstract class ApiCrawler<T> extends BaseCrawler {
  /** API 루트 URL (예: "https://api.worldbank.org") */
  protected readonly baseUrl: string;

  /** 엔드포인트 경로 (예: "/v2/country/PA/indicator/NY.GDP.MKTP.CD") */
  protected readonly endpoint: string;

  /** 요청에 포함할 고정 헤더 */
  protected readonly headers: Record<string, string>;

  constructor(
    name: string,
    sourceType: PaSourceType,
    market_segment: MarketSegment,
    baseConfidence: number,
    baseUrl: string,
    endpoint: string,
    headers: Record<string, string>,
  ) {
    super(name, sourceType, market_segment, baseConfidence);
    this.baseUrl = baseUrl;
    this.endpoint = endpoint;
    this.headers = headers;
  }

  /** 하위 클래스가 반드시 구현해야 하는 수집 메서드 */
  protected abstract override crawl(): Promise<CrawlRowData[]>;

  // ─────────────────────────────────────────────────
  // 보호 메서드 — 하위 크롤러에서 crawl() 내부에서 호출
  // ─────────────────────────────────────────────────

  /**
   * 지정 URL로 GET 요청하고 응답 JSON을 제너릭 `T`로 반환합니다.
   * 타임아웃 10초, 실패 시 지수 백오프(0.5s→1s) 2회 재시도.
   *
   * @param params 쿼리스트링 파라미터 (선택)
   * @param overrideEndpoint 기본 endpoint 대신 다른 경로를 쓸 때 (선택)
   */
  protected async fetchJson(
    params?: Record<string, string | number | boolean>,
    overrideEndpoint?: string,
  ): Promise<T> {
    const path = overrideEndpoint ?? this.endpoint;
    const url = `${this.baseUrl}${path}`;

    const config: AxiosRequestConfig = {
      timeout: REQUEST_TIMEOUT_MS,
      headers: this.headers,
      params,
    };

    let lastError: unknown;

    // 첫 시도 + MAX_RETRIES번 재시도
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        // 지수 백오프: 1차 재시도 500ms, 2차 재시도 1000ms
        const waitMs = 500 * attempt;
        console.warn(
          `[${this.name}] 재시도 ${attempt}/${MAX_RETRIES} — ${waitMs}ms 대기 후 재요청: ${url}`,
        );
        await sleep(waitMs);
      }

      try {
        const response = await axios.get<T>(url, config);
        return response.data;
      } catch (error: unknown) {
        lastError = error;
        const reason =
          error instanceof Error ? error.message : String(error);
        console.warn(
          `[${this.name}] 요청 실패 (시도 ${attempt + 1}/${MAX_RETRIES + 1}): ${reason}`,
        );
      }
    }

    // 모든 재시도 소진 → 상위(run())의 try-catch로 전달
    throw new Error(
      `[${this.name}] ${MAX_RETRIES + 1}회 시도 후에도 응답을 받지 못했습니다. ` +
        `URL: ${url} — 네트워크 상태·엔드포인트·API 키를 확인하세요.`,
      { cause: lastError },
    );
  }
}

/*
  사용 예시 (WorldBank 크롤러):

  class WorldBankCrawler extends ApiCrawler<WorldBankApiResponse> {
    constructor() {
      super("WorldBank", "static_pre_loaded", "macro", 0.92,
        "https://api.worldbank.org", "/v2/country/PA/indicator/NY.GDP.MKTP.CD",
        { Accept: "application/json" });
    }
    protected async crawl(): Promise<CrawlRowData[]> {
      const data = await this.fetchJson({ format: "json", per_page: 1 });
      return [{ product_id: "uuid-pa-001", pa_source: "worldbank", pa_price_local: data.value }];
    }
  }
*/
