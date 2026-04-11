/**
 * D1 작업 — Phase A 거시 수집 파이프라인 베이스
 * 모든 크롤러의 추상 부모 클래스 — 템플릿 메서드 패턴으로 공통 흐름 통제
 */
/// <reference types="node" />

import {
  insertRow,
  type InsertRowResult,
  type MarketSegment,
  type PanamaPhase1InsertRow,
} from "../../utils/db_connector.js";

// ─────────────────────────────────────────────────
// 타입 정의
// ─────────────────────────────────────────────────

/** DB `pa_source_type` 허용 값 (ARCHITECTURE.md 기준) */
export type PaSourceType = "static_pre_loaded" | "llm_realtime";

/**
 * 하위 크롤러 `crawl()` 이 반환하는 부분 행.
 * 공통 6컬럼(market_segment, fob_estimated_usd, confidence, crawled_at)은
 * run()이 붙이므로 여기선 생략. product_id는 반드시 포함.
 */
export type CrawlRowData = {
  product_id: string;
} & Record<string, string | number | boolean | null | undefined>;

/** run() 반환 결과 — InsertRowResult 패턴과 일관성 유지 */
export type CrawlRunResult =
  | { ok: true; inserted: number }
  | { ok: false; message: string; cause?: unknown; inserted: number };

// ─────────────────────────────────────────────────
// 추상 클래스
// ─────────────────────────────────────────────────

export abstract class BaseCrawler {
  /** 크롤러 이름 (로그·에러 메시지에 표시) */
  readonly name: string;

  /** DB에 기록할 pa_source_type. Phase A는 항상 static_pre_loaded */
  readonly sourceType: PaSourceType;

  /** 이 크롤러가 수집하는 시장 분류 */
  readonly market_segment: MarketSegment;

  /**
   * 기본 confidence 값 (0.0~1.0).
   * 개별 행이 confidence를 직접 반환하면 덮어쓰기 가능.
   */
  readonly baseConfidence: number;

  constructor(
    name: string,
    sourceType: PaSourceType,
    market_segment: MarketSegment,
    baseConfidence: number,
  ) {
    if (baseConfidence < 0 || baseConfidence > 1) {
      throw new Error(
        `[${name}] baseConfidence는 0.0~1.0 사이여야 합니다. 현재 값: ${baseConfidence}`,
      );
    }
    this.name = name;
    this.sourceType = sourceType;
    this.market_segment = market_segment;
    this.baseConfidence = baseConfidence;
  }

  // ─────────────────────────────────────────────────
  // 추상 메서드 — 하위 클래스 구현 필수
  // ─────────────────────────────────────────────────

  /**
   * 실제 수집 로직. 하위 크롤러가 반드시 구현해야 합니다.
   * 반환 배열이 비어 있으면 run()은 { ok: true, inserted: 0 } 반환.
   */
  protected abstract crawl(): Promise<CrawlRowData[]>;

  // ─────────────────────────────────────────────────
  // 템플릿 메서드 — 공통 흐름 고정
  // ─────────────────────────────────────────────────

  /**
   * 크롤 전체 흐름을 통제하는 템플릿 메서드.
   *
   * 흐름:
   *   1. crawl() 호출 → 부분 행 배열 획득
   *   2. 각 행에 공통 6컬럼 합성
   *   3. insertRow()로 순차 적재 (실패 시 해당 행 건너뜀 + 누적 오류 기록)
   *   4. 전체 결과를 CrawlRunResult로 반환 (throw 없음)
   */
  async run(): Promise<CrawlRunResult> {
    let rows: CrawlRowData[];

    // ① crawl() 실행 — 수집 실패는 즉시 실패 결과로 반환
    try {
      rows = await this.crawl();
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "크롤 중 알 수 없는 오류가 발생했습니다.";
      console.error(`[${this.name}] crawl() 실패:`, message, error);
      return { ok: false, message, cause: error, inserted: 0 };
    }

    if (rows.length === 0) {
      console.warn(`[${this.name}] crawl() 결과가 0건입니다.`);
      return { ok: true, inserted: 0 };
    }

    // --dry-run: 적재 생략(행 수만 반영) — CI·로컬 검증용
    if (process.argv.includes("--dry-run")) {
      return { ok: true, inserted: rows.length };
    }

    // ② 공통 6컬럼 합성 후 순차 INSERT
    const crawled_at = new Date().toISOString();
    const failures: InsertRowResult[] = [];
    let inserted = 0;

    for (const row of rows) {
      // confidence: 행에 명시된 값이 있으면 우선, 없으면 baseConfidence 사용
      const confidenceRaw = row["confidence"];
      const confidence =
        typeof confidenceRaw === "number" ? confidenceRaw : this.baseConfidence;

      const fullRow: PanamaPhase1InsertRow = {
        ...row,
        market_segment: this.market_segment,
        fob_estimated_usd: null,   // 1공정 강제 null — FOB 역산은 2공정
        confidence,
        crawled_at,
        // pa_source_type 컬럼 미사용 (세션 정책 — pa_source만으로 출처 추적)
      };

      const result = await insertRow(fullRow);

      if (result.ok) {
        inserted += 1;
      } else {
        // 개별 행 실패는 로그만 남기고 계속 진행
        console.error(
          `[${this.name}] INSERT 실패 (product_id=${row.product_id}):`,
          result.message,
        );
        failures.push(result);
      }
    }

    // ③ 최종 결과 반환 — 일부 실패가 있으면 ok: false, 전부 성공이면 ok: true
    if (failures.length > 0) {
      const summary = failures
        .map((f) => (f.ok === false ? f.message : ""))
        .filter(Boolean)
        .join(" | ");
      return {
        ok: false,
        message: `[${this.name}] ${failures.length}건 INSERT 실패 (성공: ${inserted}건). 원인: ${summary}`,
        cause: failures,
        inserted,
      };
    }

    return { ok: true, inserted };
  }
}

/*
  사용 예시 (하위 크롤러에서):

  class WorldBankCrawler extends BaseCrawler {
    constructor() { super("WorldBank", "static_pre_loaded", "macro", 0.9); }
    protected async crawl(): Promise<CrawlRowData[]> {
      // ... axios로 JSON 수집 후 배열 반환
      return [{ product_id: "uuid-pa-001", pa_source: "worldbank", pa_price_local: 12.5 }];
    }
  }

  const result = await new WorldBankCrawler().run();
  if (!result.ok) { console.error(result.message); }
  else { console.log(`적재 완료: ${result.inserted}건`); }
*/
