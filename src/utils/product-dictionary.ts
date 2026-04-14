/**
 * D2 작업 — product_id UUID 정책 확정
 * 세션 19 긴급 수정 (2026-04-14):
 * 기존 8개 제품 정보가 실제 유나이티드 제품 포트폴리오와 불일치
 * 발견되어 전면 교체. UUID는 그대로 재사용.
 * 근거: 유나이티드_8개제품_분석.docx
 */

export interface ProductMaster {
  product_id: string;
  kr_brand_name: string;
  who_inn_en: string;
  atc4_code: string;
  secondary_atc4?: string;
  is_combination_drug?: boolean;
  hs_code: string;
  therapeutic_area: string;
  formulation: string;
  patent_tech?: string;
  panama_target: boolean;
  panama_search_keywords: string[];
}

export const MACRO_PRODUCT_ID = "ba6cf610-9d7c-4fb9-9506-eabd7a5457b8" as const;

export const TARGET_PRODUCTS: readonly ProductMaster[] = [
  {
    product_id: "bdfc9883-6040-438a-8e7a-df01f1230682",
    kr_brand_name: "Hydrine",
    who_inn_en: "Hydroxyurea",
    atc4_code: "L01XX",
    hs_code: "3004.90.1000",
    therapeutic_area: "종양학 (항암)",
    formulation: "Cap.",
    panama_target: false,
    panama_search_keywords: ["Hidroxiurea", "Hidroxicarbamida", "Hydroxyurea"],
  },
  {
    product_id: "fcae4399-aa80-4318-ad55-89d6401c10a9",
    kr_brand_name: "Ciloduo",
    who_inn_en: "Cilostazol + Rosuvastatin",
    atc4_code: "B01AC",
    secondary_atc4: "C10AA",
    is_combination_drug: true,
    hs_code: "3004.90",
    therapeutic_area: "순환기 (항혈전+고지혈증)",
    formulation: "Tab.",
    panama_target: false,
    panama_search_keywords: [
      "Cilostazol",
      "Rosuvastatina",
      "Rosuvastatin",
      "Atorvastatina",
      "Simvastatina",
      "Clopidogrel",
      "Acetilsalicilico",
    ],
  },
  {
    product_id: "24738c3b-3a5b-40a9-9e8e-889ec075b453",
    kr_brand_name: "Gastiin CR",
    who_inn_en: "Mosapride Citrate",
    atc4_code: "A03FA",
    hs_code: "3004.90",
    therapeutic_area: "소화기 (기능성 소화불량)",
    formulation: "Tab. CR (BILDAS)",
    patent_tech: "BILDAS (Controlled Release)",
    panama_target: false,
    panama_search_keywords: [
      "Mosaprida",
      "Mosapride",
      "Itoprida",
      "Domperidona",
      "Metoclopramida",
    ],
  },
  {
    product_id: "2504d79b-c2ce-4660-9ea7-5576c8bb755f",
    kr_brand_name: "Rosumeg Combigel",
    who_inn_en: "Rosuvastatin + Omega-3-acid ethyl esters",
    atc4_code: "C10AA",
    secondary_atc4: "C10AX",
    is_combination_drug: true,
    hs_code: "3004.90",
    therapeutic_area: "순환기 (고지혈증)",
    formulation: "Soft Cap.",
    patent_tech: "CombiGel",
    panama_target: true,
    panama_search_keywords: [
      "Rosuvastatina",
      "Rosuvastatin",
      "Atorvastatina",
      "Atorvastatin",
      "Simvastatina",
      "Simvastatin",
      "Lovastatina",
      "Pravastatina",
      "Omega 3",
      "Omega-3",
      "Ésteres etílicos",
    ],
  },
  {
    product_id: "859e60f9-8544-43b3-a6a0-f6c7529847eb",
    kr_brand_name: "Atmeg Combigel",
    who_inn_en: "Atorvastatin + Omega-3-acid ethyl esters",
    atc4_code: "C10AA",
    secondary_atc4: "C10AX",
    is_combination_drug: true,
    hs_code: "3004.90",
    therapeutic_area: "순환기 (고지혈증)",
    formulation: "Soft Cap.",
    patent_tech: "CombiGel",
    panama_target: false,
    panama_search_keywords: [
      "Atorvastatina",
      "Atorvastatin",
      "Rosuvastatina",
      "Simvastatina",
      "Omega 3",
      "Omega-3",
    ],
  },
  {
    product_id: "014fd4d2-dc66-4fc1-8d4f-59695183387f",
    kr_brand_name: "Sereterol Activair",
    who_inn_en: "Salmeterol + Fluticasone",
    atc4_code: "R03AK",
    is_combination_drug: true,
    hs_code: "3004.90",
    therapeutic_area: "호흡기 (천식/COPD)",
    formulation: "Inhaler DPI",
    patent_tech: "Activair DPI",
    panama_target: false,
    panama_search_keywords: [
      "Salmeterol",
      "Fluticasona",
      "Fluticasone",
      "Budesonida",
      "Formoterol",
      "Beclometasona",
      "Mometasona",
    ],
  },
  {
    product_id: "f88b87b8-c0ab-4f6e-ba34-e9330d1d4e18",
    kr_brand_name: "Omethyl Cutielet",
    who_inn_en: "Omega-3-acid ethyl esters",
    atc4_code: "C10AX",
    hs_code: "3004.90",
    therapeutic_area: "순환기 (고중성지방)",
    formulation: "Pouch (Seamless)",
    patent_tech: "Seamless Pouch",
    panama_target: true,
    panama_search_keywords: [
      "Omega 3",
      "Omega-3",
      "Ésteres etílicos",
      "Omacor",
      "Lovaza",
    ],
  },
  {
    product_id: "895f49ae-6ce3-44a3-93bd-bb77e027ba59",
    kr_brand_name: "Gadvoa Inj.",
    who_inn_en: "Gadobutrol",
    atc4_code: "V08CA",
    hs_code: "3006.30",
    therapeutic_area: "영상진단 (MRI 조영)",
    formulation: "PFS 주사",
    panama_target: false,
    panama_search_keywords: [
      "Gadobutrol",
      "Gadolinio",
      "Gadoteridol",
      "Gadopentetato",
      "medio de contraste",
    ],
  },
] as const;

export function findProductByInn(inn: string): ProductMaster | undefined {
  const normalized = inn.toLowerCase();
  return TARGET_PRODUCTS.find(
    (p) => p.who_inn_en.toLowerCase() === normalized,
  );
}

export function findProductById(id: string): ProductMaster | undefined {
  return TARGET_PRODUCTS.find((p) => p.product_id === id);
}

export function findProductByKeyword(keyword: string): ProductMaster | undefined {
  const normalized = keyword.toLowerCase();
  return TARGET_PRODUCTS.find((p) =>
    p.panama_search_keywords.some((k) => k.toLowerCase() === normalized),
  );
}

export function findProductByPanamaText(blob: string): ProductMaster | undefined {
  const lower = blob.trim().toLowerCase();
  if (lower === "") {
    return undefined;
  }
  for (const product of TARGET_PRODUCTS) {
    for (const keyword of product.panama_search_keywords) {
      if (lower.includes(keyword.trim().toLowerCase())) {
        return product;
      }
    }
  }
  for (const product of TARGET_PRODUCTS) {
    const inn = product.who_inn_en.trim().toLowerCase();
    if (inn !== "" && lower.includes(inn)) {
      return product;
    }
  }
  return undefined;
}

export function getPanamaTargetProducts(): ProductMaster[] {
  return TARGET_PRODUCTS.filter((p) => p.panama_target);
}
