/**
 * Supabase 조회 — panama / panama_eml / panama_distributors
 * 오류 시 빈 배열·기본값으로 graceful 처리.
 */
/// <reference types="node" />

import { createSupabaseServer } from "../../lib/supabase-server";

const PANAMA = "panama" as const;
const PANAMA_EML = "panama_eml" as const;
const PANAMA_DIST = "panama_distributors" as const;

export interface PanamaRow {
  id?: string;
  product_id?: string | null;
  pa_source?: string | null;
  pa_price_local?: number | null;
  pa_currency_unit?: string | null;
  pa_package_unit?: string | null;
  pa_price_type?: string | null;
  pa_product_name_local?: string | null;
  pa_decree_listed?: boolean | null;
  pa_notes?: string | null;
  confidence?: number | null;
  market_segment?: string | null;
}

export interface DistributorRow {
  id: string;
  company_name: string;
  company_name_local: string | null;
  target_market: string | null;
  ahp_psi_score: number | null;
  ahp_rank: number | null;
  confidence: number;
}

export interface SourceAggRow {
  pa_source: string;
  count: number;
  avgConfidence: number | null;
}

export interface EmlStatus {
  emlWho: boolean;
  emlPaho: boolean;
  emlMinsa: boolean;
}

function readBoolCell(
  row: Record<string, unknown>,
  keys: string[],
): boolean {
  for (const k of keys) {
    const v = row[k];
    if (typeof v === "boolean") {
      return v;
    }
  }
  return false;
}

function readRawBool(raw: unknown, key: string): boolean | undefined {
  if (raw === null || raw === undefined || typeof raw !== "object") {
    return undefined;
  }
  const o = raw as Record<string, unknown>;
  const v = o[key];
  if (typeof v === "boolean") {
    return v;
  }
  return undefined;
}

/** panama_eml 행에서 EML 플래그 취합 */
function rowsToEmlStatus(rows: Record<string, unknown>[]): EmlStatus {
  let emlWho = false;
  let emlPaho = false;
  let emlMinsa = false;

  for (const r of rows) {
    const seg = r["market_segment"];
    const raw = r["pa_raw_data"];

    if (seg === "eml_who") {
      const col = readBoolCell(r, ["pa_eml_listed"]);
      const rawB = readRawBool(raw, "who_eml_2023");
      emlWho = col || rawB === true;
    } else if (seg === "eml_paho") {
      const direct = r["pa_paho_procurable"];
      if (typeof direct === "boolean") {
        emlPaho = direct;
      } else if (raw !== null && typeof raw === "object") {
        const o = raw as Record<string, unknown>;
        const ps = o["paho_strategic_fund"];
        if (typeof ps === "boolean") {
          emlPaho = ps;
        } else if (typeof ps === "string") {
          if (ps.includes("미포함")) {
            emlPaho = false;
          } else if (ps.trim() !== "") {
            emlPaho = true;
          }
        }
      }
    } else if (seg === "eml_minsa") {
      const s = r["pa_minsa_essential"];
      if (typeof s === "string" && s.trim() !== "") {
        emlMinsa = /essential|필수|yes|si|sí|true/i.test(s);
      }
    }
  }

  return { emlWho, emlPaho, emlMinsa };
}

export async function getMacroSummary(): Promise<PanamaRow[]> {
  try {
    const sb = createSupabaseServer();
    const { data, error } = await sb
      .from(PANAMA)
      .select("*")
      .eq("market_segment", "macro");
    if (error !== null) {
      return [];
    }
    return (data ?? []) as PanamaRow[];
  } catch {
    return [];
  }
}

export async function getEmlStatus(productId: string): Promise<EmlStatus> {
  try {
    const sb = createSupabaseServer();
    const { data, error } = await sb
      .from(PANAMA_EML)
      .select("*")
      .eq("product_id", productId);
    if (error !== null || data === null) {
      return { emlWho: false, emlPaho: false, emlMinsa: false };
    }
    return rowsToEmlStatus(data as Record<string, unknown>[]);
  } catch {
    return { emlWho: false, emlPaho: false, emlMinsa: false };
  }
}

export async function getDistributors(): Promise<DistributorRow[]> {
  try {
    const sb = createSupabaseServer();
    const { data, error } = await sb.from(PANAMA_DIST).select("*");
    if (error !== null || data === null) {
      return [];
    }
    return data as DistributorRow[];
  } catch {
    return [];
  }
}

export async function getPriceRowsByProduct(
  productId: string,
): Promise<PanamaRow[]> {
  try {
    const sb = createSupabaseServer();
    const { data, error } = await sb
      .from(PANAMA)
      .select("*")
      .eq("product_id", productId);
    if (error !== null || data === null) {
      return [];
    }
    return data as PanamaRow[];
  } catch {
    return [];
  }
}

export async function getSourceAggregation(): Promise<SourceAggRow[]> {
  try {
    const sb = createSupabaseServer();
    const { data, error } = await sb.from(PANAMA).select("pa_source, confidence");
    if (error !== null || data === null) {
      return [];
    }
    const map = new Map<
      string,
      { count: number; sum: number; nConf: number }
    >();
    for (const row of data as { pa_source: string | null; confidence: number | null }[]) {
      const src = row.pa_source ?? "unknown";
      const cur = map.get(src) ?? { count: 0, sum: 0, nConf: 0 };
      cur.count += 1;
      if (row.confidence !== null && !Number.isNaN(row.confidence)) {
        cur.sum += row.confidence;
        cur.nConf += 1;
      }
      map.set(src, cur);
    }
    const out: SourceAggRow[] = [];
    for (const [pa_source, v] of map) {
      out.push({
        pa_source,
        count: v.count,
        avgConfidence: v.nConf > 0 ? v.sum / v.nConf : null,
      });
    }
    out.sort((a, b) => a.pa_source.localeCompare(b.pa_source));
    return out;
  } catch {
    return [];
  }
}

/** Case 판정용: public/both 유통사 수 */
export function countPublicOrBothDistributors(
  distributors: readonly DistributorRow[],
): number {
  return distributors.filter((d) => {
    const t = (d.target_market ?? "").toLowerCase();
    return t === "public" || t === "both";
  }).length;
}

export async function countPanamaBySource(
  productId: string,
  paSource: string,
): Promise<number> {
  const rows = await getPriceRowsByProduct(productId);
  return rows.filter((r) => r.pa_source === paSource).length;
}

export async function countPrivateRetail(productId: string): Promise<number> {
  const rows = await getPriceRowsByProduct(productId);
  return rows.filter((r) => {
    const s = r.pa_source ?? "";
    return s === "arrocha" || s === "metroplus";
  }).length;
}

export async function hasCabamedRegulated(productId: string): Promise<boolean> {
  const rows = await getPriceRowsByProduct(productId);
  return rows.some(
    (r) =>
      r.pa_source === "acodeco" &&
      r.pa_decree_listed === true,
  );
}
