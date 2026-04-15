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
    .map((value) => {
      if (typeof value === "number" && Number.isFinite(value)) {
        return value;
      }
      if (typeof value === "string") {
        const n = Number.parseFloat(value.trim());
        return Number.isFinite(n) ? n : null;
      }
      return null;
    })
    .filter((value): value is number => value !== null)
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
    (row) => {
      if (row.product_id !== productId) {
        return false;
      }
      const src = row.pa_source ?? "";
      return src === "panamacompra_atc4_competitor" || src === "panamacompra_v3";
    },
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
