/**
 * PanamaCompra OCDS API — 공공 낙찰 → panama (market_segment=public, tender_award)
 *
 * 실제 엔드포인트: .../api/v1/releases (문서의 .../ocds/release 는 404)
 * UNSPSC 51000000 필터 + 키워드는 tender/award/items 텍스트 부분일치로 필터링.
 *
 * 개발 서버 TLS 인증서 만료 가능 → 기본은 검증 완화.
 * 엄격 검증: PANAMACOMPRA_OCDS_STRICT_TLS=1
 */
import { normalize } from "node:path";
import { fileURLToPath } from "node:url";

import {
  getSupabaseClient,
  PANAMA_TABLE,
  validatePanamaPhase1Common,
  type PanamaPhase1InsertRow,
} from "../../utils/db_connector.js";
import {
  findProductByKeyword,
  findProductByPanamaText,
  TARGET_PRODUCTS,
  type ProductMaster,
} from "../../utils/product-dictionary.js";

// ─── OCDS 타입 (응답 필드 최소 명시, any 금지) ───

export interface OcdsMoney {
  amount: number;
  currency: string;
  valueAddedTaxIncluded?: boolean;
}

export interface OcdsClassification {
  scheme: string;
  id: string;
  description?: string;
}

export interface OcdsAwardItem {
  id: string;
  description?: string;
  /** 품목 단위 낙찰 금액(OCDS 실측 — award.value 대신 우선) */
  totalValue?: OcdsMoney;
  classification?: OcdsClassification;
  /** 수량(있으면 pa_notes에 반영) */
  quantity?: number;
  unit?: {
    name?: string;
    scheme?: string;
    value?: OcdsMoney;
  };
}

export interface OcdsAward {
  id: string;
  title?: string;
  description?: string;
  value?: OcdsMoney;
  suppliers?: ReadonlyArray<{ id: string; name: string }>;
  date?: string;
  items?: ReadonlyArray<OcdsAwardItem>;
}

export interface OcdsTender {
  uri?: string;
  title?: string;
  description?: string;
}

export interface OcdsRelease {
  ocid: string;
  id: string;
  date: string;
  tag?: readonly string[];
  awards?: ReadonlyArray<OcdsAward>;
  buyer?: { id: string; name: string };
  tender?: OcdsTender;
}

export interface OcdsLinks {
  next?: string | null;
  prev?: string | null;
}

export interface OcdsApiResponse {
  releases: readonly OcdsRelease[];
  links?: OcdsLinks;
  uri?: string;
}

// ─── 상수 ───

const UNSPSC_PHARMA_SEGMENT = "51000000";

const PAGE_SIZE = 50;
/** 키워드별 OCDS 페이징 상한 — 값을 키우면 8품목·다중 검색어에서 실행 시간이 길어짐 */
const MAX_PAGES_PER_KEYWORD = 12;
/** 매칭 릴리스가 이 개수 이상이면 페이지 순회 중단(과도 페이징 방지) */
const MAX_MATCHED_RELEASES = 40;
/** 이 페이지 수까지 매칭 0이면 키워드 미존재로 보고 조기 종료 (이전 3은 과도하게 짧음) */
const MAX_PAGES_WHEN_ZERO_MATCH = 8;
const MAX_RESULTS_PER_INN = 20;
const CONFIDENCE_PANAMACOMPRA = 0.9;
const PA_SOURCE = "panamacompra" as const;

const OCDS_RELEASES_BASE =
  "https://ocdsv2dev.panamacompraencifras.gob.pa/api/v1/releases";

const USER_AGENT = "Mozilla/5.0 (compatible; KitaAxResearch/1.0)";

/** true면 TLS 인증서 엄격 검증(기본 false — ocdsv2dev 만료 인증서 대응) */
function tlsStrictVerify(): boolean {
  return process.env.PANAMACOMPRA_OCDS_STRICT_TLS === "1";
}

function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function randomDelayMs(): number {
  return 1500 + Math.floor(Math.random() * 1500);
}

