/**
 * 한국수출입은행 USD/KRW 환율 실시간 조회 + panama 업서트
 */
/// <reference types="node" />

import { normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";

import {
  getSupabaseClient,
  insertRow,
  PANAMA_TABLE,
  type PanamaPhase1InsertRow,
} from "../../utils/db_connector";
import { MACRO_PRODUCT_ID } from "../../utils/product-dictionary";

const EXIM_ENDPOINT =
  "https://www.koreaexim.go.kr/site/program/financial/exchangeJSON";
const MAX_LOOKBACK_DAYS = 5;
const PA_SOURCE = "exchange_rate_exim" as const;

loadEnv({ path: ".env.local" });
loadEnv();

export interface ExchangeRateResult {
  rate: number;
  source: "api_today" | "api_fallback" | "db_fallback";
  searchDate: string;
  actualSearchDate: string;
}

interface EximRateItem {
  cur_unit?: string;
  deal_bas_r?: string;
}

function toYmd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toYyyymmdd(date: Date): string {
  return toYmd(date).replaceAll("-", "");
}

function parseRate(text: string): number | null {
  const parsed = Number.parseFloat(text.replaceAll(",", "").trim());
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function addDays(date: Date, days: number): Date {
  const out = new Date(date.getTime());
  out.setUTCDate(out.getUTCDate() + days);
  return out;
}

function resolveEximApiKey(): string {
  const key = process.env.KOREAEXIM_API_KEY ?? process.env.EXIM_API_KEY;
  if (key === undefined || key.trim() === "") {
    throw new Error(
      "KOREAEXIM_API_KEY(EXIM_API_KEY 대체 허용)가 비어 있습니다. .env.local 또는 Vercel 환경변수에 키를 등록하세요.",
    );
  }
  return key.trim();
}

async function fetchUsdKrwByDate(searchDate: Date): Promise<number | null> {
  const apiKey = resolveEximApiKey();
  const yyyymmdd = toYyyymmdd(searchDate);
  const url = new URL(EXIM_ENDPOINT);
  url.searchParams.set("authkey", apiKey);
  url.searchParams.set("searchdate", yyyymmdd);
  url.searchParams.set("data", "AP01");

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; UnitedPanama/1.0)",
      },
    });
    if (!response.ok) {
      throw new Error(
        `HTTP ${String(response.status)} ${response.statusText}`,
      );
    }
    const raw: unknown = await response.json();
    if (!Array.isArray(raw)) {
      throw new Error(
        "환율 API 응답이 배열 형식이 아닙니다. API 키와 호출 파라미터를 확인하세요.",
      );
    }
    const usd = (raw as EximRateItem[]).find(
      (item) => item.cur_unit?.trim().toUpperCase() === "USD",
    );
    const deal = usd?.deal_bas_r;
    if (deal === undefined) {
      return null;
    }
    return parseRate(deal);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `환율 API 호출 실패(searchdate=${yyyymmdd}): ${message}. API 키, 네트워크, 영업일 여부를 확인하세요.`,
    );
  }
}

async function loadLatestRateFromDb(): Promise<ExchangeRateResult> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from(PANAMA_TABLE)
    .select("pa_price_local, pa_item_collected_at")
    .eq("pa_source", PA_SOURCE)
    .order("pa_item_collected_at", { ascending: false })
    .limit(1);
  if (error !== null || data === null || data.length === 0) {
    throw new Error(
      "DB fallback용 기존 환율 행이 없습니다. 먼저 API 키를 정상 설정해 초기 적재를 수행하세요.",
    );
  }
  const row = data[0] as {
    pa_price_local: number | string | null;
    pa_item_collected_at: string | null;
  };
  const rawRate = row.pa_price_local;
  const rate =
    typeof rawRate === "number"
      ? rawRate
      : typeof rawRate === "string"
        ? parseRate(rawRate)
        : null;
  if (rate === null) {
    throw new Error(
      "DB fallback 환율 값이 비어 있거나 숫자가 아닙니다. 기존 exchange_rate_exim 행을 점검하세요.",
    );
  }
  const itemAt = row.pa_item_collected_at ?? toYmd(new Date());
  const itemDate = itemAt.slice(0, 10);
  return {
    rate,
    source: "db_fallback",
    searchDate: itemDate,
    actualSearchDate: itemDate,
  };
}

