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
  classification?: OcdsClassification;
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
const MAX_PAGES_PER_KEYWORD = 8;
/** 매칭 릴리스가 이 개수 이상이면 페이지 순회 중단(과도 페이징 방지) */
const MAX_MATCHED_RELEASES = 40;
/** 이 페이지 수까지 매칭 0이면 키워드 미존재로 보고 조기 종료 */
const MAX_PAGES_WHEN_ZERO_MATCH = 3;
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

function awardToPanamaRow(
  release: OcdsRelease,
  award: OcdsAward,
  product: ProductMaster,
  matchedKeyword: string,
  crawledAt: string,
): PanamaPhase1InsertRow | null {
  const v = award.value;
  if (v === undefined || typeof v.amount !== "number") {
    return null;
  }
  const firstItem = award.items?.[0];
  const desc =
    firstItem?.description ??
    award.description ??
    release.tender?.title ??
    release.tender?.description ??
    "";
  const supplierName = award.suppliers?.[0]?.name ?? "unknown";

  const paNotes = `[TENDER] ocid=${release.ocid}, award_id=${award.id}, supplier=${supplierName}`;

  return {
    product_id: product.product_id,
    market_segment: "public",
    fob_estimated_usd: null,
    confidence: CONFIDENCE_PANAMACOMPRA,
    crawled_at: crawledAt,
    pa_source: PA_SOURCE,
    pa_source_url: buildReleaseSourceUrl(release),
    pa_collected_at: award.date ?? release.date,
    pa_product_name_local: desc.slice(0, 2000),
    pa_ingredient_inn: matchedKeyword,
    pa_price_type: "tender_award",
    pa_price_local: v.amount,
    pa_currency_unit: "USD",
    pa_package_unit: firstItem?.unit?.name ?? null,
    pa_decree_listed: null,
    pa_stock_status: null,
    pa_notes: paNotes,
  };
}

/** 키워드에 해당하는 릴리스만 — award 평탄화는 별도 */
function flattenReleasesToRows(
  releases: readonly OcdsRelease[],
  product: ProductMaster,
  matchedKeyword: string,
  crawledAt: string,
): PanamaPhase1InsertRow[] {
  const out: PanamaPhase1InsertRow[] = [];
  for (const rel of releases) {
    for (const award of rel.awards ?? []) {
      const row = awardToPanamaRow(rel, award, product, matchedKeyword, crawledAt);
      if (row !== null) {
        out.push(row);
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
  params.set("filter[items.classification.id]", UNSPSC_PHARMA_SEGMENT);
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
    for (const keyword of product.panama_search_keywords) {
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