function releaseMatchesKeyword(
  release: OcdsRelease,
  keyword: string,
): boolean {
  const k = keyword.trim().toLowerCase();
  if (k === "") {
    return false;
  }
  /** 페이징 후보: tender·award·품목 텍스트 전부 (적재 단계는 itemToPanamaRow에서 재검증) */
  const chunks: string[] = [];
  if (release.tender?.title !== undefined) {
    chunks.push(release.tender.title);
  }
  if (release.tender?.description !== undefined) {
    chunks.push(release.tender.description);
  }
  for (const a of release.awards ?? []) {
    if (a.title !== undefined) {
      chunks.push(a.title);
    }
    if (a.description !== undefined) {
      chunks.push(a.description);
    }
    for (const it of a.items ?? []) {
      if (it.description !== undefined) {
        chunks.push(it.description);
      }
      if (it.classification?.description !== undefined) {
        chunks.push(it.classification.description);
      }
    }
  }
  const blob = chunks.join(" ").toLowerCase();
  return blob.includes(k);
}

function buildReleaseSourceUrl(release: OcdsRelease): string {
  const u = release.tender?.uri;
  if (u !== undefined && u.trim() !== "") {
    return u.trim();
  }
  return `${OCDS_RELEASES_BASE}?ocid=${encodeURIComponent(release.ocid)}`;
}

/** 품목·낙찰·공고 텍스트로 매칭된 제품이 현재 루프 제품과 일치하는지 */
function itemBlobMatchesProduct(blob: string, product: ProductMaster): boolean {
  const resolved = findProductByPanamaText(blob);
  return resolved !== undefined && resolved.product_id === product.product_id;
}

/** pa_ingredient_inn 표기 — 키워드 우선, 없으면 WHO INN(영문) 일치 시 사용 */
function firstMatchedPanamaKeywordOrInn(
  product: ProductMaster,
  blob: string,
): string | null {
  const low = blob.toLowerCase();
  for (const kw of product.panama_search_keywords) {
    if (low.includes(kw.trim().toLowerCase())) {
      return kw;
    }
  }
  const inn = product.who_inn_en.trim().toLowerCase();
  if (inn !== "" && low.includes(inn)) {
    return product.who_inn_en;
  }
  return null;
}

function buildItemBlob(
  release: OcdsRelease,
  award: OcdsAward,
  item: OcdsAwardItem,
): string {
  const parts: string[] = [];
  if (release.tender?.title !== undefined) {
    parts.push(release.tender.title);
  }
  if (release.tender?.description !== undefined) {
    parts.push(release.tender.description);
  }
  if (award.title !== undefined) {
    parts.push(award.title);
  }
  if (award.description !== undefined) {
    parts.push(award.description);
  }
  if (item.description !== undefined) {
    parts.push(item.description);
  }
  if (item.classification?.description !== undefined) {
    parts.push(item.classification.description);
  }
  return parts.join(" ");
}

function pickMoneyForRow(
  item: OcdsAwardItem,
  award: OcdsAward,
): OcdsMoney | null {
  const iv = item.totalValue;
  if (
    iv !== undefined &&
    typeof iv.amount === "number" &&
    !Number.isNaN(iv.amount)
  ) {
    return iv;
  }
  const av = award.value;
  if (
    av !== undefined &&
    typeof av.amount === "number" &&
    !Number.isNaN(av.amount)
  ) {
    return av;
  }
  return null;
}

function currencyForRow(m: OcdsMoney): string {
  const c = m.currency.trim().toUpperCase();
  if (c === "PAB" || c === "USD") {
    return c;
  }
  return m.currency;
}

/**
 * OCDS 품목(awards[].items[]) 단위 행 — MACRO 폴백 없음, 매칭 실패 시 null
 *
 * (이전) award 단위 + award.value만 사용하던 구현은 품목 totalValue 누락으로 행이
 * 버려질 수 있어 주석 보존:
 * // function awardToPanamaRow(...) { award.value만 사용; items 미순회 }
 */
