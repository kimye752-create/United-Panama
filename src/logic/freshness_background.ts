/**
 * 분석 API 백그라운드 — Haiku 신선도 판정 후 panama 행만 UPDATE (보고서 경로 비침해)
 */
/// <reference types="node" />

import { createSupabaseServer } from "../../lib/supabase-server";
import { getFreshnessMetadata } from "../constants/freshness_registry";
import type { RefreshCycle } from "../types/freshness";
import {
  batchCheckFreshness,
  type FreshnessInput,
  type FreshnessStatus,
} from "./freshness_checker";
import type { PanamaRow } from "./fetch_panama_data";

const PANAMA_TABLE = "panama" as const;
const ONE_HOUR_MS = 60 * 60 * 1000;

function isRefreshCycle(v: string): v is RefreshCycle {
  return (
    v === "immediate" ||
    v === "1d" ||
    v === "7d" ||
    v === "1m" ||
    v === "3m" ||
    v === "1y" ||
    v === "immutable" ||
    v === "unknown"
  );
}

function coerceRefreshCycle(row: PanamaRow): RefreshCycle {
  const raw = row.pa_refresh_cycle;
  if (typeof raw === "string" && isRefreshCycle(raw.trim())) {
    return raw.trim() as RefreshCycle;
  }
  return getFreshnessMetadata(row.pa_source ?? "unknown").refreshCycle;
}

/** pa_notes → LLM 입력용 객체 */
function parsePaNotesRecord(
  paNotes: string | null | undefined,
): Record<string, unknown> {
  if (paNotes === null || paNotes === undefined) {
    return {};
  }
  const t = paNotes.trim();
  if (t === "") {
    return {};
  }
  if (t.startsWith("{")) {
    try {
      const v: unknown = JSON.parse(t);
      if (typeof v === "object" && v !== null && !Array.isArray(v)) {
        return v as Record<string, unknown>;
      }
    } catch {
      return { notes_plain: t.slice(0, 2000) };
    }
  }
  return { notes_plain: t.slice(0, 2000) };
}

/** 행 요약 — Haiku valueDescription */
export function buildValueDescription(row: PanamaRow): string {
  const parts: string[] = [];
  parts.push(`source=${row.pa_source ?? "unknown"}`);
  if (row.market_segment !== null && row.market_segment !== undefined) {
    parts.push(`segment=${String(row.market_segment)}`);
  }
  if (
    row.pa_product_name_local !== null &&
    row.pa_product_name_local !== undefined &&
    String(row.pa_product_name_local).trim() !== ""
  ) {
    parts.push(
      `name=${String(row.pa_product_name_local).slice(0, 120)}`,
    );
  }
  const price = row.pa_price_local;
  if (price !== null && price !== undefined && String(price).trim() !== "") {
    parts.push(`price_local=${String(price)}`);
  }
  if (row.pa_currency_unit) {
    parts.push(`currency=${row.pa_currency_unit}`);
  }
  return parts.join("; ");
}

/** 1시간 내 재판정 생략 · immutable은 1회 판정 후 생략 */
export function shouldSkipFreshnessCheck(row: PanamaRow): boolean {
  if (
    row.pa_freshness_checked_at === null ||
    row.pa_freshness_checked_at === undefined ||
    row.pa_freshness_checked_at === ""
  ) {
    return false;
  }
  const metadata = getFreshnessMetadata(row.pa_source ?? "unknown");
  const statusStr = row.pa_freshness_status;
  const hasStatus =
    typeof statusStr === "string" && statusStr.trim() !== "";
  if (metadata.category === "immutable" && hasStatus) {
    return true;
  }
  const checkedAt = new Date(row.pa_freshness_checked_at);
  if (Number.isNaN(checkedAt.getTime())) {
    return false;
  }
  const oneHourAgo = new Date(Date.now() - ONE_HOUR_MS);
  return checkedAt > oneHourAgo;
}

async function updatePanamaFreshnessStatus(
  rowId: string,
  status: FreshnessStatus,
  checkedAt: string,
): Promise<void> {
  try {
    const supabase = createSupabaseServer();
    const { error } = await supabase
      .from(PANAMA_TABLE)
      .update({
        pa_freshness_status: status,
        pa_freshness_checked_at: checkedAt,
      })
      .eq("id", rowId);
    if (error !== null) {
      console.error(
        `[freshness] UPDATE 실패 id=${rowId}: ${error.message}`,
      );
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[freshness] UPDATE 예외 id=${rowId}: ${msg}`);
  }
}

/**
 * 제품별 panama 행에 대해 Haiku 배치 판정 후 DB만 갱신 (분석 응답을 블로킹하지 않음)
 */
export async function runFreshnessCheckInBackground(
  rows: readonly PanamaRow[],
): Promise<void> {
  const withId = rows.filter(
    (r): r is PanamaRow & { id: string } =>
      typeof r.id === "string" && r.id !== "",
  );
  const toCheck = withId.filter((row) => !shouldSkipFreshnessCheck(row));
  if (toCheck.length === 0) {
    return;
  }

  const inputs: FreshnessInput[] = toCheck.map((row) => ({
    source: row.pa_source ?? "unknown",
    collectedAt:
      row.crawled_at !== null &&
      row.crawled_at !== undefined &&
      row.crawled_at !== ""
        ? row.crawled_at
        : new Date().toISOString(),
    itemCollectedAt:
      row.pa_item_collected_at !== null &&
      row.pa_item_collected_at !== undefined &&
      row.pa_item_collected_at !== ""
        ? row.pa_item_collected_at
        : null,
    refreshCycle: coerceRefreshCycle(row),
    paNotes: parsePaNotesRecord(row.pa_notes),
    valueDescription: buildValueDescription(row),
  }));

  console.info(
    `[freshness] batchCheckFreshness 호출: ${String(toCheck.length)}행`,
  );

  const results = await batchCheckFreshness(inputs);
  const now = new Date().toISOString();

  await Promise.all(
    toCheck.map((row, idx) => {
      const r = results[idx];
      if (r === undefined) {
        return Promise.resolve();
      }
      return updatePanamaFreshnessStatus(row.id, r.status, now);
    }),
  );
}
