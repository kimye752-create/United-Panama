/**
 * 2공정 경쟁사 가격 집계
 * - 공공조달: panamacompra_v3 (CSS/DGCP 낙찰가)
 * - 소비자 모니터링: acodeco_cabamed*, acodeco_pdf (ACODECO 가격 감시)
 * - 민간 소매체인: superxtra_vtex (SuperXtra 약국 체인 온라인가)
 */
import { createSupabaseServer } from "@/lib/supabase-server";

export interface CompetitorPriceChannel {
  avg: number | null;
  min: number | null;
  max: number | null;
  count: number;
  source: string;
}

export interface CompetitorPricesPayload {
  publicProcurement: CompetitorPriceChannel;
  privateRetail: CompetitorPriceChannel;
  retailChain: CompetitorPriceChannel;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const n = Number.parseFloat(value.trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function aggregate(prices: readonly number[]): Pick<
  CompetitorPriceChannel,
  "avg" | "min" | "max" | "count"
> {
  if (prices.length === 0) {
    return { avg: null, min: null, max: null, count: 0 };
  }
  const sum = prices.reduce((a, b) => a + b, 0);
  return {
    avg: sum / prices.length,
    min: Math.min(...prices),
    max: Math.max(...prices),
    count: prices.length,
  };
}

/**
 * 제품별 공공·민간 가격 행을 읽어 평균/최고/최저/건수를 산출합니다.
 */
export async function fetchCompetitorPrices(productId: string): Promise<CompetitorPricesPayload> {
  const sb = createSupabaseServer();

  const publicRes = await sb
    .from("panama")
    .select("pa_price_local")
    .eq("product_id", productId)
    .eq("pa_source", "panamacompra_v3")
    .not("pa_price_local", "is", null);

  if (publicRes.error !== null) {
    throw new Error(
      `공공조달 가격 조회 실패: ${publicRes.error.message}. Supabase 연결과 RLS를 확인해 주세요.`,
    );
  }

  const publicPrices = (publicRes.data ?? [])
    .map((row) => toFiniteNumber((row as { pa_price_local?: unknown }).pa_price_local))
    .filter((p): p is number => p !== null);

  // ACODECO (CABAMED 리스트 + PDF 가격 모니터링) — 소비자보호청 가격 감시
  const privateRes = await sb
    .from("panama")
    .select("pa_price_local, pa_source")
    .eq("product_id", productId)
    .or("pa_source.like.acodeco_cabamed%,pa_source.eq.acodeco_pdf")
    .not("pa_price_local", "is", null);

  if (privateRes.error !== null) {
    throw new Error(
      `ACODECO 가격 조회 실패: ${privateRes.error.message}. Supabase 연결과 RLS를 확인해 주세요.`,
    );
  }

  const privatePrices = (privateRes.data ?? [])
    .map((row) => toFiniteNumber((row as { pa_price_local?: unknown }).pa_price_local))
    .filter((p): p is number => p !== null);

  // SuperXtra VTEX — 파나마 약국 체인 온라인 소매가
  const retailRes = await sb
    .from("panama")
    .select("pa_price_local")
    .eq("product_id", productId)
    .eq("pa_source", "superxtra_vtex")
    .not("pa_price_local", "is", null);

  if (retailRes.error !== null) {
    throw new Error(
      `SuperXtra 소매 가격 조회 실패: ${retailRes.error.message}. Supabase 연결과 RLS를 확인해 주세요.`,
    );
  }

  const retailPrices = (retailRes.data ?? [])
    .map((row) => toFiniteNumber((row as { pa_price_local?: unknown }).pa_price_local))
    .filter((p): p is number => p !== null);

  const pubAgg = aggregate(publicPrices);
  const privAgg = aggregate(privatePrices);
  const retailAgg = aggregate(retailPrices);

  return {
    publicProcurement: {
      ...pubAgg,
      source: "PanamaCompra V3 - DGCP (Ley 419 de 2024)",
    },
    privateRetail: {
      ...privAgg,
      source: "ACODECO CABAMED + PDF 가격 모니터링 (소비자보호청)",
    },
    retailChain: {
      ...retailAgg,
      source: "SuperXtra 약국 체인 온라인가 (VTEX)",
    },
  };
}
