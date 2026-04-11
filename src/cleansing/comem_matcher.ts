/**
 * 기법 ④ ComEM — 의약품명 변형 매칭 (Levenshtein + 스페인어 정규화)
 */
/// <reference types="node" />

import { TARGET_PRODUCTS, type ProductMaster } from "../utils/product-dictionary.js";

export interface MatchResult {
  productId: string | null;
  matchedKeyword: string | null;
  confidence: number;
  method: "exact" | "normalized" | "fuzzy" | "none";
}

/**
 * 스페인어권 표기 정규화: 악센트·대소문자·복수/형태어·용량 표기 완화.
 */
export function normalizeSpanish(text: string): string {
  const nfd = text.normalize("NFD").replace(/\p{M}/gu, "");
  let s = nfd.toLowerCase().trim().replace(/\s+/g, " ");
  s = s.replace(/\d+(\.\d+)?\s*(mg|mcg|g|ml)\b/gi, "").trim();
  s = s.replace(/\b(caps?|tabs?|comprimidos?|c[aá]psulas?)\b/gi, "").trim();
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array.from({ length: n + 1 }, () => 0),
  );
  for (let i = 0; i <= m; i++) {
    const row = dp[i];
    if (row !== undefined) {
      row[0] = i;
    }
  }
  for (let j = 0; j <= n; j++) {
    const row0 = dp[0];
    if (row0 !== undefined) {
      row0[j] = j;
    }
  }
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const row = dp[i];
      const prev = dp[i - 1];
      if (row === undefined || prev === undefined) {
        continue;
      }
      const del = prev[j] ?? 0;
      const ins = row[j - 1] ?? 0;
      const sub = prev[j - 1] ?? 0;
      row[j] = Math.min(del + 1, ins + 1, sub + cost);
    }
  }
  const lastRow = dp[m];
  return lastRow !== undefined ? (lastRow[n] ?? 0) : 0;
}

function candidatesForProduct(p: ProductMaster): readonly string[] {
  return [p.who_inn_en, ...p.panama_search_keywords];
}

/**
 * TARGET_PRODUCTS 순회 — exact > normalized(포함·동일) > fuzzy(거리 ≤ 3).
 *
 * 테스트(기대):
 * - "HIDROXIUREA 500MG" → Hydroxyurea UUID (bdfc9883-6040-438a-8e7a-df01f1230682)
 * - "Hidroxicarbamida caps" → 동일 UUID
 * - "Aceclofenaco 100mg tab" → Aceclofenac UUID (2504d79b-c2ce-4660-9ea7-5576c8bb755f)
 */
export function matchProductByLocalName(localName: string): MatchResult {
  const trimmed = localName.trim();
  if (trimmed === "") {
    return {
      productId: null,
      matchedKeyword: null,
      confidence: 0,
      method: "none",
    };
  }

  const tl = trimmed.toLowerCase();

  for (const p of TARGET_PRODUCTS) {
    for (const c of candidatesForProduct(p)) {
      if (tl === c.trim().toLowerCase()) {
        return {
          productId: p.product_id,
          matchedKeyword: c,
          confidence: 1,
          method: "exact",
        };
      }
    }
  }

  const nl = normalizeSpanish(trimmed);

  for (const p of TARGET_PRODUCTS) {
    for (const c of candidatesForProduct(p)) {
      const nc = normalizeSpanish(c);
      if (nl === nc || nl.startsWith(`${nc} `) || nl.startsWith(nc)) {
        return {
          productId: p.product_id,
          matchedKeyword: c,
          confidence: 0.92,
          method: "normalized",
        };
      }
    }
  }

  let best: MatchResult = {
    productId: null,
    matchedKeyword: null,
    confidence: 0,
    method: "none",
  };
  let bestDist = 4;

  for (const p of TARGET_PRODUCTS) {
    for (const c of candidatesForProduct(p)) {
      const nc = normalizeSpanish(c);
      const d = levenshteinDistance(nl, nc);
      if (d <= 3 && d < bestDist) {
        bestDist = d;
        const conf = Math.max(0.55, 1 - d * 0.12);
        best = {
          productId: p.product_id,
          matchedKeyword: c,
          confidence: conf,
          method: "fuzzy",
        };
      }
    }
  }

  return best;
}
