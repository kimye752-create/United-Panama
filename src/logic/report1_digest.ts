/**
 * LLM generateReport1용 Supabase 데이터 압축 텍스트 (순수 로직)
 */
import type { AnalyzePanamaResult } from "./panama_analysis";
import type { PanamaRow } from "./fetch_panama_data";

const DIGEST_MAX = 8000;

/** pa_notes에 prevalence 시드가 있으면 한 줄 추출 */
export function extractPrevalenceMetric(
  rows: readonly PanamaRow[],
): string | null {
  for (const r of rows) {
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
