/**
 * 2공정 경쟁사 가격 집계 — 공공조달(panamacompra_v3) / 민간 소매(acodeco_cabamed*)
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

  const privateRes = await sb
    .from("panama")
    .select("pa_price_local, pa_source")
    .eq("product_id", productId)
    .like("pa_source", "acodeco_cabamed%")
    .not("pa_price_local", "is", null);

  if (privateRes.error !== null) {
    throw new Error(
      `민간 소매 가격 조회 실패: ${privateRes.error.message}. Supabase 연결과 RLS를 확인해 주세요.`,
    );
  }

  const privatePrices = (privateRes.data ?? [])
    .map((row) => toFiniteNumber((row as { pa_price_local?: unknown }).pa_price_local))
    .filter((p): p is number => p !== null);

  const pubAgg = aggregate(publicPrices);
  const privAgg = aggregate(privatePrices);

  return {
    publicProcurement: {
      ...pubAgg,
      source: "PanamaCompra V3 - DGCP (Ley 419 de 2024)",
    },
    privateRetail: {
      ...privAgg,
      source: "ACODECO CABAMED",
    },
  };
}
