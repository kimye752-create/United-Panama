/**
 * Super Xtra VTEX 상품명·설명 → 포트폴리오 product_id (단일 귀속)
 * findProductByPanamaText의 키워드 순서 의존 문제를 제거하기 위한 우선순위 룰
 */
import { findProductById } from "./product-dictionary.js";

/** product-dictionary.ts UUID와 반드시 동일 */
const ID_ROSUMEG = "2504d79b-c2ce-4660-9ea7-5576c8bb755f";
const ID_ATMEG = "859e60f9-8544-43b3-a6a0-f6c7529847eb";
const ID_CILODUO = "fcae4399-aa80-4318-ad55-89d6401c10a9";
const ID_OMETHYL = "f88b87b8-c0ab-4f6e-ba34-e9330d1d4e18";
const ID_GASTIIN = "24738c3b-3a5b-40a9-9e8e-889ec075b453";
const ID_SERETEROL = "014fd4d2-dc66-4fc1-8d4f-59695183387f";
const ID_GADVOA = "895f49ae-6ce3-44a3-93bd-bb77e027ba59";
const ID_HYDRINE = "bdfc9883-6040-438a-8e7a-df01f1230682";

/** 악센트 제거 후 소문자 (부분 일치용) */
function normalizeForMatch(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

function hasRosuvastatin(b: string): boolean {
  return b.includes("rosuvastat");
}

function hasAtorvastatin(b: string): boolean {
  return b.includes("atorvastat");
}

function hasOtherStatin(b: string): boolean {
  return (
    b.includes("simvastat") ||
    b.includes("pravastat") ||
    b.includes("lovastat") ||
    b.includes("pitavastat")
  );
}

/** 스타틴 계열 전부 (Omethyl 제외 판정용) */
function hasAnyStatin(b: string): boolean {
  return (
    hasRosuvastatin(b) || hasAtorvastatin(b) || hasOtherStatin(b)
  );
}

/**
 * 오메가·에틸에스터·브랜드 신호 (룰 1·2·9 공통)
 * 단, omeprazol 등과 혼동 없음
 */
function hasOmegaProductSignals(b: string): boolean {
  if (
    b.includes("omacor") ||
    b.includes("vascepa") ||
    b.includes("vazkepa") ||
    b.includes("lovaza")
  ) {
    return true;
  }
  if (
    b.includes("esteres etilicos") ||
    b.includes("ethyl esters") ||
    b.includes("acid ethyl esters")
  ) {
    return true;
  }
  if (b.includes("omega3") || /\bomega[- ]?3\b/.test(b)) {
    return true;
  }
  if (b.includes("omega 3")) {
    return true;
  }
  if (b.includes("acidos grasos omega") || b.includes("acidos omega")) {
    return true;
  }
  if (b.includes("trigliceridos") && b.includes("omega")) {
    return true;
  }
  return false;
}

function hasCilostazol(b: string): boolean {
  return b.includes("cilostazol");
}

/** 룰 4: 항혈소판(스페인어·브랜드) — Cilostazol 없을 때만 상위에서 호출 */
function hasAntiplateletCiloduoTier(b: string): boolean {
  return (
    b.includes("clopidogrel") ||
    b.includes("ticagrelor") ||
    b.includes("prasugrel") ||
    b.includes("ticlopidine") ||
    b.includes("antiplaquet") ||
    b.includes("antiagregante") ||
    b.includes("plavix") ||
    b.includes("brilinta")
  );
}

function hasGastiinSignals(b: string): boolean {
  return (
    b.includes("mosaprida") ||
    b.includes("mosapride") ||
    b.includes("itoprida") ||
    b.includes("domperidona") ||
    b.includes("metoclopramida") ||
    b.includes("cinitaprida")
  );
}

function hasSereterolSignals(b: string): boolean {
  return (
    b.includes("salmeterol") ||
    b.includes("fluticasona") ||
    b.includes("fluticasone") ||
    b.includes("budesonida") ||
    b.includes("formoterol") ||
    b.includes("beclometasona") ||
    b.includes("mometasona") ||
    b.includes("vilanterol")
  );
}

function hasGadvoaSignals(b: string): boolean {
  return (
    b.includes("gadobutrol") ||
    b.includes("gadolinio") ||
    b.includes("gadoteridol") ||
    b.includes("gadopentetato") ||
    b.includes("gadoterat") ||
    b.includes("dotarem") ||
    b.includes("gadovist") ||
    b.includes("gadavist")
  );
}

function hasHydrineSignals(b: string): boolean {
  return (
    b.includes("hidroxiurea") ||
    b.includes("hidroxicarbamida") ||
    b.includes("hydroxyurea") ||
    b.includes("hydrea") ||
    b.includes("siklos")
  );
}

/**
 * VTEX 상품명·설명을 보고 8제품 중 최대 1개 product_id에 귀속. 없으면 null.
 */
/**
 * Colombia Socrata 등 단일 텍스트 블롭(성분+상품명)용 — Super Xtra와 동일 룰
 */
export function resolveCompetitorProduct(combinedText: string): string | null {
  return resolveSuperXtraProduct(combinedText, "");
}

export function resolveSuperXtraProduct(
  productName: string,
  description: string,
): string | null {
  const b = normalizeForMatch(`${productName}\n${description}`);

  // 1 조합: Rosuvastatin + Omega
  if (hasRosuvastatin(b) && hasOmegaProductSignals(b)) {
    return ID_ROSUMEG;
  }
  // 2 조합: Atorvastatin + Omega
  if (hasAtorvastatin(b) && hasOmegaProductSignals(b)) {
    return ID_ATMEG;
  }
  // 3 Cilostazol
  if (hasCilostazol(b)) {
    return ID_CILODUO;
  }
  // 4 항혈소판 (Cilostazol 없음)
  if (!hasCilostazol(b) && hasAntiplateletCiloduoTier(b)) {
    return ID_CILODUO;
  }
  // 5 Rosuvastatina 단독 (오메가 신호 없음)
  if (hasRosuvastatin(b) && !hasOmegaProductSignals(b)) {
    return ID_ROSUMEG;
  }
  // 6 Atorvastatina 단독 (오메가 신호 없음)
  if (hasAtorvastatin(b) && !hasOmegaProductSignals(b)) {
    return ID_ATMEG;
  }
  // 7 기타 스타틴 → Rosumeg (C10AA 동류)
  if (hasOtherStatin(b)) {
    return ID_ROSUMEG;
  }
  // 8 Ezetimiba
  if (b.includes("ezetimib")) {
    return ID_ROSUMEG;
  }
  // 9 Omega 단독 (스타틴 없음)
  if (!hasAnyStatin(b) && hasOmegaProductSignals(b)) {
    return ID_OMETHYL;
  }
  // 10 Gastiin CR
  if (hasGastiinSignals(b)) {
    return ID_GASTIIN;
  }
  // 11 Sereterol
  if (hasSereterolSignals(b)) {
    return ID_SERETEROL;
  }
  // 12 Gadvoa
  if (hasGadvoaSignals(b)) {
    return ID_GADVOA;
  }
  // 13 Hydrine
  if (hasHydrineSignals(b)) {
    return ID_HYDRINE;
  }

  return null;
}

/** 매칭된 product_id의 WHO INN(영문 대문자) — pa_ingredient_inn 적재용 */
export function innUpperForSuperXtraProductId(productId: string): string {
  const p = findProductById(productId);
  return p !== undefined ? p.who_inn_en.toUpperCase() : "";
}
