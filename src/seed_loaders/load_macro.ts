/**
 * Gemini round1_macro.json → panama 테이블 INSERT (베이스 로더)
 * PM이 JSON을 채운 뒤 실행.
 */
import { readFile } from "node:fs/promises";
import { dirname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

import {
  insertRow,
  validatePanamaPhase1Common,
  type PanamaPhase1InsertRow,
} from "../utils/db_connector.js";
import {
  MACRO_PRODUCT_ID,
  findProductByInn,
} from "../utils/product-dictionary.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** 기본 seed 파일 경로 (repo 루트 기준 data/seed/panama/round1_macro.json) */
export const DEFAULT_ROUND1_MACRO_PATH = join(
  __dirname,
  "..",
  "..",
  "data",
  "seed",
  "panama",
  "round1_macro.json",
);

/** Gemini round1 상단 메타 + sites 배열 */
export interface Round1MacroFile {
  collection_date?: string;
  collector?: string;
  country?: string;
  sites?: GeminiMacroSite[];
  metadata?: Record<string, unknown>;
}

/** sites[] 한 요소 — PM 제공 JSON 스키마에 맞춤 */
export interface GeminiMacroSite {
  site_id: string;
  site_name?: string;
  site_url?: string;
  collected_at?: string;
  confidence: number;
  data?: unknown;
  source_paragraphs?: string[];
  /** INN별 행 분리 시 WHO INN(영문) — 있으면 해당 제품 UUID, 없으면 거시 MACRO */
  product_inn_en?: string;
}

export interface LoadMacroResult {
  /** INSERT 성공 건수 */
  inserted: number;
  /** INSERT 실패 건수 */
  failed: number;
  /** 사유 요약 (한국어) */
  messages: string[];
}

export interface LoadMacroOptions {
  readonly dryRun?: boolean;
}

/** source_paragraphs를 하나의 인용 텍스트로 합침 */
function joinParagraphs(site: GeminiMacroSite): string | undefined {
  const p = site.source_paragraphs;
  if (p === undefined || p.length === 0) {
    return undefined;
  }
  return p.map((s) => s.trim()).filter(Boolean).join("\n\n");
}

/**
 * site_id·product_inn_en 기준으로 product_id 결정
 * - product_inn_en이 있으면 findProductByInn → 없으면 거시 MACRO
 */
export function resolveProductIdForMacroSite(site: GeminiMacroSite): string {
  const inn = site.product_inn_en?.trim();
  if (inn !== undefined && inn !== "") {
    const hit = findProductByInn(inn);
    if (hit !== undefined) {
      return hit.product_id;
    }
  }
  return MACRO_PRODUCT_ID;
}

/** 단일 site → panama 행 (1공정 규칙: fob_estimated_usd = null, pa_source_type 미사용) */
export function siteToPanamaRow(site: GeminiMacroSite): PanamaPhase1InsertRow {
  const collected = site.collected_at?.trim();
  const crawledAt =
    collected !== undefined &&
    collected !== "" &&
    !Number.isNaN(Date.parse(collected))
      ? new Date(collected).toISOString()
      : new Date().toISOString();

  const notes = joinParagraphs(site);

  const row: PanamaPhase1InsertRow = {
    product_id: resolveProductIdForMacroSite(site),
    market_segment: "macro",
    fob_estimated_usd: null,
    confidence: site.confidence,
    crawled_at: crawledAt,
    pa_source: site.site_id,
    pa_source_url: site.site_url ?? null,
    pa_collected_at: collected ?? null,
    pa_product_name_local: site.site_name ?? site.site_id,
    pa_notes: notes ?? null,
  };

  return row;
}

/** JSON에서 sites[] 로드 — 비어 있으면 throw */
export async function readRound1Sites(
  jsonPath: string = DEFAULT_ROUND1_MACRO_PATH,
): Promise<readonly GeminiMacroSite[]> {
  let raw: string;
  try {
    raw = await readFile(jsonPath, "utf-8");
  } catch (error: unknown) {
    const msg =
      error instanceof Error
        ? error.message
        : "round1_macro.json 파일을 읽지 못했습니다.";
    throw new Error(`파일 읽기 실패: ${msg}`);
  }

  let data: Round1MacroFile;
  try {
    data = JSON.parse(raw) as Round1MacroFile;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`JSON 파싱 실패: ${msg}`);
  }

  const sites = data.sites;
  if (sites === undefined || sites.length === 0) {
    throw new Error(
      "sites 배열이 비어 있거나 없습니다. PM이 JSON을 채운 뒤 다시 실행하세요.",
    );
  }
  return sites;
}

