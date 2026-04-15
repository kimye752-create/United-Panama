/**
 * Super Xtra(VTEX) 검색 응답에서 가격·URL·재고 추출 (순수 함수)
 */

export type VtexProduct = Record<string, unknown>;

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) {
    return v;
  }
  return null;
}

export function vtexCommertialOffer(
  p: VtexProduct,
): Record<string, unknown> | null {
  const items = p.items;
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }
  const first = items[0] as Record<string, unknown>;
  const sellers = first.sellers;
  if (!Array.isArray(sellers) || sellers.length === 0) {
    return null;
  }
  const offer = (sellers[0] as Record<string, unknown>).commertialOffer;
  if (typeof offer !== "object" || offer === null) {
    return null;
  }
  return offer as Record<string, unknown>;
}

/** 판매가 USD (commertialOffer.Price) */
export function vtexPriceUsd(p: VtexProduct): number | null {
  return num(vtexCommertialOffer(p)?.Price);
}

/** 정가(있으면) */
export function vtexListPriceUsd(p: VtexProduct): number | null {
  return num(vtexCommertialOffer(p)?.ListPrice);
}

/** 상대 경로 slug — pa_source_url 조합용 */
export function vtexStoreSlug(p: VtexProduct): string {
  const link = p.link;
  if (typeof link === "string" && link.trim() !== "") {
    return link.replace(/^\//, "").trim();
  }
  return "";
}

export function vtexMeasurementUnit(p: VtexProduct): string {
  const items = p.items;
  if (!Array.isArray(items) || items.length === 0) {
    return "unit";
  }
  const mu = (items[0] as Record<string, unknown>).measurementUnit;
  return typeof mu === "string" && mu.trim() !== "" ? mu.trim() : "unit";
}

export function vtexProductIdString(p: VtexProduct): string {
  const id = p.productId;
  return typeof id === "number" || typeof id === "string"
    ? String(id)
    : "";
}

export function vtexAvailableQuantity(p: VtexProduct): number {
  const o = vtexCommertialOffer(p);
  if (o === null) {
    return 0;
  }
  const q = o.AvailableQuantity;
  if (typeof q === "number" && Number.isFinite(q)) {
    return q;
  }
  return 0;
}

export function vtexFirstCategoryName(p: VtexProduct): string {
  const c = p.categories;
  if (!Array.isArray(c) || c.length === 0) {
    return "";
  }
  const f = c[0];
  if (typeof f === "string") {
    return f;
  }
  if (typeof f === "object" && f !== null && "name" in f) {
    const n = (f as { name?: unknown }).name;
    return typeof n === "string" ? n : "";
  }
  return "";
}
