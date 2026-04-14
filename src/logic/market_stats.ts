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
    avgPrice: Math.round((total / prices.length) * 100) / 100,
    maxPrice: Math.max(...prices),
    minPrice: Math.min(...prices),
  };
}

function contractDateFromNotes(notes: string | null | undefined): string {
  if (notes === null || notes === undefined || notes.trim() === "") {
    return "";
  }
  try {
    const parsed = JSON.parse(notes) as { contract_date?: unknown };
    return typeof parsed.contract_date === "string" ? parsed.contract_date : "";
  } catch {
    return "";
  }
}

export function getPanamacompraStats(
  productId: string,
  rows: readonly PanamaRow[],
): MarketPriceStats | null {
  const rawRows = rows.filter(
    (row) =>
      row.product_id === productId && row.pa_source === "panamacompra_atc4_competitor",
  );
  const uniqueMap = new Map<string, PanamaRow>();
  for (const row of rawRows) {
    const contractDate = contractDateFromNotes(row.pa_notes);
    const key = `${row.pa_product_name_local ?? ""}__${String(
      row.pa_price_local ?? "",
    )}__${contractDate}`;
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, row);
    }
  }
  return buildStats(Array.from(uniqueMap.values()));
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
