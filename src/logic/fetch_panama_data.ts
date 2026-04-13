/**
 * Supabase 조회 — panama / panama_eml / panama_distributors
 * 오류 시 빈 배열·기본값으로 graceful 처리.
 */
/// <reference types="node" />

import { createSupabaseServer } from "../../lib/supabase-server";
import {
  parseGdpPerCapita,
  parseHealthPerCapitaUsd,
  parsePharmaYoYPercentFromNotes,
  parsePopulation,
} from "../../lib/parse_macro_notes";

const PANAMA = "panama" as const;
const PANAMA_EML = "panama_eml" as const;
const PANAMA_DIST = "panama_distributors" as const;

export interface PanamaRow {
  id?: string;
  product_id?: string | null;
  pa_source?: string | null;
  /** Supabase DECIMAL 등이 문자열로 올 수 있음 */
  pa_price_local?: number | string | null;
  pa_currency_unit?: string | null;
  pa_package_unit?: string | null;
  pa_price_type?: string | null;
  pa_product_name_local?: string | null;
  pa_decree_listed?: boolean | null;
  pa_notes?: string | null;
  confidence?: number | null;
  market_segment?: string | null;
  pa_milestone_type?: string | null;
  pa_released_at?: string | null;
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

/** Postgres DECIMAL → JS에서 string으로 올 때 대비 */
export function coerceFiniteNumber(v: unknown): number | null {
  if (v === null || v === undefined) {
    return null;
  }
  if (typeof v === "number" && Number.isFinite(v)) {
    return v;
  }
  if (typeof v === "string") {
    const t = v.trim().replace(/,/g, "");
    if (t === "") {
      return null;
    }
    const n = Number.parseFloat(t);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** GDP·인구 카드 — 상단 값(연도 없음) + footer용 관측 연도 */
export interface WorldbankMacroCardParts {
  gdpPerCapita: string | null;
  population: string | null;
  gdpObservationYear: string | null;
  populationObservationYear: string | null;
}

/**
 * worldbank 거시 행의 `pa_notes`에서 GDP per capita·인구 표시 문자열 생성
 * (pa_price_local NULL 이슈 대응)
 */
export function worldbankMacroDisplaysFromRows(
  rows: readonly PanamaRow[],
): WorldbankMacroCardParts {
  let gdpPerCapita: string | null = null;
  let population: string | null = null;
  let gdpObservationYear: string | null = null;
  let populationObservationYear: string | null = null;

  for (const r of rows) {
    if (r.pa_source !== "worldbank") {
      continue;
    }
    const notes = r.pa_notes;
    if (notes === null || notes === undefined || notes === "") {
      continue;
    }

    if (notes.includes("GDP per capita")) {
      const v = parseGdpPerCapita(notes);
      if (v !== null) {
        const ym =
          notes.match(/\(current US\$\)\s*\((\d{4})\)/i) ??
          notes.match(/\(US\$\)\s*\((\d{4})\)/);
        const yearStr = ym?.[1] ?? "2024";
        gdpPerCapita = `$${Math.round(v).toLocaleString("en-US")}`;
        gdpObservationYear = yearStr;
      }
    }

    if (notes.includes("Population")) {
      const v = parsePopulation(notes);
      if (v !== null) {
        const ym = notes.match(/value\.?\s*\((\d{4})\)/i);
        const yearStr = ym?.[1] ?? "2024";
        population = `${v.toLocaleString("en-US")}명`;
        populationObservationYear = yearStr;
      }
    }
  }

  return {
    gdpPerCapita,
    population,
    gdpObservationYear,
    populationObservationYear,
  };
}

/** 보건지출 카드 — 상단 금액만, 관측 연도는 footer용 */
export interface HealthMacroCardParts {
  display: string | null;
  observationYear: string | null;
}

/**
 * worldbank_who_ghed 행 `pa_notes`에서 1인당 보건지출(USD) 표시 문자열
 */
export function healthMacroDisplayFromRows(
  rows: readonly PanamaRow[],
): HealthMacroCardParts {
  for (const r of rows) {
    if (r.pa_source !== "worldbank_who_ghed") {
      continue;
    }
    const notes = r.pa_notes ?? "";
    let v = notes !== "" ? parseHealthPerCapitaUsd(notes) : null;
    if (v === null) {
      const fb = coerceFiniteNumber(r.pa_price_local);
      if (fb !== null && fb >= 50) {
        v = fb;
      }
    }
    if (v === null) {
      continue;
    }
    const ym = notes.match(/value\.?\s*\((\d{4})\)/i);
    const yearStr = ym?.[1] ?? "2023";
    const rounded = Math.round(v).toLocaleString("en-US");
    return { display: `$${rounded}`, observationYear: yearStr };
  }
  return { display: null, observationYear: null };
}

/** 성장률 카드 — 상단 %만, 출처·기간은 footer */
export interface PharmaGrowthMacroCardParts {
  display: string | null;
  /** 예: 출처: IQVIA 2024 실측 · 2023~2024 */
  sourceFooter: string | null;
}

/**
 * iqvia_sandoz_2024 행에서 YoY % 메인 문구
 */
export function pharmaGrowthDisplayFromRows(
  rows: readonly PanamaRow[],
): PharmaGrowthMacroCardParts {
  for (const r of rows) {
    if (r.pa_source !== "iqvia_sandoz_2024") {
      continue;
    }
    let pct = coerceFiniteNumber(r.pa_price_local);
    const notes = r.pa_notes ?? "";
    if (pct === null && notes !== "") {
      pct = parsePharmaYoYPercentFromNotes(notes);
    }
    if (pct === null) {
      continue;
    }
    return {
      display: `${pct}%`,
      sourceFooter: "출처: IQVIA 2024 실측 · 2023~2024",
    };
  }
  return { display: null, sourceFooter: null };
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

/** 규제 마일스톤 카드(진출 호재) — pa_released_at 내림차순 */
export async function getRegulatoryMilestones(): Promise<PanamaRow[]> {
  try {
    const sb = createSupabaseServer();
    const { data, error } = await sb
      .from(PANAMA)
      .select("*")
      .eq("market_segment", "regulatory_milestone")
      .order("pa_released_at", { ascending: false });
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
    return (
      s === "arrocha" ||
      s === "arrocha_shopify_api" ||
      s === "metroplus"
    );
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
