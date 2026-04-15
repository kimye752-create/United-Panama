/**
 * CABAMED XLSX 행 → 자사/경쟁품 매칭 (순수 로직, UI 없음)
 * 세션 20: 실제 유나이티드 8개 포트폴리오 기준 토큰 재정렬
 */
/// <reference types="node" />

import type { ProductMaster } from "../../utils/product-dictionary.js";
import { TARGET_PRODUCTS } from "../../utils/product-dictionary.js";

const DEXTROMETORFANO = "DEXTROMETORFANO";
const COMPETITOR_MATCH_PRIORITY: readonly string[] = [
  "2504d79b-c2ce-4660-9ea7-5576c8bb755f",
  "f88b87b8-c0ab-4f6e-ba34-e9330d1d4e18",
  "859e60f9-8544-43b3-a6a0-f6c7529847eb",
  "fcae4399-aa80-4318-ad55-89d6401c10a9",
  "014fd4d2-dc66-4fc1-8d4f-59695183387f",
  "24738c3b-3a5b-40a9-9e8e-889ec075b453",
  "bdfc9883-6040-438a-8e7a-df01f1230682",
  "895f49ae-6ce3-44a3-93bd-bb77e027ba59",
] as const;

const ATC4_TO_INNS: Readonly<Record<string, readonly string[]>> = {
  R03AK: ["Budesonida", "Beclometasona", "Mometasona", "Formoterol", "Indacaterol"],
  C10AA: ["Atorvastatina", "Rosuvastatina", "Simvastatina", "Lovastatina", "Pravastatina", "Fluvastatina"],
  C10AX: ["Omega 3", "Omega-3", "Ezetimiba", "Fenofibrato", "Gemfibrozilo", "Ésteres etílicos"],
  B01AC: ["Cilostazol", "Clopidogrel", "Acetilsalicilico", "Ticagrelor"],
  A03FA: ["Mosaprida", "Domperidona", "Metoclopramida", "Itoprida"],
  L01XX: ["Hidroxiurea", "Hidroxicarbamida", "Hydroxyurea"],
  V08CA: ["Gadobutrol", "Gadolinio", "Gadoteridol", "Gadopentetato"],
};

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

/** product_id → 경쟁품 설명에 나타나는 스페인어/영문 토큰(대문자 비교). ATC4 풀과 합쳐져 매칭됨 */
const COMPETITOR_TOKENS_BY_PRODUCT_ID: Readonly<
  Record<string, readonly string[]>
> = {
  // Hydrine (L01XX) — 세션21 키워드 확장
  "bdfc9883-6040-438a-8e7a-df01f1230682": [
    "HIDROXIUREA",
    "HIDROXICARBAMIDA",
    "HYDROXYUREA",
    "HYDREA",
    "SIKLOS",
  ],
  // Ciloduo (B01AC + C10AA)
  "fcae4399-aa80-4318-ad55-89d6401c10a9": [
    "CILOSTAZOL",
    "CLOPIDOGREL",
    "ASPIRINA",
    "ÁCIDO ACETILSALICÍLICO",
    "ACIDO ACETILSALICILICO",
    "ROSUVASTATINA",
    "ANTIPLAQUETARIO",
  ],
  // Gastiin CR (A03FA)
  "24738c3b-3a5b-40a9-9e8e-889ec075b453": [
    "MOSAPRIDA",
    "MOSAPRIDE",
    "ITOPRIDA",
    "ITOPRIDE",
    "DOMPERIDONA",
    "METOCLOPRAMIDA",
    "CINITAPRIDA",
    "LEVOSULPIRIDA",
  ],
  // Rosumeg Combigel (C10AA + C10AX)
  "2504d79b-c2ce-4660-9ea7-5576c8bb755f": [
    "ROSUVASTATINA",
    "ATORVASTATINA",
    "SIMVASTATINA",
    "PRAVASTATINA",
    "LOVASTATINA",
    "PITAVASTATINA",
    "EZETIMIBA",
    "EZETIMIBE",
    "OMEGA-3",
    "OMEGA 3",
    "ÉSTERES ETÍLICOS",
    "ESTERES ETILICOS",
  ],
  // Atmeg Combigel — Rosumeg와 동일 계열, ATORVASTATINA 우선 매칭되도록 선두 배치
  "859e60f9-8544-43b3-a6a0-f6c7529847eb": [
    "ATORVASTATINA",
    "ROSUVASTATINA",
    "SIMVASTATINA",
    "PRAVASTATINA",
    "LOVASTATINA",
    "PITAVASTATINA",
    "EZETIMIBA",
    "EZETIMIBE",
    "OMEGA-3",
    "OMEGA 3",
    "ÉSTERES ETÍLICOS",
    "ESTERES ETILICOS",
  ],
  // Sereterol Activair (R03AK)
  "014fd4d2-dc66-4fc1-8d4f-59695183387f": [
    "SALMETEROL",
    "FLUTICASONA",
    "FLUTICASONE",
    "BUDESONIDA",
    "FORMOTEROL",
    "BECLOMETASONA",
    "MOMETASONA",
    "VILANTEROL",
    "INHALADOR",
  ],
  // Omethyl Cutielet (C10AX)
  "f88b87b8-c0ab-4f6e-ba34-e9330d1d4e18": [
    "OMEGA-3",
    "OMEGA 3",
    "ÉSTERES ETÍLICOS",
    "ESTERES ETILICOS",
    "OMACOR",
    "LOVAZA",
    "VASCEPA",
    "ÁCIDOS GRASOS",
    "ACIDOS GRASOS",
  ],
  // Gadvoa Inj. (V08CA)
  "895f49ae-6ce3-44a3-93bd-bb77e027ba59": [
    "GADOBUTROL",
    "GADOLINIO",
    "GADOTERIDOL",
    "GADOPENTETATO",
    "GADOTERATO",
    "GADOVIST",
    "MEDIO DE CONTRASTE",
  ],
};

