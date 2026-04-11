/**
 * round2_eml.json → panama_eml 배치 INSERT (1공정 EML 출처별 행)
 */
import { readFile } from "node:fs/promises";
import { dirname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

import { getSupabaseClient } from "../utils/db_connector.js";
import {
  type ProductMaster,
  TARGET_PRODUCTS,
} from "../utils/product-dictionary.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** 기본 seed 경로 (repo 루트 기준) */
export const DEFAULT_ROUND2_EML_PATH = join(
  __dirname,
  "..",
  "..",
  "data",
  "seed",
  "panama",
  "round2_eml.json",
);

export const PANAMA_EML_TABLE = "panama_eml" as const;

/** panama_eml.market_segment 허용값 */
export type EmlMarketSegment = "eml_who" | "eml_paho" | "eml_minsa";

/** JSON 직렬화 가능한 값 (pa_raw_data용) */
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { readonly [k: string]: JsonValue };

/** 단일 INN seed 행 (신규 스키마) */
export interface EmlSeedEntry {
  inn: string;
  who_eml_2023: boolean | null;
  /** 문자열 서술 또는 미조달 등 불리언(레거시·PM 확정 병행) */
  paho_strategic_fund: string | boolean | null;
  minsa_essential: string | null;
  atc_code?: string;
  therapeutic_class?: string;
  notes?: string;
  source_url?: string;
}

/** 파일 최상위 (신규 스키마: entries[]) */
export interface EmlSeedFile {
  generated_at: string;
  source: string;
  entries: readonly EmlSeedEntry[];
}

/** Supabase INSERT 행 — panama_eml 평탄화 컬럼 + pa_raw_data(원본 entry) */
export interface PanamaEmlRow {
  product_id: string;
  market_segment: EmlMarketSegment;
  fob_estimated_usd: null;
  confidence: number;
  crawled_at: string;
  pa_inn_name: string;
  pa_eml_listed: boolean | null;
  pa_paho_procurable: boolean | null;
  pa_minsa_essential: string | null;
  pa_atc_code: string | null;
  pa_therapeutic_class: string | null;
  pa_notes: string | null;
  pa_source_url: string | null;
  pa_raw_data: JsonValue;
}

export interface LoadEmlOptions {
  readonly dryRun?: boolean;
}

const CONFIDENCE_EML = 0.85;

/** 레거시 JSON 키 → WHO INN(영문) — product-dictionary 매칭용 */
const LEGACY_KEY_TO_WHO_INN: Readonly<Record<string, string>> = {
  hidroxiurea: "Hydroxyurea",
  cilostazol: "Cilostazol",
  itoprida: "Itopride",
  aceclofenaco: "Aceclofenac",
  rabeprazol: "Rabeprazole",
  erdosteina: "Erdosteine",
  omega_3_ethyl_esters: "Omega-3-acid ethyl esters",
  levodropropizine: "Levodropropizine",
};

/** PAHO 출처 행 — null/미기재는 스킵, 불리언·비어 있지 않은 문자열은 적재 */
function shouldEmitPahoRow(
  p: string | boolean | null | undefined,
): boolean {
  if (p === null || p === undefined) {
    return false;
  }
  if (typeof p === "boolean") {
    return true;
  }
  return p !== "";
}

/** paho_strategic_fund → pa_paho_procurable (미포함 우선 판정) */
export function mapPahoStrategicFundToProcurable(
  p: string | boolean | null | undefined,
): boolean | null {
  if (p === null || p === undefined) {
    return null;
  }
  if (typeof p === "boolean") {
    return p;
  }
  if (p.includes("미포함")) {
    return false;
  }
  if (p.includes("포함")) {
    return true;
  }
  return null;
}

/** pa_raw_data용 — entry 객체 전체를 JsonValue로 */
function emlSeedEntryToPaRawData(entry: EmlSeedEntry): JsonValue {
  const o: Record<string, JsonValue> = {
    inn: entry.inn,
    who_eml_2023: entry.who_eml_2023,
    paho_strategic_fund:
      typeof entry.paho_strategic_fund === "boolean"
        ? entry.paho_strategic_fund
        : entry.paho_strategic_fund === null
          ? null
          : entry.paho_strategic_fund,
    minsa_essential: entry.minsa_essential,
  };
  if (entry.atc_code !== undefined) {
    o.atc_code = entry.atc_code;
  }
  if (entry.therapeutic_class !== undefined) {
    o.therapeutic_class = entry.therapeutic_class;
  }
  if (entry.notes !== undefined) {
    o.notes = entry.notes;
  }
  if (entry.source_url !== undefined) {
    o.source_url = entry.source_url;
  }
  return o;
}

/** 동일 entry에서 파생되는 모든 INSERT 행에 공통으로 쓰는 평탄 필드 */
function buildFlatPanamaEmlColumns(
  entry: EmlSeedEntry,
): Pick<
  PanamaEmlRow,
  | "pa_inn_name"
  | "pa_eml_listed"
  | "pa_paho_procurable"
  | "pa_minsa_essential"
  | "pa_atc_code"
  | "pa_therapeutic_class"
  | "pa_notes"
  | "pa_source_url"
  | "pa_raw_data"
> {
  return {
    pa_inn_name: entry.inn,
    pa_eml_listed: entry.who_eml_2023,
    pa_paho_procurable: mapPahoStrategicFundToProcurable(
      entry.paho_strategic_fund,
    ),
    pa_minsa_essential: entry.minsa_essential,
    pa_atc_code: entry.atc_code ?? null,
    pa_therapeutic_class: entry.therapeutic_class ?? null,
    pa_notes: entry.notes ?? null,
    pa_source_url: entry.source_url ?? null,
    pa_raw_data: emlSeedEntryToPaRawData(entry),
  };
}

/** INN 정규화: 소문자 + 하이픈·공백 제거 */
export function normalizeInn(inn: string): string {
  return inn.toLowerCase().replace(/[\s-]/g, "");
}

/** 정규화 INN으로 product-dictionary 조회 — 실패 시 throw */
export function resolveProductByInn(inn: string): ProductMaster {
  const n = normalizeInn(inn);
  const hit = TARGET_PRODUCTS.find(
    (p) => normalizeInn(p.who_inn_en) === n,
  );
  if (hit === undefined) {
    throw new Error(
      `product-dictionary에서 INN을 찾을 수 없습니다(1공정 무결성). inn=${inn}`,
    );
  }
  return hit;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** 신규 스키마 EmlSeedFile 검증 */
function assertEmlSeedFile(v: unknown): asserts v is EmlSeedFile {
  if (!isRecord(v)) {
    throw new Error("round2_eml.json 최상위는 객체여야 합니다.");
  }
  if (typeof v.generated_at !== "string" || v.generated_at === "") {
    throw new Error("EmlSeedFile.generated_at 이 없습니다.");
  }
  if (typeof v.source !== "string") {
    throw new Error("EmlSeedFile.source 가 없습니다.");
  }
  if (!Array.isArray(v.entries)) {
    throw new Error("EmlSeedFile.entries 배열이 없습니다.");
  }
  for (const item of v.entries) {
    if (!isRecord(item) || typeof item.inn !== "string") {
      throw new Error("EmlSeedFile.entries 항목에 inn(string)이 없습니다.");
    }
  }
}

/** 레거시(phase/data) → EmlSeedFile 변환 — 키만 인덱스 기반 매핑 */
function legacyToEmlSeedFile(raw: Record<string, unknown>): EmlSeedFile {
  const collectionDate =
    typeof raw.collection_date === "string" ? raw.collection_date : "";
  const data = raw.data;
  if (!isRecord(data)) {
    throw new Error("레거시 round2: data 객체가 없습니다.");
  }
  const who = data.who_eml_2023_inclusion;
  const paho = data.paho_strategic_fund_inclusion;
  if (!isRecord(who) || !isRecord(paho)) {
    throw new Error(
      "레거시 round2: who_eml_2023_inclusion / paho_strategic_fund_inclusion 가 없습니다.",
    );
  }

  const meta = raw.metadata;
  const notes =
    isRecord(meta) && typeof meta.notes === "string" ? meta.notes : undefined;

  const keys = Object.keys(who).filter((k) => k in LEGACY_KEY_TO_WHO_INN);
  const entries: EmlSeedEntry[] = [];
  for (const key of keys) {
    const whoInn = LEGACY_KEY_TO_WHO_INN[key];
    if (whoInn === undefined) {
      throw new Error(`알 수 없는 레거시 키: ${key}`);
    }
    const w = who[key];
    const p = paho[key];
    if (typeof w !== "boolean") {
      throw new Error(`who_eml_2023_inclusion.${key} 는 boolean 이어야 합니다.`);
    }
    if (typeof p !== "string" && typeof p !== "boolean") {
      throw new Error(
        `paho_strategic_fund_inclusion.${key} 는 string 또는 boolean 이어야 합니다.`,
      );
    }
    entries.push({
      inn: whoInn,
      who_eml_2023: w,
      paho_strategic_fund: p,
      minsa_essential: null,
      ...(notes !== undefined ? { notes } : {}),
    });
  }

  return {
    generated_at:
      collectionDate !== ""
        ? `${collectionDate}T12:00:00.000Z`
        : new Date().toISOString(),
    source: "gemini_round2_legacy",
    entries,
  };
}

/** 파싱: entries[] 스키마 우선, 아니면 레거시 변환 */
export function parseRound2EmlJson(raw: unknown): EmlSeedFile {
  if (!isRecord(raw)) {
    throw new Error("JSON 최상위는 객체여야 합니다.");
  }
  if (Array.isArray(raw.entries)) {
    assertEmlSeedFile(raw);
    return raw as EmlSeedFile;
  }
  return legacyToEmlSeedFile(raw);
}

/** entry → 최대 3행 (출처별, NULL 출처는 스킵) */
export function entriesToPanamaEmlRows(
  entries: readonly EmlSeedEntry[],
  crawledAt: string,
): readonly PanamaEmlRow[] {
  const out: PanamaEmlRow[] = [];
  for (const entry of entries) {
    const product = resolveProductByInn(entry.inn);
    const flat = buildFlatPanamaEmlColumns(entry);

    if (entry.who_eml_2023 !== null && entry.who_eml_2023 !== undefined) {
      out.push({
        product_id: product.product_id,
        market_segment: "eml_who",
        fob_estimated_usd: null,
        confidence: CONFIDENCE_EML,
        crawled_at: crawledAt,
        ...flat,
      });
    }
    if (shouldEmitPahoRow(entry.paho_strategic_fund)) {
      out.push({
        product_id: product.product_id,
        market_segment: "eml_paho",
        fob_estimated_usd: null,
        confidence: CONFIDENCE_EML,
        crawled_at: crawledAt,
        ...flat,
      });
    }
    if (
      entry.minsa_essential !== null &&
      entry.minsa_essential !== undefined &&
      entry.minsa_essential !== ""
    ) {
      out.push({
        product_id: product.product_id,
        market_segment: "eml_minsa",
        fob_estimated_usd: null,
        confidence: CONFIDENCE_EML,
        crawled_at: crawledAt,
        ...flat,
      });
    }
  }
  return out;
}

/**
 * round2_eml.json 읽어 panama_eml 에 배치 INSERT. 적재 행 수 반환.
 */
export async function loadEmlFromFile(
  jsonPath: string = DEFAULT_ROUND2_EML_PATH,
  options: LoadEmlOptions = {},
): Promise<number> {
  const dryRun = options.dryRun === true;
  let text: string;
  try {
    text = await readFile(jsonPath, "utf-8");
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`round2_eml.json 읽기 실패: ${msg}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`JSON 파싱 실패: ${msg}`);
  }

  const file = parseRound2EmlJson(parsed);
  const crawledAt = file.generated_at;
  const rows = entriesToPanamaEmlRows(file.entries, crawledAt);

  if (rows.length === 0) {
    return 0;
  }

  if (dryRun) {
    return rows.length;
  }

  try {
    const client = getSupabaseClient();
    const { error } = await client.from(PANAMA_EML_TABLE).insert([...rows]);
    if (error !== null) {
      throw new Error(
        `panama_eml INSERT 실패: ${error.message}. DDL·RLS·테이블 존재 여부를 확인하세요.`,
      );
    }
  } catch (e: unknown) {
    if (e instanceof Error) {
      throw new Error(`Supabase 적재 오류: ${e.message}`);
    }
    throw new Error("Supabase 적재 중 알 수 없는 오류가 발생했습니다.");
  }

  return rows.length;
}

/** dry-run 시 변환 행을 함께 반환 (main 요약용) */
export async function buildEmlRowsFromFile(
  jsonPath: string = DEFAULT_ROUND2_EML_PATH,
): Promise<readonly PanamaEmlRow[]> {
  const text = await readFile(jsonPath, "utf-8");
  const parsed = JSON.parse(text) as unknown;
  const file = parseRound2EmlJson(parsed);
  return entriesToPanamaEmlRows(file.entries, file.generated_at);
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const path = DEFAULT_ROUND2_EML_PATH;

  if (dryRun) {
    const rows = await buildEmlRowsFromFile(path);
    console.log(
      JSON.stringify(
        {
          dryRun: true,
          path,
          rowCount: rows.length,
          rows,
        },
        null,
        2,
      ),
    );
    return;
  }

  const inserted = await loadEmlFromFile(path, { dryRun: false });
  console.log(JSON.stringify({ dryRun: false, inserted, path }, null, 2));
}

const invoked = process.argv[1];
if (invoked !== undefined) {
  const a = normalize(fileURLToPath(import.meta.url));
  const b = normalize(invoked);
  if (a === b) {
    main().catch((e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(msg);
      process.exit(1);
    });
  }
}