/** dry-run·검증용 — 변환된 INSERT 행 전체 */
export async function buildMacroRowsFromRound1File(
  jsonPath: string = DEFAULT_ROUND1_MACRO_PATH,
): Promise<{ readonly path: string; readonly rows: PanamaPhase1InsertRow[] }> {
  const sites = await readRound1Sites(jsonPath);
  const rows = sites.map(siteToPanamaRow);
  for (const row of rows) {
    validatePanamaPhase1Common(row);
  }
  return { path: jsonPath, rows };
}

/**
 * round1_macro.json 파일을 읽어 panama에 적재한다.
 * @param jsonPath 파일 경로 (기본: DEFAULT_ROUND1_MACRO_PATH)
 */
export async function loadRound1MacroFromFile(
  jsonPath: string = DEFAULT_ROUND1_MACRO_PATH,
  options: LoadMacroOptions = {},
): Promise<LoadMacroResult> {
  const dryRun = options.dryRun === true;
  const messages: string[] = [];
  let inserted = 0;
  let failed = 0;

  if (dryRun) {
    try {
      const { rows } = await buildMacroRowsFromRound1File(jsonPath);
      messages.push(
        `[dry-run] INSERT 생략, 변환 ${rows.length}건 (경로: ${jsonPath})`,
      );
      return { inserted: rows.length, failed: 0, messages };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      return {
        inserted: 0,
        failed: 0,
        messages: [msg],
      };
    }
  }

  let sites: readonly GeminiMacroSite[];
  try {
    sites = await readRound1Sites(jsonPath);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      inserted: 0,
      failed: 0,
      messages: [msg],
    };
  }

  for (const site of sites) {
    try {
      const row = siteToPanamaRow(site);
      validatePanamaPhase1Common(row);
      const result = await insertRow(row);
      if (result.ok) {
        inserted += 1;
      } else {
        failed += 1;
        messages.push(`${site.site_id}: ${result.message}`);
      }
    } catch (error: unknown) {
      failed += 1;
      messages.push(
        `${site.site_id}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  messages.unshift(
    `적재 완료: 성공 ${inserted}건, 실패 ${failed}건 (경로: ${jsonPath})`,
  );

  return { inserted, failed, messages };
}

function writeStdoutJson(obj: unknown): void {
  process.stdout.write(`${JSON.stringify(obj, null, 2)}\n`);
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const path = DEFAULT_ROUND1_MACRO_PATH;

  if (dryRun) {
    const { rows } = await buildMacroRowsFromRound1File(path);
    writeStdoutJson({
      dryRun: true,
      path,
      panamaInserted: rows.length,
      rows,
    });
    return;
  }

  const result = await loadRound1MacroFromFile(path, { dryRun: false });
  writeStdoutJson({
    dryRun: false,
    path,
    inserted: result.inserted,
    failed: result.failed,
    messages: result.messages,
  });
}

const invoked = process.argv[1];
if (invoked !== undefined) {
  const a = normalize(fileURLToPath(import.meta.url));
  const b = normalize(invoked);
  if (a === b) {
    main().catch((e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      process.stderr.write(`${msg}\n`);
      process.exit(1);
    });
  }
}
