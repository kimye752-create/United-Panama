import { PARTNERS } from "@/src/lib/phase3/partners-data";
import { mapHardcodedPartnerToWithPSI } from "@/src/lib/phase3/hardcoded-partner-mapper";
import { uuidToProductSlug } from "@/src/lib/phase3/product-uuid-to-slug";
import type { PartnerWithPSI } from "./types";

export interface Phase3PartnerFetchResult {
  partners: PartnerWithPSI[];
  error: string | null;
}

/**
 * 20사 파트너 데이터 로드 — 로컬 하드코딩 `PARTNERS` (Supabase 테이블 불필요)
 * 8제품×20사 매칭은 partners-data.ts 단일 소스
 */
export async function fetchPartnersForProduct(productId: string): Promise<Phase3PartnerFetchResult> {
  const slug = uuidToProductSlug(productId);
  const list: PartnerWithPSI[] = PARTNERS.map((p) => mapHardcodedPartnerToWithPSI(p, productId, slug));
  return Promise.resolve({ partners: list, error: null });
}
