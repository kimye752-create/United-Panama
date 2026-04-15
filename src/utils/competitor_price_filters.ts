/**
 * Super Xtra·Colombia 공통 — USD 단가 상한·Omethyl 건기식 블랙리스트
 */

/** product_id → 허용 max USD (정/캡슐/디바이스 단가, 미정의면 상한 없음) */
export const USD_UNIT_PRICE_CAP_BY_PRODUCT: Readonly<
  Partial<Record<string, number>>
> = {
  // Rosumeg / Atmeg — 스타틴
  "2504d79b-c2ce-4660-9ea7-5576c8bb755f": 5.0,
  "859e60f9-8544-43b3-a6a0-f6c7529847eb": 5.0,
  // Omethyl
  "f88b87b8-c0ab-4f6e-ba34-e9330d1d4e18": 3.0,
  // Ciloduo
  "fcae4399-aa80-4318-ad55-89d6401c10a9": 3.0,
  // Gastiin CR
  "24738c3b-3a5b-40a9-9e8e-889ec075b453": 5.0,
  // Sereterol — 디바이스
  "014fd4d2-dc66-4fc1-8d4f-59695183387f": 80.0,
};

const OMETHYL_BLACKLIST_SUBSTR = [
  "nordic",
  "naturals",
  "natural systems",
  "gnc",
  "solgar",
  "nature made",
  "fish oil",
  "triple omega",
  "multivitamina",
  "suplemento",
  "vitamina",
] as const;

/** Omethyl 전용: 상품명에 건기식 브랜드·키워드 포함 시 SKIP */
export function isOmethylSupplementBlacklistProductName(
  productName: string,
): boolean {
  const n = productName
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
  for (const frag of OMETHYL_BLACKLIST_SUBSTR) {
    if (n.includes(frag)) {
      return true;
    }
  }
  return false;
}

/** USD 단가가 해당 제품 상한 초과면 true (상한 없으면 false) */
export function exceedsUsdUnitCap(
  productId: string,
  priceUsd: number,
): boolean {
  const cap = USD_UNIT_PRICE_CAP_BY_PRODUCT[productId];
  if (cap === undefined) {
    return false;
  }
  return priceUsd > cap;
}

/** ATC·설명으로 PanamaCompra PDF 품목 → product_id */
const ID_ROSUMEG = "2504d79b-c2ce-4660-9ea7-5576c8bb755f";
const ID_ATMEG = "859e60f9-8544-43b3-a6a0-f6c7529847eb";
const ID_OMETHYL = "f88b87b8-c0ab-4f6e-ba34-e9330d1d4e18";
const ID_CILODUO = "fcae4399-aa80-4318-ad55-89d6401c10a9";
const ID_GASTIIN = "24738c3b-3a5b-40a9-9e8e-889ec075b453";
const ID_SERETEROL = "014fd4d2-dc66-4fc1-8d4f-59695183387f";
const ID_GADVOA = "895f49ae-6ce3-44a3-93bd-bb77e027ba59";
const ID_HYDRINE = "bdfc9883-6040-438a-8e7a-df01f1230682";

function normBlob(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

/**
 * 공공조달 품목 설명·ATC로 신 8제품 중 1개 UUID 귀속 (없으면 null)
 * ATC4(예: C10AA) 우선, 세부 코드·설명으로 Rosumeg/Atmeg 분기
 */
export function resolvePanamaCompraProduct(
  descripcion: string,
  atcCode: string,
): string | null {
  const atc = atcCode.trim().toUpperCase();
  const d = normBlob(descripcion);

  if (atc.startsWith("C10AA07")) {
    return ID_ROSUMEG;
  }
  if (atc.startsWith("C10AA05")) {
    return ID_ATMEG;
  }
  if (atc.startsWith("C10AA")) {
    if (d.includes("rosuvastat")) {
      return ID_ROSUMEG;
    }
    if (d.includes("atorvastat")) {
      return ID_ATMEG;
    }
    return null;
  }
  if (atc.startsWith("C10AX")) {
    return ID_OMETHYL;
  }
  if (atc.startsWith("B01AC")) {
    return ID_CILODUO;
  }
  if (atc.startsWith("A03FA")) {
    return ID_GASTIIN;
  }
  if (atc.startsWith("R03AK")) {
    return ID_SERETEROL;
  }
  if (atc.startsWith("V08CA")) {
    return ID_GADVOA;
  }
  if (atc.startsWith("L01XX")) {
    return ID_HYDRINE;
  }

  if (d.includes("rosuvastat")) {
    return ID_ROSUMEG;
  }
  if (d.includes("atorvastat")) {
    return ID_ATMEG;
  }
  if (d.includes("cilostazol")) {
    return ID_CILODUO;
  }
  if (d.includes("mosaprida")) {
    return ID_GASTIIN;
  }
  if (d.includes("salmeterol") && d.includes("fluticasona")) {
    return ID_SERETEROL;
  }
  if (d.includes("salmeterol") || d.includes("fluticasona")) {
    return ID_SERETEROL;
  }
  if (d.includes("gadobutrol")) {
    return ID_GADVOA;
  }
  if (
    d.includes("hidroxiurea") ||
    d.includes("hidroxicarbamida") ||
    d.includes("hydroxyurea")
  ) {
    return ID_HYDRINE;
  }
  if (d.includes("esteres etilicos") || d.includes("acidos grasos omega")) {
    return ID_OMETHYL;
  }

  return null;
}
