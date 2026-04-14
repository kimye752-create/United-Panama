import type { PanamaRow } from "./fetch_panama_data";

export interface MarketPriceStats {
  count: number;
  avgPrice: number;
  maxPrice: number;
  minPrice: number;
}

function toValidPrices(rows: readonly PanamaRow[]): number[] {
  return rows
    .map((row) => row.pa_price_local)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value))
    .filter((value) => value > 0);
}

function buildStats(rows: readonly PanamaRow[]): MarketPriceStats | null {
  const prices = toValidPrices(rows);
  if (prices.length === 0) {
    return null;
  }
  const total = prices.reduce((acc, cur) => acc + cur, 0);
  return {
    count: prices.length,
    avgPrice: Math.round(total / prices.length),
    maxPrice: Math.max(...prices),
    minPrice: Math.min(...prices),
  };
}

export function getPanamacompraStats(
  productId: string,
  rows: readonly PanamaRow[],
): MarketPriceStats | null {
  const targetRows = rows.filter(
    (row) =>
      row.product_id === productId && row.pa_source === "panamacompra_atc4_competitor",
  );
  return buildStats(targetRows);
}

export function getCabamedStats(
  productId: string,
  rows: readonly PanamaRow[],
): MarketPriceStats | null {
  const targetRows = rows.filter(
    (row) =>
      row.product_id === productId && row.pa_source === "acodeco_cabamed_competitor",
  );
  return buildStats(targetRows);
}