function normalizeUpper(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toUpperCase();
}

function buildSelfTokens(product: ProductMaster): readonly string[] {
  const fromInn = product.who_inn_en
    .split("+")
    .map((token) => token.trim())
    .filter((token) => token !== "");
  const core = [
    product.kr_brand_name,
    ...fromInn,
  ];
  return core
    .map((token) => token.trim())
    .filter((token) => token !== "");
}

function includesAnyToken(blobUpper: string, tokens: readonly string[]): boolean {
  for (const token of tokens) {
    if (token !== "" && blobUpper.includes(normalizeUpper(token))) {
      return true;
    }
  }
  return false;
}

function buildCompetitorTokens(product: ProductMaster): readonly string[] {
  const atcCodes = [product.atc4_code];
  if (
    product.secondary_atc4 !== undefined &&
    product.secondary_atc4.trim() !== ""
  ) {
    atcCodes.push(product.secondary_atc4);
  }
  const own = new Set(
    [
      product.kr_brand_name,
      product.who_inn_en,
      ...product.panama_search_keywords,
    ]
      .map((token) => normalizeUpper(token))
      .filter((token) => token !== ""),
  );
  const out = new Set<string>();
  for (const atc of atcCodes) {
    const candidate = ATC4_TO_INNS[atc] ?? [];
    for (const inn of candidate) {
      const norm = normalizeUpper(inn);
      if (norm === "") {
        continue;
      }
      if (!own.has(norm)) {
        out.add(inn);
      }
    }
  }
  return [...out];
}

/**
 * 한 행에 대해 자사 또는 경쟁품(단일) 매칭 시도 — 우선 자사, 다음 경쟁품
 */
export function matchCabamedRow(desc: string): CabamedMatchResult | null {
  const u = normalizeUpper(desc);
  if (u.includes(normalizeUpper(DEXTROMETORFANO))) {
    return null;
  }

  /** 기존 로직 보존(참고): const matchedSelf = findProductByPanamaText(desc); */
  for (const product of TARGET_PRODUCTS) {
    const selfTokens = buildSelfTokens(product);
    if (includesAnyToken(u, selfTokens)) {
      return { kind: "self", product };
    }
  }

  for (const productId of COMPETITOR_MATCH_PRIORITY) {
    const p = TARGET_PRODUCTS.find((it) => it.product_id === productId);
    if (p === undefined) {
      continue;
    }
    const fallbackTokens = COMPETITOR_TOKENS_BY_PRODUCT_ID[p.product_id] ?? [];
    const atc4Tokens = buildCompetitorTokens(p);
    const tokens = [...new Set([...atc4Tokens, ...fallbackTokens])];
    if (tokens === undefined || tokens.length === 0) {
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