function itemToPanamaRow(
  release: OcdsRelease,
  award: OcdsAward,
  item: OcdsAwardItem,
  product: ProductMaster,
  crawledAt: string,
): PanamaPhase1InsertRow | null {
  const blob = buildItemBlob(release, award, item);
  if (!itemBlobMatchesProduct(blob, product)) {
    return null;
  }
  const kwTag = firstMatchedPanamaKeywordOrInn(product, blob);
  if (kwTag === null) {
    return null;
  }
  const resolved = findProductByPanamaText(blob);
  if (resolved === undefined || resolved.product_id !== product.product_id) {
    return null;
  }
  const money = pickMoneyForRow(item, award);
  if (money === null) {
    return null;
  }
  const desc =
    item.description ??
    award.description ??
    release.tender?.title ??
    release.tender?.description ??
    "";
  const supplierName = award.suppliers?.[0]?.name ?? "unknown";
  const qty =
    item.quantity !== undefined && !Number.isNaN(item.quantity)
      ? String(item.quantity)
      : "?";
  const unitName = item.unit?.name ?? "?";
  const collected = award.date ?? release.date;

  const paNotes =
    `[TENDER] ocid=${release.ocid}, award_id=${award.id}, item_id=${item.id}, ` +
    `supplier=${supplierName}, qty=${qty}, unit=${unitName}, ` +
    `collected=${collected}`;

  return {
    product_id: product.product_id,
    market_segment: "public",
    fob_estimated_usd: null,
    confidence: CONFIDENCE_PANAMACOMPRA,
    crawled_at: crawledAt,
    pa_source: PA_SOURCE,
    pa_source_url: buildReleaseSourceUrl(release),
    pa_collected_at: collected,
    pa_product_name_local: desc.slice(0, 2000),
    pa_ingredient_inn: kwTag,
    pa_price_type: "tender_award",
    pa_price_local: money.amount,
    pa_currency_unit: currencyForRow(money),
    pa_package_unit: item.unit?.name ?? null,
    pa_decree_listed: null,
    pa_stock_status: null,
    pa_notes: paNotes,
  };
}

/** 릴리스별 awards[].items[] 순회 — INN 키워드 미매칭 행은 스킵 */
function flattenReleasesToRows(
  releases: readonly OcdsRelease[],
  product: ProductMaster,
  _matchedKeyword: string,
  crawledAt: string,
): PanamaPhase1InsertRow[] {
  const out: PanamaPhase1InsertRow[] = [];
  for (const rel of releases) {
    for (const award of rel.awards ?? []) {
      for (const item of award.items ?? []) {
        const row = itemToPanamaRow(rel, award, item, product, crawledAt);
        if (row !== null) {
          out.push(row);
        }
      }
    }
  }
  return out;
}

