/**
 * URL 세그먼트 ↔ WHO INN 매핑 (USER_FLOW /panama/report/[inn])
 */
import { TARGET_PRODUCTS, type ProductMaster } from "../utils/product-dictionary";

/** 영문 INN을 URL 슬러그로 변환 */
export function whoInnToSlug(whoInn: string): string {
  return whoInn
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** 슬래그로 제품 조회 */
export function findProductByInnSlug(slug: string): ProductMaster | undefined {
  const s = slug.toLowerCase();
  return TARGET_PRODUCTS.find((p) => whoInnToSlug(p.who_inn_en) === s);
}
