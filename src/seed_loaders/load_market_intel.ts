/**
 * round3_market_intel.json → panama(거시) + panama_distributors 배치 INSERT
 */
import { readFile } from "node:fs/promises";
import { dirname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

import {
  getSupabaseClient,
  PANAMA_TABLE,
  validatePanamaPhase1Common,
  type PanamaPhase1InsertRow,
} from "../utils/db_connector.js";
import { MACRO_PRODUCT_ID } from "../utils/product-dictionary.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** 기본 seed 경로 */
export const DEFAULT_ROUND3_MARKET_INTEL_PATH = join(
  __dirname,
  "..",
  "..",
  "data",
  "seed",
  "panama",
  "round3_market_intel.json",
);

export const PANAMA_DISTRIBUTORS_TABLE = "panama_distributors" as const;

/** panama_distributors.target_market (DDL CHECK) */
export type DistributorTargetMarket = "public" | "private" | "both";

const PA_SOURCE_GEMINI_SEED = "gemini_seed" as const;
const DIST_SOURCE_GEMINI_SEED = "gemini_seed" as const;

const CONFIDENCE_MARKET_INTEL = 0.82;

/** ─── round3 JSON: 6대 영역 (any 금지) ─── */

export interface PricingDataItem {
  ingredient: string;
  public_procurement_price_usd: number | null;
  private_retail_price_usd: number | null;
  paho_strategic_fund_price_usd: number | null;
  product_brand: string | null;
  package_unit: string | null;
  source_url: string | null;
  source_quote: string | null;
  citation: string | null;
}

export interface CompetitorItem {
  company_name: string;
  type: string;
  source_url: string;
  source_quote: string;
  citation: string;
}

export interface DistributorItem {
  company_name: string;
  focus: string;
  target: string;
  source_url: string;
  source_quote: string;
  citation: string;
}

export interface InfrastructureItem {
  hospital_name: string;
  affiliation: string;
  focus: string;
  source_url: string;
  source_quote: string;
  citation: string;
}

export interface RegulatoryAdministrativeCostsUsd {
  new_registry_reference_drug: number;
  free_sale_certificate: number;
  renewal_innovator_biologics: number;
}

export interface RegulatoryCostsBlock {
  regulatory_body: string;
  high_standard_recognition: string;
  administrative_costs_usd: RegulatoryAdministrativeCostsUsd;
  timeline_months: string;
  required_documents_checklist: unknown | null;
  source_url: string;
  source_quote: string;
  citation: string;
}

export interface EpidemiologyItem {
  disease: string;
  prevalence: string;
  growth_rate: string | null;
  source_url: string | null;
  source_quote: string | null;
  citation: string | null;
}

/** 파일 루트 — 6키 고정 */
export interface Round3MarketIntelFile {
  readonly pricing_data: readonly PricingDataItem[];
  readonly competitors: readonly CompetitorItem[];
  readonly distributors: readonly DistributorItem[];
  readonly infrastructure: readonly InfrastructureItem[];
  readonly regulatory_costs: RegulatoryCostsBlock;
  readonly epidemiology: readonly EpidemiologyItem[];
}

/** 1공정 INSERT용 — panama_distributors (AHP 컬럼은 3공정, 여기선 생략·NULL) */
export interface PanamaDistributorInsertRow {
  company_name: string;
  company_name_local: string | null;
  focus_area: string | null;
  target_market: DistributorTargetMarket;
  source: typeof DIST_SOURCE_GEMINI_SEED;
  source_url: string | null;
  source_quote: string | null;
  confidence: number;
  collected_at: string;
}

export interface LoadMarketIntelOptions {
  readonly dryRun?: boolean;
}

export interface LoadMarketIntelResult {
  readonly panamaInserted: number;
  readonly distributorsInserted: number;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** 스페인어 target 문자열 → public / private / both (복합 표현을 단일 채널보다 먼저 판별) */
export function mapSpanishTargetToMarket(raw: string): DistributorTargetMarket {
  const lower = raw.trim().toLowerCase();
  if (
    lower.includes("público y privado") ||
    lower.includes("privado y público")
  ) {
    return "both";
  }
  if (
    /\bprivado\s*\/\s*público\b/u.test(lower) ||
    /\bpúblico\s*\/\s*privado\b/u.test(lower)
  ) {
    return "both";
  }
  if (lower.includes("privado") && lower.includes("público")) {
    return "both";
  }
  if (lower.includes("privado") && !lower.includes("público")) {
    return "private";
  }
  if (lower.includes("público") && !lower.includes("privado")) {
    return "public";
  }
  if (lower.includes("privado")) {
    return "private";
  }
  if (lower.includes("público")) {
    return "public";
  }
  return "both";
}

function pickFirstNonNullPriceUsd(p: PricingDataItem): number | null {
  const cands: readonly (number | null)[] = [
    p.public_procurement_price_usd,
    p.private_retail_price_usd,
    p.paho_strategic_fund_price_usd,
  ];
  for (const n of cands) {
    if (n !== null && n !== undefined && typeof n === "number") {
      return n;
    }
  }
  return null;
}

function joinNoteParts(parts: readonly (string | null | undefined)[]): string {
  return parts
    .filter((x): x is string => typeof x === "string" && x.trim() !== "")
    .join("\n\n");
}

function regulatoryCostsToNotes(r: RegulatoryCostsBlock): string {
  const fees = r.administrative_costs_usd;
  return joinNoteParts([
    "[round3·regulatory_costs]",
    `regulatory_body: ${r.regulatory_body}`,
    `high_standard_recognition: ${r.high_standard_recognition}`,
    `administrative_costs_usd: new_registry_reference_drug=${String(fees.new_registry_reference_drug)}, free_sale_certificate=${String(fees.free_sale_certificate)}, renewal_innovator_biologics=${String(fees.renewal_innovator_biologics)}`,
    `timeline_months: ${r.timeline_months}`,
    r.required_documents_checklist !== null
      ? `required_documents_checklist: ${JSON.stringify(r.required_documents_checklist)}`
      : null,
    `source_quote: ${r.source_quote}`,
    r.citation !== "" ? `citation: ${r.citation}` : null,
  ]);
}

/** 공통 panama 행 베이스 — fob=null, macro, MACRO product_id */
function basePanamaRow(crawledAt: string): Pick<
  PanamaPhase1InsertRow,
  "product_id" | "market_segment" | "fob_estimated_usd" | "confidence" | "crawled_at"
> {
  return {
    product_id: MACRO_PRODUCT_ID,
    market_segment: "macro",
    fob_estimated_usd: null,
    confidence: CONFIDENCE_MARKET_INTEL,
    crawled_at: crawledAt,
  };
}

/** round3 파일 → panama INSERT 행 목록 */
export function marketIntelFileToPanamaRows(
  file: Round3MarketIntelFile,
  crawledAt: string,
): PanamaPhase1InsertRow[] {
  const rows: PanamaPhase1InsertRow[] = [];

  for (const p of file.pricing_data) {
    rows.push({
      ...basePanamaRow(crawledAt),
      pa_source: PA_SOURCE_GEMINI_SEED,
      pa_source_url: p.source_url,
      pa_ingredient_inn: p.ingredient,
      pa_product_name_local: `round3/pricing_data: ${p.ingredient.slice(0, 120)}`,
      pa_price_local: pickFirstNonNullPriceUsd(p),
      pa_package_unit: p.package_unit,
      pa_notes: joinNoteParts([
        "[round3·pricing_data]",
        p.product_brand !== null ? `product_brand: ${p.product_brand}` : null,
        `source_quote: ${p.source_quote ?? ""}`,
        p.citation !== null && p.citation !== "" ? `citation: ${p.citation}` : null,
      ]),
    });
  }

  for (const c of file.competitors) {
    rows.push({
      ...basePanamaRow(crawledAt),
      pa_source: PA_SOURCE_GEMINI_SEED,
      pa_source_url: c.source_url,
      pa_product_name_local: c.company_name,
      pa_notes: joinNoteParts([
        "[round3·competitors]",
        `type: ${c.type}`,
        `source_quote: ${c.source_quote}`,
        c.citation !== "" ? `citation: ${c.citation}` : null,
      ]),
    });
  }

  for (const h of file.infrastructure) {
    rows.push({
      ...basePanamaRow(crawledAt),
      pa_source: PA_SOURCE_GEMINI_SEED,
      pa_source_url: h.source_url,
      pa_product_name_local: h.hospital_name,
      pa_notes: joinNoteParts([
        "[round3·infrastructure]",
        `affiliation: ${h.affiliation}`,
        `focus: ${h.focus}`,
        `source_quote: ${h.source_quote}`,
        h.citation !== "" ? `citation: ${h.citation}` : null,
      ]),
    });
  }

  rows.push({
    ...basePanamaRow(crawledAt),
    pa_source: PA_SOURCE_GEMINI_SEED,
    pa_source_url: file.regulatory_costs.source_url,
    pa_product_name_local: `round3/regulatory: ${file.regulatory_costs.regulatory_body.slice(0, 100)}`,
    pa_notes: regulatoryCostsToNotes(file.regulatory_costs),
  });

  for (const e of file.epidemiology) {
    rows.push({
      ...basePanamaRow(crawledAt),
      pa_source: PA_SOURCE_GEMINI_SEED,
      pa_source_url: e.source_url,
      pa_product_name_local: `round3/epidemiology: ${e.disease}`,
      pa_notes: joinNoteParts([
        "[round3·epidemiology]",
        `prevalence: ${e.prevalence}`,
        e.growth_rate !== null ? `growth_rate: ${e.growth_rate}` : null,
        e.source_quote !== null ? `source_quote: ${e.source_quote}` : null,
        e.citation !== null && e.citation !== ""
          ? `citation: ${e.citation}`
          : null,
      ]),
    });
  }

  return rows;
}

/** distributors[] → 보조 테이블 INSERT 행 */
export function distributorsToRows(
  items: readonly DistributorItem[],
  crawledAt: string,
): PanamaDistributorInsertRow[] {
  return items.map((d) => ({
    company_name: d.company_name,
    company_name_local: null,
    focus_area: d.focus,
    target_market: mapSpanishTargetToMarket(d.target),
    source: DIST_SOURCE_GEMINI_SEED,
    source_url: d.source_url,
    source_quote: d.source_quote,
    confidence: CONFIDENCE_MARKET_INTEL,
    collected_at: crawledAt,
  }));
}

function assertRound3MarketIntelFile(v: unknown): asserts v is Round3MarketIntelFile {
  if (!isRecord(v)) {
    throw new Error("round3_market_intel.json 최상위는 객체여야 합니다.");
  }
  const keys = [
    "pricing_data",
    "competitors",
    "distributors",
    "infrastructure",
    "regulatory_costs",
    "epidemiology",
  ] as const;
  for (const k of keys) {
    if (!(k in v)) {
      throw new Error(`round3 JSON에 필수 키가 없습니다: ${k}`);
    }
  }
  if (!Array.isArray(v.pricing_data)) {
    throw new Error("pricing_data는 배열이어야 합니다.");
  }
  if (!Array.isArray(v.competitors)) {
    throw new Error("competitors는 배열이어야 합니다.");
  }
  if (!Array.isArray(v.distributors)) {
    throw new Error("distributors는 배열이어야 합니다.");
  }
  if (!Array.isArray(v.infrastructure)) {
    throw new Error("infrastructure는 배열이어야 합니다.");
  }
  if (!isRecord(v.regulatory_costs)) {
    throw new Error("regulatory_costs는 객체여야 합니다.");
  }
  if (!Array.isArray(v.epidemiology)) {
    throw new Error("epidemiology는 배열이어야 합니다.");
  }
}

export function parseRound3MarketIntelJson(raw: unknown): Round3MarketIntelFile {
  assertRound3MarketIntelFile(raw);
  return raw;
}

/**
 * round3 JSON 파일을 읽어 panama + panama_distributors 에 적재합니다.
 */
export async function loadMarketIntelFromFile(
  jsonPath: string = DEFAULT_ROUND3_MARKET_INTEL_PATH,
  options: LoadMarketIntelOptions = {},
): Promise<LoadMarketIntelResult> {
  const dryRun = options.dryRun === true;
  let text: string;
  try {
    text = await readFile(jsonPath, "utf-8");
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`round3_market_intel.json 읽기 실패: ${msg}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`JSON 파싱 실패: ${msg}`);
  }

  const file = parseRound3MarketIntelJson(parsed);
  const crawledAt = new Date().toISOString();
  const panamaRows = marketIntelFileToPanamaRows(file, crawledAt);
  const distRows = distributorsToRows(file.distributors, crawledAt);

  for (const row of panamaRows) {
    validatePanamaPhase1Common(row);
  }

  if (dryRun) {
    return {
      panamaInserted: panamaRows.length,
      distributorsInserted: distRows.length,
    };
  }

  try {
    const client = getSupabaseClient();
    if (panamaRows.length > 0) {
      const { error: e1 } = await client.from(PANAMA_TABLE).insert(panamaRows);
      if (e1 !== null) {
        throw new Error(
          `panama INSERT 실패: ${e1.message}. DDL·RLS·컬럼명을 확인하세요.`,
        );
      }
    }
    if (distRows.length > 0) {
      const { error: e2 } = await client
        .from(PANAMA_DISTRIBUTORS_TABLE)
        .insert(distRows);
      if (e2 !== null) {
        throw new Error(
          `panama_distributors INSERT 실패: ${e2.message}. DDL·RLS를 확인하세요.`,
        );
      }
    }
  } catch (e: unknown) {
    if (e instanceof Error) {
      throw new Error(`Supabase 적재 오류: ${e.message}`);
    }
    throw new Error("Supabase 적재 중 알 수 없는 오류가 발생했습니다.");
  }

  return {
    panamaInserted: panamaRows.length,
    distributorsInserted: distRows.length,
  };
}

/** dry-run 요약용 — 변환 결과 전체 */
export async function buildMarketIntelPayloadFromFile(
  jsonPath: string = DEFAULT_ROUND3_MARKET_INTEL_PATH,
): Promise<{
  readonly crawledAt: string;
  readonly panamaRows: PanamaPhase1InsertRow[];
  readonly distributorRows: PanamaDistributorInsertRow[];
}> {
  const text = await readFile(jsonPath, "utf-8");
  const parsed = JSON.parse(text) as unknown;
  const file = parseRound3MarketIntelJson(parsed);
  const crawledAt = new Date().toISOString();
  const panamaRows = marketIntelFileToPanamaRows(file, crawledAt);
  for (const row of panamaRows) {
    validatePanamaPhase1Common(row);
  }
  return {
    crawledAt,
    panamaRows,
    distributorRows: distributorsToRows(file.distributors, crawledAt),
  };
}

function writeStdoutLine(obj: unknown): void {
  process.stdout.write(`${JSON.stringify(obj, null, 2)}\n`);
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const path = DEFAULT_ROUND3_MARKET_INTEL_PATH;

  if (dryRun) {
    const { crawledAt, panamaRows, distributorRows } =
      await buildMarketIntelPayloadFromFile(path);
    writeStdoutLine({
      dryRun: true,
      path,
      crawledAt,
      panamaRowCount: panamaRows.length,
      distributorRowCount: distributorRows.length,
      panamaRows,
      distributorRows,
    });
    return;
  }

  const result = await loadMarketIntelFromFile(path, { dryRun: false });
  writeStdoutLine({
    dryRun: false,
    path,
    panamaInserted: result.panamaInserted,
    distributorsInserted: result.distributorsInserted,
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