async function fetchJsonWithTls(url: string): Promise<unknown> {
  const { Agent, fetch: undiciFetch } = await import("undici");
  const agent = new Agent({
    connect: { rejectUnauthorized: tlsStrictVerify() },
  });
  const res = await undiciFetch(url, {
    dispatcher: agent,
    headers: {
      Accept: "application/json",
      "User-Agent": USER_AGENT,
    },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${String(res.status)} ${res.statusText}`);
  }
  return (await res.json()) as unknown;
}

function isOcdsApiResponse(v: unknown): v is OcdsApiResponse {
  if (typeof v !== "object" || v === null) {
    return false;
  }
  const o = v as Record<string, unknown>;
  return Array.isArray(o.releases);
}

function buildFirstPageUrl(): string {
  const params = new URLSearchParams();
  params.set("page[size]", String(PAGE_SIZE));
  /* UNSPSC 51000000만 보면 의약품 키워드가 본문에 안 나오는 릴리스만 연속으로 잡혀
   * 키워드 매칭 0건이 됨 → 키워드 검색 경로에서는 필터 제거(실측 세션16). */
  // params.set("filter[items.classification.id]", UNSPSC_PHARMA_SEGMENT);
  return `${OCDS_RELEASES_BASE}?${params.toString()}`;
}

/**
 * UNSPSC 51000000 구간을 페이지 순회하며 키워드가 본문에 포함된 릴리스만 수집.
 */
export async function fetchOcdsReleasesByKeyword(
  keyword: string,
): Promise<OcdsRelease[]> {
  const matched: OcdsRelease[] = [];
  let nextUrl: string | null = buildFirstPageUrl();
  let pages = 0;

  while (nextUrl !== null && pages < MAX_PAGES_PER_KEYWORD) {
    if (pages > 0) {
      await sleepMs(randomDelayMs());
    }
    const raw = await fetchJsonWithTls(nextUrl);
    pages += 1;
    if (!isOcdsApiResponse(raw)) {
      throw new Error("OCDS 응답 형식이 올바르지 않습니다(releases 배열 없음).");
    }
    for (const rel of raw.releases) {
      if (releaseMatchesKeyword(rel, keyword)) {
        matched.push(rel);
      }
    }
    if (matched.length >= MAX_MATCHED_RELEASES) {
      break;
    }
    if (matched.length === 0 && pages >= MAX_PAGES_WHEN_ZERO_MATCH) {
      break;
    }
    const n = raw.links?.next;
    nextUrl = n !== undefined && n !== null && n !== "" ? n : null;
  }

  return matched;
}

export interface SummarizeByProductEntry {
  who_inn_en: string;
  rowCount: number;
}

export function summarizeByProduct(
  rows: readonly PanamaPhase1InsertRow[],
): SummarizeByProductEntry[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    const hit = TARGET_PRODUCTS.find((p) => p.product_id === r.product_id);
    const label = hit?.who_inn_en ?? r.product_id;
    map.set(label, (map.get(label) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([who_inn_en, rowCount]) => ({ who_inn_en, rowCount }))
    .sort((a, b) => a.who_inn_en.localeCompare(b.who_inn_en, "en"));
}

export async function crawlPanamaCompra(
  dryRun: boolean,
): Promise<{
  rows: PanamaPhase1InsertRow[];
  inserted: number;
  failed: number;
}> {
  const crawledAt = new Date().toISOString();
  const rows: PanamaPhase1InsertRow[] = [];
  let consecutiveErrors = 0;

  for (const product of TARGET_PRODUCTS) {
    let hitForProduct = false;
    const searchTerms = [
      ...product.panama_search_keywords.map((k) => k.trim()),
      product.who_inn_en.trim(),
    ].filter((k) => k !== "");
    const uniqueTerms = [...new Set(searchTerms)];
    for (const keyword of uniqueTerms) {
      const byDict = findProductByKeyword(keyword);
      if (byDict !== undefined && byDict.product_id !== product.product_id) {
        continue;
      }
      try {
        await sleepMs(randomDelayMs());
        const releases = await fetchOcdsReleasesByKeyword(keyword);
        if (releases.length > 0) {
          const extracted = flattenReleasesToRows(
            releases,
            product,
            keyword,
            crawledAt,
          );
          const sliced = extracted.slice(0, MAX_RESULTS_PER_INN);
          if (sliced.length > 0) {
            rows.push(...sliced);
            consecutiveErrors = 0;
            hitForProduct = true;
            break;
          }
        }
        consecutiveErrors = 0;
      } catch (err: unknown) {
        consecutiveErrors += 1;
        const msg = err instanceof Error ? err.message : String(err);
        if (consecutiveErrors >= 3) {
          throw new Error(
            `연속 에러 3회 도달로 중단합니다. 마지막 오류: ${msg}`,
          );
        }
      }
    }
    if (!hitForProduct) {
      consecutiveErrors = 0;
    }
  }

  if (dryRun) {
    return { rows, inserted: 0, failed: 0 };
  }

  if (rows.length === 0) {
    return { rows, inserted: 0, failed: 0 };
  }

  for (const row of rows) {
    validatePanamaPhase1Common(row);
  }

  const client = getSupabaseClient();
  const { error } = await client.from(PANAMA_TABLE).insert([...rows]);
  if (error !== null) {
    return { rows, inserted: 0, failed: rows.length };
  }

  return { rows, inserted: rows.length, failed: 0 };
}

function writeStdoutJson(obj: unknown): void {
  process.stdout.write(`${JSON.stringify(obj, null, 2)}\n`);
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const result = await crawlPanamaCompra(dryRun);

  if (dryRun) {
    writeStdoutJson({
      dryRun: true,
      rowCount: result.rows.length,
      sample: result.rows[0] ?? null,
      byProduct: summarizeByProduct(result.rows),
    });
    return;
  }

  writeStdoutJson({
    dryRun: false,
    inserted: result.inserted,
    failed: result.failed,
    rowCount: result.rows.length,
  });
}

const invoked = process.argv[1];
if (invoked !== undefined) {
  const a = normalize(fileURLToPath(import.meta.url));
  const b = normalize(invoked);
  if (a === b) {
    main().catch((e: unknown) => {
      process.stderr.write(
        `${e instanceof Error ? e.message : String(e)}\n`,
      );
      process.exit(1);
    });
  }
}
