/**
 * D2 작업 — product_id UUID 정책 확정
 * 한 번 발급 후 절대 변경 금지.
 * 이 값이 모든 panama 테이블의 product_id 기준이 됨.
 * 변경 시 기존 적재 데이터 전부 무효화됨.
 *
 * 발급 일시: 2026-04-11 (crypto.randomUUID() v4)
 */

export interface ProductMaster {
  product_id: string;
  kr_brand_name: string;
  who_inn_en: string;
  /** Panama 현지 검색 키워드 — 순차 시도, 첫 hit에서 stop */
  panama_search_keywords: string[];
}

// ─────────────────────────────────────────────────
// 거시 데이터 전용 UUID
// WorldBank, ITA, KOTRA, MOTIE, 일부 PubMed 거시 지표에 사용
// ─────────────────────────────────────────────────
export const MACRO_PRODUCT_ID = "ba6cf610-9d7c-4fb9-9506-eabd7a5457b8" as const;

// ─────────────────────────────────────────────────
// 8종 자사 제품 UUID 매핑
// ─────────────────────────────────────────────────
export const TARGET_PRODUCTS: readonly ProductMaster[] = [
  {
    product_id: "bdfc9883-6040-438a-8e7a-df01f1230682",
    kr_brand_name: "하이드린 캡슐",
    who_inn_en: "Hydroxyurea",
    panama_search_keywords: ["Hidroxiurea", "Hidroxicarbamida"],
  },
  {
    product_id: "fcae4399-aa80-4318-ad55-89d6401c10a9",
    kr_brand_name: "실로스탄 CR정",
    who_inn_en: "Cilostazol",
    panama_search_keywords: ["Cilostazol"],
  },
  {
    product_id: "24738c3b-3a5b-40a9-9e8e-889ec075b453",
    kr_brand_name: "가스티인 CR정",
    who_inn_en: "Itopride",
    panama_search_keywords: ["Itoprida"],
  },
  {
    product_id: "2504d79b-c2ce-4660-9ea7-5576c8bb755f",
    kr_brand_name: "클란자 CR정",
    who_inn_en: "Aceclofenac",
    panama_search_keywords: ["Aceclofenaco"],
  },
  {
    product_id: "859e60f9-8544-43b3-a6a0-f6c7529847eb",
    kr_brand_name: "라베맥스 정",
    who_inn_en: "Rabeprazole",
    panama_search_keywords: ["Rabeprazol"],
  },
  {
    product_id: "014fd4d2-dc66-4fc1-8d4f-59695183387f",
    kr_brand_name: "에르도스테인 캡슐",
    who_inn_en: "Erdosteine",
    panama_search_keywords: ["Erdosteina"],
  },
  {
    product_id: "f88b87b8-c0ab-4f6e-ba34-e9330d1d4e18",
    kr_brand_name: "오메가-3 연질캡슐",
    who_inn_en: "Omega-3-acid ethyl esters",
    panama_search_keywords: ["Omega 3", "Omega-3", "Ésteres etílicos"],
  },
  {
    product_id: "895f49ae-6ce3-44a3-93bd-bb77e027ba59",
    kr_brand_name: "레보틱스 시럽 90mg",
    who_inn_en: "Levodropropizine",
    panama_search_keywords: [
      "Levodropropizine",
      "Levodropropizina",
      "레보틱스",
    ],
  },
] as const;

// ─────────────────────────────────────────────────
// 헬퍼 함수
// ─────────────────────────────────────────────────

/** WHO INN(영문)으로 제품 찾기 — 대소문자 무관 */
export function findProductByInn(inn: string): ProductMaster | undefined {
  const normalized = inn.toLowerCase();
  return TARGET_PRODUCTS.find(
    (p) => p.who_inn_en.toLowerCase() === normalized,
  );
}

/** product_id(UUID)로 제품 찾기 */
export function findProductById(id: string): ProductMaster | undefined {
  return TARGET_PRODUCTS.find((p) => p.product_id === id);
}

/** Panama 검색 키워드로 제품 역매핑 */
export function findProductByKeyword(keyword: string): ProductMaster | undefined {
  const normalized = keyword.toLowerCase();
  return TARGET_PRODUCTS.find((p) =>
    p.panama_search_keywords.some((k) => k.toLowerCase() === normalized),
  );
}

/**
 * Panama 현지 텍스트(품목 설명·분류 등)에 어떤 `panama_search_keywords`가
 * 부분 일치하면 해당 제품을 반환합니다. (대소문자 무시, 첫 매칭 제품 우선)
 */
export function findProductByPanamaText(blob: string): ProductMaster | undefined {
  const lower = blob.trim().toLowerCase();
  if (lower === "") {
    return undefined;
  }
  for (const p of TARGET_PRODUCTS) {
    for (const kw of p.panama_search_keywords) {
      if (lower.includes(kw.trim().toLowerCase())) {
        return p;
      }
    }
  }
  /** OCDS 본문에 WHO INN(영문)만 노출되는 경우 — 실측에서 ES 키워드 0건 구간 존재 */
  for (const p of TARGET_PRODUCTS) {
    const inn = p.who_inn_en.trim().toLowerCase();
    if (inn !== "" && lower.includes(inn)) {
      return p;
    }
  }
  return undefined;
}