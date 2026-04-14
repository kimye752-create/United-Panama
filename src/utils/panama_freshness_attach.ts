/**
 * panama INSERT 직전 — pa_refresh_cycle·pa_item_collected_at 자동 보강
 */
/// <reference types="node" />

import {
  getFreshnessMetadata,
  type FreshnessMetadata,
} from "../constants/freshness_registry";
import type { PanamaPhase1InsertRow } from "./db_connector";
import type { RefreshCycle } from "../types/freshness";

const FIXED_DAY: Readonly<Record<string, string>> = {
  "1904-01-01": "1904-01-01T12:00:00.000Z",
  "2023-06-28": "2023-06-28T12:00:00.000Z",
  "2021-03-01": "2021-03-01T12:00:00.000Z",
  "2024-12-31": "2024-12-31T12:00:00.000Z",
  "2026-01-01": "2026-01-01T12:00:00.000Z",
};

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

function tryParseNotesJson(
  paNotes: unknown,
): Record<string, unknown> | null {
  if (typeof paNotes !== "string") {
    return null;
  }
  const t = paNotes.trim();
  if (!t.startsWith("{")) {
    return null;
  }
  try {
    const v: unknown = JSON.parse(t);
    if (typeof v === "object" && v !== null && !Array.isArray(v)) {
      return v as Record<string, unknown>;
    }
  } catch {
    return null;
  }
  return null;
}

/** YYYY-MM → 월초 UTC 정오 */
function isoFromPublicationMonth(ym: string): string | null {
  const m = ym.trim().match(/^(\d{4})-(\d{2})$/);
  if (m === null) {
    return null;
  }
  return `${m[1]}-${m[2]}-01T12:00:00.000Z`;
}

function normalizeIsoDateString(raw: string): string | null {
  const t = raw.trim();
  if (t === "") {
    return null;
  }
  const parsed = Date.parse(t);
  if (Number.isNaN(parsed)) {
    return null;
  }
  return new Date(parsed).toISOString();
}

/** 거시 notes 텍스트에서 연도 후보 추출 → 해당 연도 12-31 */
function yearEndFromMacroNotesText(notes: string): string | null {
  const paren = notes.match(/\((\d{4})\)/g);
  if (paren !== null) {
    for (const chunk of paren) {
      const y = chunk.match(/(\d{4})/);
      if (y !== null) {
        const yr = Number.parseInt(y[1] ?? "", 10);
        if (yr >= 1990 && yr <= 2100) {
          return `${String(yr)}-12-31T12:00:00.000Z`;
        }
      }
    }
  }
  return null;
}

function extractFromNotes(
  paSource: string,
  notesObj: Record<string, unknown> | null,
  flatNotesText: string,
): string | null {
  if (notesObj !== null) {
    const pm = notesObj["publication_month"];
    if (typeof pm === "string") {
      const iso = isoFromPublicationMonth(pm);
      if (iso !== null) {
        return iso;
      }
    }
    const cd = notesObj["contract_date"];
    if (typeof cd === "string") {
      const n = normalizeIsoDateString(cd);
      if (n !== null) {
        return n;
      }
    }
    const meta = notesObj["metadata"];
    if (typeof meta === "object" && meta !== null && !Array.isArray(meta)) {
      const collected = (meta as Record<string, unknown>)["collected_at"];
      if (typeof collected === "string") {
        const n = normalizeIsoDateString(collected);
        if (n !== null) {
          return n;
        }
      }
    }
  }
  if (
    paSource === "worldbank" ||
    paSource === "worldbank_who_ghed" ||
    paSource === "who_paho"
  ) {
    const y = yearEndFromMacroNotesText(flatNotesText);
    if (y !== null) {
      return y;
    }
  }
  return null;
}

function hintToIsoOrNull(
  hint: string,
  notesObj: Record<string, unknown> | null,
  flatNotes: string,
  crawledAt: string,
  paSource: string,
): string | null {
  void crawledAt;
  if (hint === "crawled_at 폴백") {
    return null;
  }
  const fromNotes = extractFromNotes(paSource, notesObj, flatNotes);
  if (fromNotes !== null) {
    return fromNotes;
  }
  const direct = hint.trim().match(/^(\d{4}-\d{2}-\d{2})$/);
  if (direct !== null) {
    const key = direct[1] ?? "";
    const fixed = FIXED_DAY[key];
    if (fixed !== undefined) {
      return fixed;
    }
    return `${key}T12:00:00.000Z`;
  }
  if (hint.includes("12-31")) {
    const y = yearEndFromMacroNotesText(flatNotes);
    if (y !== null) {
      return y;
    }
  }
  return null;
}

function mergeNotesFallbackFlag(
  paNotes: unknown,
  useFallback: boolean,
): string | undefined {
  if (!useFallback) {
    return typeof paNotes === "string" ? paNotes : undefined;
  }
  const base = tryParseNotesJson(paNotes) ?? {};
  base.item_collected_at_fallback = true;
  if (
    typeof paNotes === "string" &&
    paNotes.trim() !== "" &&
    !paNotes.trim().startsWith("{")
  ) {
    base.notes_plain = paNotes.slice(0, 2000);
  }
  return JSON.stringify(base);
}

/**
 * INSERT 행에 pa_refresh_cycle·pa_item_collected_at·(필요 시) pa_notes 보강
 */
export function applyPanamaFreshnessToInsertRow(
  row: PanamaPhase1InsertRow,
): PanamaPhase1InsertRow {
  const paSource =
    typeof row.pa_source === "string" ? row.pa_source : "unknown";
  const meta: FreshnessMetadata = getFreshnessMetadata(paSource);
  const crawledAt =
    typeof row.crawled_at === "string" ? row.crawled_at : "";

  const existingCycle = row["pa_refresh_cycle"];
  const existingItem = row["pa_item_collected_at"];

  let cycleOut: RefreshCycle =
    typeof existingCycle === "string" && isRefreshCycle(existingCycle)
      ? existingCycle
      : meta.refreshCycle;

  const notesStr =
    typeof row.pa_notes === "string" ? row.pa_notes : "";
  const notesObj = tryParseNotesJson(row.pa_notes);

  let itemOut: string | null =
    typeof existingItem === "string" && existingItem !== ""
      ? existingItem
      : null;

  let usedFallback = false;
  if (itemOut === null) {
    const hinted = hintToIsoOrNull(
      meta.itemCollectedAtHint,
      notesObj,
      notesStr,
      crawledAt,
      paSource,
    );
    if (hinted !== null) {
      itemOut = hinted;
    } else {
      itemOut = crawledAt !== "" ? crawledAt : null;
      usedFallback = true;
    }
  }

  let nextNotes: string | undefined =
    typeof row.pa_notes === "string" ? row.pa_notes : undefined;
  if (usedFallback) {
    const merged = mergeNotesFallbackFlag(row.pa_notes, true);
    if (merged !== undefined) {
      nextNotes = merged;
    }
  }

  const out: PanamaPhase1InsertRow = {
    ...row,
    pa_refresh_cycle: cycleOut,
    pa_item_collected_at: itemOut,
  };
  if (nextNotes !== undefined) {
    out.pa_notes = nextNotes;
  }
  return out;
}
