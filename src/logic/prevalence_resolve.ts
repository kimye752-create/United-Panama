/**
 * 역학(prevalence) 문자열 — 동일 product_id 행만, 시드 폴백 없음(빈 문자열).
 */
import type { PanamaRow } from "./fetch_panama_data";

const MAX_LEN = 400;

function sliceNotes(n: string): string {
  const t = n.trim();
  return t.length > MAX_LEN ? t.slice(0, MAX_LEN) : t;
}

/** pa_notes가 역학 지표 행인지 (product_id는 호출부에서 필터) */
export function isPrevalencePaNotes(n: string): boolean {
  const low = n.toLowerCase();
  return (
    n.includes("유병률") ||
    n.includes("발병률") ||
    n.includes("감염률") ||
    low.includes("prevalence") ||
    low.includes("incidencia") ||
    n.includes("마른기침")
  );
}

/**
 * Supabase에서 해당 품목 역학 1건 — 없으면 빈 문자열(다른 INN·거시 행 폴백 금지).
 */
export function resolvePrevalenceMetric(
  productId: string,
  priceRows: readonly PanamaRow[],
  macroRows: readonly PanamaRow[],
): string {
  const combined: readonly PanamaRow[] = [...priceRows, ...macroRows];
  for (const r of combined) {
    if (r.product_id !== productId) {
      continue;
    }
    const n = r.pa_notes;
    if (n === undefined || n === null || n === "") {
      continue;
    }
    if (isPrevalencePaNotes(n)) {
      return sliceNotes(n);
    }
  }
  return "";
}
