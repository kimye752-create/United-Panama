/**
 * LLM generateReport1용 Supabase 데이터 압축 텍스트 (순수 로직)
 */
import type { AnalyzePanamaResult } from "./panama_analysis";
import type { PanamaRow } from "./fetch_panama_data";
import { getPahoRegionalReferenceLine } from "./paho_reference_prices";

const DIGEST_MAX = 8000;

/**
 * pa_notes에 prevalence 시드 추출 — 반드시 해당 product_id 행만 사용
 * (이전: macro 전역 행·round3·epidemiology MACRO 행이 먼저 매칭되어 INN 교차오염 발생)
 */
export function extractPrevalenceMetric(
  productId: string,
  priceRows: readonly PanamaRow[],
  macroRows: readonly PanamaRow[],
): string | null {
  const combined: readonly PanamaRow[] = [...priceRows, ...macroRows];
  for (const r of combined) {
    if (r.product_id !== productId) {
      continue;
    }
    const n = r.pa_notes;
    if (n === undefined || n === null || n === "") {
      continue;
    }
    if (n.toLowerCase().includes("prevalence:")) {
      return n.length > 400 ? n.slice(0, 400) : n;
    }
  }
  return null;
}

/** 유통사 상호 — 대소문자 무시 중복 제거, 입력 순서 유지 */
export function dedupeDistributorNames(names: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of names) {
    const n = raw.trim();
    if (n === "") {
      continue;
    }
    const key = n.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(n);
  }
  return out;
}

/** generateReport1.rawDataDigest 생성 */
export function buildRawDataDigest(result: AnalyzePanamaResult): string {
  const parts: string[] = [];
  parts.push(
    `product_id=${result.product.product_id} inn=${result.product.who_inn_en} brand=${result.product.kr_brand_name}`,
  );
  parts.push(
    `case=${result.judgment.case} verdict=${result.judgment.verdict} confidence=${String(result.judgment.confidence)}`,
  );
  parts.push(
    `eml WHO=${String(result.emlWho)} PAHO=${String(result.emlPaho)} MINSA=${String(result.emlMinsa)}`,
  );
  parts.push(
    `panamacompra_count=${String(result.panamacompraCount)} private_retail=${String(result.privateRetailCount)}`,
  );

  const pahoRef = getPahoRegionalReferenceLine(result.product.who_inn_en);
  if (pahoRef !== null) {
    parts.push(`[paho_regional_price] ${pahoRef}`);
  }

  for (const r of result.macroRows.slice(0, 14)) {
    const src = r.pa_source ?? "";
    const notes = (r.pa_notes ?? "").slice(0, 260);
    parts.push(`[macro ${src}] ${notes}`);
  }
  for (const r of result.priceRows.slice(0, 35)) {
    const src = r.pa_source ?? "";
    const typ = r.pa_price_type ?? "";
    const notes = (r.pa_notes ?? "").slice(0, 140);
    parts.push(`[price ${src}] type=${typ} ${notes}`);
  }

  let s = parts.join("\n");
  if (s.length > DIGEST_MAX) {
    s = s.slice(0, DIGEST_MAX);
  }
  return s;
}
