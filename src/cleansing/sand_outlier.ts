/**
 * 기법 ③ SAND — IQR 기반 가격 이상치 탐지 (경량 구현)
 */
/// <reference types="node" />

export interface PriceRow {
  id?: string;
  pa_price_local: number | null;
  pa_ingredient_inn?: string | null;
  [key: string]: unknown;
}

export interface SandResult {
  cleaned: PriceRow[];
  outliers: Array<PriceRow & { outlier_reason: string }>;
  stats: { q1: number; q3: number; iqr: number; lower: number; upper: number };
}

function quantileSorted(sorted: readonly number[], q: number): number {
  if (sorted.length === 0) {
    return 0;
  }
  if (sorted.length === 1) {
    const only = sorted[0];
    return only ?? 0;
  }
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  const a = sorted[base];
  const b = sorted[base + 1];
  if (a === undefined) {
    return 0;
  }
  if (b === undefined) {
    return a;
  }
  return a + rest * (b - a);
}

/**
 * IQR 방식 이상치 탐지. null 가격 행은 cleaned에 그대로 두고 이상치 판정에서 제외.
 */
export function detectOutliersIQR(
  rows: PriceRow[],
  multiplier = 1.5,
): SandResult {
  const numericValues: number[] = [];
  for (const r of rows) {
    if (r.pa_price_local !== null && !Number.isNaN(r.pa_price_local)) {
      numericValues.push(r.pa_price_local);
    }
  }

  const sorted = [...numericValues].sort((x, y) => x - y);
  const q1 = quantileSorted(sorted, 0.25);
  const q3 = quantileSorted(sorted, 0.75);
  const iqr = q3 - q1;
  const lower = q1 - multiplier * iqr;
  const upper = q3 + multiplier * iqr;

  const cleaned: PriceRow[] = [];
  const outliers: Array<PriceRow & { outlier_reason: string }> = [];

  for (const r of rows) {
    if (r.pa_price_local === null) {
      cleaned.push(r);
      continue;
    }
    const v = r.pa_price_local;
    if (Number.isNaN(v)) {
      cleaned.push(r);
      continue;
    }
    if (sorted.length < 2) {
      cleaned.push(r);
      continue;
    }
    if (v < lower || v > upper) {
      outliers.push({
        ...r,
        outlier_reason: `IQR 범위 밖 (허용 구간 [${lower.toFixed(4)}, ${upper.toFixed(4)}])`,
      });
    } else {
      cleaned.push(r);
    }
  }

  return {
    cleaned,
    outliers,
    stats: { q1, q3, iqr, lower, upper },
  };
}

/**
 * INN(또는 미지정 그룹)별로 IQR 적용.
 */
export function detectOutliersByInn(rows: PriceRow[]): Map<string, SandResult> {
  const groups = new Map<string, PriceRow[]>();
  for (const r of rows) {
    const key =
      r.pa_ingredient_inn !== undefined &&
      r.pa_ingredient_inn !== null &&
      r.pa_ingredient_inn.trim() !== ""
        ? r.pa_ingredient_inn.trim().toLowerCase()
        : "__no_inn__";
    const list = groups.get(key);
    if (list === undefined) {
      groups.set(key, [r]);
    } else {
      list.push(r);
    }
  }

  const out = new Map<string, SandResult>();
  for (const [k, list] of groups) {
    out.set(k, detectOutliersIQR(list));
  }
  return out;
}
