/**
 * LLM generateReport1용 Supabase 데이터 압축 텍스트 (순수 로직)
 */
import { getFreshnessMetadata } from "../constants/freshness_registry";
import type { RefreshCycle } from "../types/freshness";
import type { AnalyzePanamaResult } from "./panama_analysis";
import type { PanamaRow } from "./fetch_panama_data";
import {
  freshnessDigestLayer,
  ruleBasedFreshnessStatus,
} from "./freshness_rules";
import { getPahoRegionalReferenceLine } from "./paho_reference_prices";
import { resolvePrevalenceMetric } from "./prevalence_resolve";

const DIGEST_MAX = 8000;

function digestTaggedLine(
  kind: "macro" | "price",
  r: PanamaRow,
  notesSnippet: string,
): string {
  const src = r.pa_source ?? "";
  const meta = getFreshnessMetadata(src);
  const cycle: RefreshCycle =
    (r.pa_refresh_cycle as RefreshCycle | undefined) ?? meta.refreshCycle;
  const itemRaw = r.pa_item_collected_at ?? r.crawled_at ?? "";
  const status = ruleBasedFreshnessStatus(
    itemRaw === "" ? null : itemRaw,
    cycle,
    new Date(),
  );
  const layer = freshnessDigestLayer(meta);
  const itemShort = itemRaw === "" ? "unknown" : itemRaw.slice(0, 10);
  return `[${layer}][${status}] [${kind} ${src}] 원본 ${itemShort} 주기 ${cycle} ${notesSnippet}`;
}

/**
 * pa_notes 역학 추출 — DB만(시드 폴백 없음). 없으면 빈 문자열.
 */
export function extractPrevalenceMetric(
  productId: string,
  priceRows: readonly PanamaRow[],
  macroRows: readonly PanamaRow[],
): string {
  return resolvePrevalenceMetric(productId, priceRows, macroRows);
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
    const notes = (r.pa_notes ?? "").slice(0, 260);
    parts.push(digestTaggedLine("macro", r, notes));
  }
  for (const r of result.priceRows.slice(0, 35)) {
    const typ = r.pa_price_type ?? "";
    const notes = (r.pa_notes ?? "").slice(0, 140);
    parts.push(
      digestTaggedLine("price", r, `type=${typ} ${notes}`),
    );
  }

  let s = parts.join("\n");
  if (s.length > DIGEST_MAX) {
    s = s.slice(0, DIGEST_MAX);
  }
  return s;
}
