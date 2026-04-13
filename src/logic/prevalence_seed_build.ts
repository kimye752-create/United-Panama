/**
 * round4_prevalence.json 파싱 및 panama.pa_notes 문자열 생성 (로더·검증 공용)
 */

export type PrevalenceScope = "panama" | "latam_average";

/** 8개 품목 역학 시드 항목 */
export interface PrevalenceEntry {
  product_id: string;
  who_inn_en: string;
  prevalence_metric: string;
  prevalence_year: number;
  source: string;
  source_url: string;
  scope: PrevalenceScope;
}

/** 거시 의료 인프라 1행(9번째) */
export interface MacroHealthcareInfraEntry {
  product_id: string;
  who_inn_en: string;
  prevalence_metric: string;
  prevalence_year: number;
  source: string;
  source_url: string;
  scope: PrevalenceScope;
}

export interface Round4PrevalenceFile {
  entries: PrevalenceEntry[];
  macro_healthcare_infra: MacroHealthcareInfraEntry;
}

function isScope(x: unknown): x is PrevalenceScope {
  return x === "panama" || x === "latam_average";
}

function isPrevalenceEntry(x: unknown): x is PrevalenceEntry {
  if (x === null || typeof x !== "object") {
    return false;
  }
  const o = x as Record<string, unknown>;
  return (
    typeof o.product_id === "string" &&
    typeof o.who_inn_en === "string" &&
    typeof o.prevalence_metric === "string" &&
    typeof o.prevalence_year === "number" &&
    typeof o.source === "string" &&
    typeof o.source_url === "string" &&
    isScope(o.scope)
  );
}

function isMacroEntry(x: unknown): x is MacroHealthcareInfraEntry {
  return isPrevalenceEntry(x);
}

/** JSON 파일 전체 검증 */
export function parseRound4PrevalenceFile(raw: unknown): Round4PrevalenceFile {
  if (raw === null || typeof raw !== "object") {
    throw new Error("round4_prevalence.json 루트는 객체여야 합니다.");
  }
  const root = raw as Record<string, unknown>;
  const ent = root.entries;
  const macro = root.macro_healthcare_infra;
  if (!Array.isArray(ent)) {
    throw new Error("entries 배열이 필요합니다.");
  }
  if (ent.length !== 8) {
    throw new Error(`entries는 8건이어야 합니다. 현재 ${String(ent.length)}건.`);
  }
  const entries: PrevalenceEntry[] = [];
  for (let i = 0; i < ent.length; i++) {
    if (!isPrevalenceEntry(ent[i])) {
      throw new Error(`entries[${String(i)}] 스키마 불일치.`);
    }
    entries.push(ent[i]);
  }
  if (!isMacroEntry(macro)) {
    throw new Error("macro_healthcare_infra 스키마 불일치.");
  }
  return { entries, macro_healthcare_infra: macro };
}

/**
 * panama INSERT용 pa_notes — 역학 추출 키워드(유병률·발병률·prevalence 등) 포함.
 * pa_raw_data 컬럼이 panama DDL에 없으므로 scope·연도·출처는 본 문자열에 포함.
 */
export function buildPaNotesForPrevalenceEntry(e: PrevalenceEntry): string {
  return (
    `prevalence: ${e.prevalence_metric} [${e.source}] (${String(e.prevalence_year)}, scope=${e.scope})`
  );
}

/** 거시 인프라 행 — 동일 형식(prevalence: 접두로 조회 일관성 유지) */
export function buildPaNotesForMacroInfra(e: MacroHealthcareInfraEntry): string {
  return (
    `prevalence: 국가 의료 인프라 | ${e.prevalence_metric} | source: ${e.source} (${String(e.prevalence_year)}, scope=${e.scope})`
  );
}
