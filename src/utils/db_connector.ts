/**
 * D1 작업 — Phase A 거시 수집 파이프라인 베이스
 * Supabase `panama` 테이블 INSERT 래퍼 및 공통 6컬럼 검증
 */
/// <reference types="node" />

import { config as loadEnv } from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// .env 로드 (크롤러/스크립트가 최초로 이 모듈을 불러올 때 한 번 적용)
loadEnv();

/** Supabase `panama` 테이블명 (ARCHITECTURE.md 기준) */
export const PANAMA_TABLE = "panama" as const;

/** 공통 6컬럼 중 market_segment 허용 값 */
export type MarketSegment =
  | "public"
  | "private"
  | "macro"
  | "regulatory_milestone"
  /** 민간 소매(Arrocha 등) — 세션 17 */
  | "private_retail"
  /** 규제·등록 조회(DNFD 등) — 세션 17 */
  | "regulatory";

/**
 * 1공정(Phase A) INSERT 시 공통 6컬럼 형태.
 * `fob_estimated_usd`는 아키텍처상 반드시 null (2공정에서 UPDATE).
 */
export interface PanamaCommonPhase1 {
  /** 생략 시 DB `gen_random_uuid()`에 위임 가능 */
  id?: string;
  product_id: string;
  market_segment: MarketSegment;
  fob_estimated_usd: null;
  confidence: number;
  /** UTC 기준 수집 시각 (ISO 8601 문자열 권장) */
  crawled_at: string;
}

/**
 * 공통 6컬럼 + `pa_*` 등 추가 컬럼.
 * 인덱스 시그니처 값 타입은 JSON/DB에 넣을 수 있는 범위로 제한.
 */
export interface PanamaPhase1InsertRow extends PanamaCommonPhase1 {
  [key: string]: string | number | boolean | null | undefined | MarketSegment;
}

const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

let supabaseSingleton: SupabaseClient | undefined;

/**
 * 환경변수로 Supabase 클라이언트를 한 번만 만들고 재사용합니다.
 */
export function getSupabaseClient(): SupabaseClient {
  if (supabaseSingleton) {
    return supabaseSingleton;
  }

  const url = process.env.SUPABASE_URL;
  const rawKey = process.env.SUPABASE_KEY;
  // .env에 실수로 (키) 형태로 붙여 넣은 경우 Invalid API key 방지
  const key = rawKey?.replace(/^\(|\)$/g, "").trim();

  if (url === undefined || url.trim() === "") {
    throw new Error(
      "SUPABASE_URL이 비어 있습니다. .env에 Supabase 프로젝트 URL을 설정한 뒤 다시 실행하세요.",
    );
  }
  if (key === undefined || key === "") {
    throw new Error(
      "SUPABASE_KEY가 비어 있습니다. .env에 Supabase API 키(anon 또는 service_role)를 설정한 뒤 다시 실행하세요.",
    );
  }

  supabaseSingleton = createClient(url, key);
  return supabaseSingleton;
}

function isValidUuid(value: string): boolean {
  return UUID_V4_RE.test(value);
}

/** product_id: RFC UUID v4 형식만 허용 (product-dictionary.ts의 상수값 기준) */
function isValidProductId(value: string): boolean {
  return isValidUuid(value);
}

/**
 * 공통 6컬럼 및 1공정 규칙(fob=null)을 검증합니다. 실패 시 Error를 던집니다.
 */
export function validatePanamaPhase1Common(row: PanamaPhase1InsertRow): void {
  if (row.id !== undefined && row.id !== "" && !isValidUuid(row.id)) {
    throw new Error(
      "id가 유효한 UUID 형식이 아닙니다. 생략하면 DB에서 자동 생성됩니다.",
    );
  }

  if (!isValidProductId(row.product_id)) {
    throw new Error(
      "product_id는 유효한 UUID v4 형식이어야 합니다. src/utils/product-dictionary.ts의 상수값을 사용하세요.",
    );
  }

  const segments: readonly MarketSegment[] = [
    "public",
    "private",
    "macro",
    "regulatory_milestone",
    "private_retail",
    "regulatory",
  ];
  if (!segments.includes(row.market_segment)) {
    throw new Error(
      "market_segment는 public, private, macro, regulatory_milestone 중 하나여야 합니다.",
    );
  }

  if (row.fob_estimated_usd !== null) {
    throw new Error(
      "1공정에서는 fob_estimated_usd를 반드시 null로 적재해야 합니다. FOB 역산은 2공정에서 UPDATE합니다.",
    );
  }

  if (
    typeof row.confidence !== "number" ||
    Number.isNaN(row.confidence) ||
    row.confidence < 0 ||
    row.confidence > 1
  ) {
    throw new Error(
      "confidence는 0.0 이상 1.0 이하의 숫자여야 합니다.",
    );
  }

  const parsed = Date.parse(row.crawled_at);
  if (Number.isNaN(parsed)) {
    throw new Error(
      "crawled_at은 파싱 가능한 날짜 문자열(ISO 8601 권장)이어야 합니다.",
    );
  }
}

export type InsertRowSuccess = { ok: true };

export type InsertRowFailure = {
  ok: false;
  message: string;
  cause?: unknown;
};

export type InsertRowResult = InsertRowSuccess | InsertRowFailure;

/**
 * 공통 6컬럼 검증 후 `panama` 테이블에 단일 행을 삽입합니다.
 * 네트워크/Supabase 오류는 try-catch로 잡아 한국어 메시지로 로그합니다.
 */
export async function insertRow(
  row: PanamaPhase1InsertRow,
): Promise<InsertRowResult> {
  try {
    validatePanamaPhase1Common(row);

    const client = getSupabaseClient();
    const { error } = await client.from(PANAMA_TABLE).insert(row);

    if (error !== null) {
      const detail = error.message;
      console.error(
        "[db_connector] Supabase INSERT 실패:",
        detail,
        error,
      );
      return {
        ok: false,
        message: `Supabase INSERT에 실패했습니다: ${detail}. 테이블·RLS·컬럼명을 확인하세요.`,
        cause: error,
      };
    }

    return { ok: true };
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "알 수 없는 오류로 INSERT를 완료하지 못했습니다.";
    console.error("[db_connector] insertRow 처리 중 오류:", message, error);
    return {
      ok: false,
      message,
      cause: error,
    };
  }
}

/*
  사용 예시 (다른 크롤러에서):
  const r = await insertRow({ product_id: "...", market_segment: "macro", fob_estimated_usd: null, confidence: 0.9, crawled_at: new Date().toISOString(), pa_source: "worldbank" });
  if (!r.ok) { throw new Error(r.message); }
*/
