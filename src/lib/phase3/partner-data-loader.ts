import type { PartnerWithPSI } from "./types";

export interface Phase3PartnerFetchResult {
  partners: PartnerWithPSI[];
  error: string | null;
}

/**
 * TODO: Phase1/Phase2와 동일한 Supabase 클라이언트가 클라이언트에서 직접 필요하면
 * `@/src/utils/db_connector`의 `getSupabaseClient()` 패턴을 참고해 별도 래퍼 구성.
 * 현재는 서버 라우트가 DB 접근을 담당하므로 REST fetch만 사용.
 */
export async function fetchPartnersForProduct(productId: string): Promise<Phase3PartnerFetchResult> {
  const res = await fetch("/api/panama/phase3/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ product_id: productId }),
  });

  const data = (await res.json()) as { partners?: PartnerWithPSI[]; error?: string };

  if (!res.ok) {
    const msg =
      typeof data.error === "string" ? data.error : `HTTP ${String(res.status)}`;
    return { partners: [], error: msg };
  }

  return { partners: data.partners ?? [], error: null };
}