export async function fetchExchangeRateUsdKrw(): Promise<ExchangeRateResult> {
  const today = new Date();
  const errors: string[] = [];

  for (let i = 0; i < MAX_LOOKBACK_DAYS; i += 1) {
    const targetDate = addDays(today, -i);
    const ymd = toYmd(targetDate);
    try {
      const rate = await fetchUsdKrwByDate(targetDate);
      if (rate !== null) {
        return {
          rate,
          source: i === 0 ? "api_today" : "api_fallback",
          searchDate: toYmd(today),
          actualSearchDate: ymd,
        };
      }
      errors.push(`searchDate=${ymd}: USD 데이터 없음`);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      errors.push(`searchDate=${ymd}: ${msg}`);
    }
  }

  try {
    return await loadLatestRateFromDb();
  } catch (fallbackError: unknown) {
    const fallbackMsg =
      fallbackError instanceof Error
        ? fallbackError.message
        : String(fallbackError);
    throw new Error(
      `환율 조회가 5일 모두 실패했고 DB fallback도 실패했습니다. 원인=${errors.join(" | ")} / fallback=${fallbackMsg}`,
    );
  }
}

function isoNoonUtcFromYmd(ymd: string): string {
  return `${ymd}T12:00:00.000Z`;
}

export async function upsertExchangeRateToDb(
  result: ExchangeRateResult,
): Promise<void> {
  const client = getSupabaseClient();
  const itemCollectedAt = isoNoonUtcFromYmd(result.actualSearchDate);
  const crawledAt = new Date().toISOString();
  const paNotes = JSON.stringify({
    cur_unit: "USD",
    search_date: result.searchDate,
    actual_search_date: result.actualSearchDate,
    source: result.source,
  });

  const { data: existing, error: selErr } = await client
    .from(PANAMA_TABLE)
    .select("id")
    .eq("pa_source", PA_SOURCE)
    .eq("pa_item_collected_at", itemCollectedAt)
    .limit(1);
  if (selErr !== null) {
    throw new Error(
      `기존 환율 행 조회 실패: ${selErr.message}. DB 연결/권한을 확인하세요.`,
    );
  }

  if (existing !== null && existing.length > 0) {
    const id = (existing[0] as { id: string }).id;
    const { error: upErr } = await client
      .from(PANAMA_TABLE)
      .update({
        crawled_at: crawledAt,
        pa_price_local: result.rate,
        pa_currency_unit: "KRW",
        pa_price_type: "exchange_rate",
        pa_notes: paNotes,
      })
      .eq("id", id);
    if (upErr !== null) {
      throw new Error(
        `환율 행 UPDATE 실패(id=${id}): ${upErr.message}. 컬럼 권한/타입을 확인하세요.`,
      );
    }
    return;
  }

  const row: PanamaPhase1InsertRow = {
    product_id: MACRO_PRODUCT_ID,
    market_segment: "macro",
    fob_estimated_usd: null,
    confidence: 0.95,
    crawled_at: crawledAt,
    pa_source: PA_SOURCE,
    pa_price_local: result.rate,
    pa_currency_unit: "KRW",
    pa_price_type: "exchange_rate",
    pa_notes: paNotes,
    pa_item_collected_at: itemCollectedAt,
  };
  const inserted = await insertRow(row);
  if (!inserted.ok) {
    throw new Error(
      `환율 INSERT 실패: ${inserted.message}. 공통 6컬럼과 Supabase 상태를 확인하세요.`,
    );
  }
}

async function main(): Promise<void> {
  const result = await fetchExchangeRateUsdKrw();
  await upsertExchangeRateToDb(result);
  process.stdout.write(
    `${JSON.stringify({ ok: true, ...result }, null, 2)}\n`,
  );
}

const invoked = process.argv[1];
if (invoked !== undefined) {
  const a = normalize(fileURLToPath(import.meta.url));
  const b = normalize(invoked);
  if (a === b) {
    main().catch((error: unknown) => {
      process.stderr.write(
        `${error instanceof Error ? error.message : String(error)}\n`,
      );
      process.exit(1);
    });
  }
}
