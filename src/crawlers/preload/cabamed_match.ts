/**
 * CABAMED XLSX 행 → 자사/경쟁품 매칭 (순수 로직, UI 없음)
 * 세션 18/19: M01AB 국소 제형 제외, DEXTROMETORFANO 키워드 제외(R05 혼선 방지)
 */
/// <reference types="node" />

import type { ProductMaster } from "../../utils/product-dictionary.js";
import { findProductByPanamaText, TARGET_PRODUCTS } from "../../utils/product-dictionary.js";

/** M01AB 경쟁품 매칭 시 국소 제형 제외 */
const EXCLUDED_FORMS_M01AB = [
  "GEL",
  "TÓPICO",
  "TROPICO",
  "CREMA",
  "POMADA",
] as const;

const DEXTROMETORFANO = "DEXTROMETORFANO";

export type CabamedRowParsed = {
  itemNo: number | null;
  descripcion: string;
  refPromedio: number | null;
  genPromedio: number | null;
  raw: readonly string[];
};

/** 자사 직접 매칭 결과 */
export type SelfMatch = {
  kind: "self";
  product: ProductMaster;
};

/** ATC4 동급 경쟁품 매칭 결과 */
export type CompetitorMatch = {
  kind: "competitor";
  targetProduct: ProductMaster;
  competitorInnToken: string;
};

export type CabamedMatchResult = SelfMatch | CompetitorMatch;

/** product_id → 경쟁품 설명에 나타나는 스페인어/영문 토큰(대문자 비교) */
const COMPETITOR_TOKENS_BY_PRODUCT_ID: Readonly<
  Record<string, readonly string[]>
> = {
  // Aceclofenac M01AB — 세션 실측 3행: 디클로페낙 계열만 (이부프로펜·나프록센 제외)
  "2504d79b-c2ce-4660-9ea7-5576c8bb755f": ["DICLOFENAC", "DICLOFENACO"],
  // Rabeprazole A02BC — 실측 OMEPRAZOL·ESOMEPRAZOL
  "859e60f9-8544-43b3-a6a0-f6c7529847eb": ["ESOMEPRAZOL", "OMEPRAZOL"],
  // Erdosteine R05CB — AMBROXOL·BROMHEXINA
  "014fd4d2-dc66-4fc1-8d4f-59695183387f": ["AMBROXOL", "BROMHEXINA"],
  // Cilostazol B01AC
  "fcae4399-aa80-4318-ad55-89d6401c10a9": ["CLOPIDOGREL"],
  // Hydroxyurea L01XX — CABAMED 표본에서 경쟁품 미포함 시 빈 배열
  "bdfc9883-6040-438a-8e7a-df01f1230682": [],
  // Itopride A03FA
  "24738c3b-3a5b-40a9-9e8e-889ec075b453": [
    "METOCLOPRAMIDA",
    "DOMPERIDONA",
  ],
  // Omega-3 — 광범위 'OMEGA' 단독 매칭 제외(중복 행 방지)
  "f88b87b8-c0ab-4f6e-ba34-e9330d1d4e18": [
    "ÉSTERES ETÍLICOS",
    "ESTERES ETILICOS",
    "ÁCIDOS GRASOS",
    "ACIDOS GRASOS",
  ],
  // Levodropropizine R05DB — 코데인계와 구분, 덱스트로메토르판 명시 행 제외는 별도
  "895f49ae-6ce3-44a3-93bd-bb77e027ba59": [
    "LEVODROPROPIZINA",
    "LEVODROPROPIZINE",
    "CLOPERASTINA",
  ],
};

function normalizeUpper(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toUpperCase();
}

function isExcludedM01abTopical(descUpper: string): boolean {
  return EXCLUDED_FORMS_M01AB.some((f) => descUpper.includes(f));
}

/**
 * 한 행에 대해 자사 또는 경쟁품(단일) 매칭 시도 — 우선 자사, 다음 경쟁품
 */
export function matchCabamedRow(desc: string): CabamedMatchResult | null {
  const u = normalizeUpper(desc);
  if (u.includes(normalizeUpper(DEXTROMETORFANO))) {
    return null;
  }

  /** findProductByPanamaText는 키워드·INN 부분일치 시에만 반환 */
  const matchedSelf = findProductByPanamaText(desc);
  if (matchedSelf !== undefined) {
    return { kind: "self", product: matchedSelf };
  }

  for (const p of TARGET_PRODUCTS) {
    const tokens = COMPETITOR_TOKENS_BY_PRODUCT_ID[p.product_id];
    if (tokens === undefined || tokens.length === 0) {
      continue;
    }
    const pid = p.product_id;
    const isM01ab = pid === "2504d79b-c2ce-4660-9ea7-5576c8bb755f";
    if (isM01ab && isExcludedM01abTopical(u)) {
      continue;
    }
    for (const tok of tokens) {
      if (tok !== "" && u.includes(normalizeUpper(tok))) {
        return {
          kind: "competitor",
          targetProduct: p,
          competitorInnToken: tok,
        };
      }
    }
  }

  return null;
}

/**
 * 표시용 가격: Gen Promedio 우선, 없으면 Ref Promedio
 */
export function pickRetailPrice(
  refPromedio: number | null,
  genPromedio: number | null,
): number | null {
  if (genPromedio !== null && Number.isFinite(genPromedio)) {
    return genPromedio;
  }
  if (refPromedio !== null && Number.isFinite(refPromedio)) {
    return refPromedio;
  }
  return null;
}
