/**
 * PanamaCompra OCDS — ATC4 동급 경쟁품 낙찰 → panama (pa_source: panamacompra_atc4_competitor)
 * pa_panamacompra.ts(자사 직접 매칭) 미수정. OCDS fetch만 재사용.
 */
/// <reference types="node" />

import { normalize } from "node:path";
import { fileURLToPath } from "node:url";

import {
  getSupabaseClient,
  insertRow,
  PANAMA_TABLE,
  validatePanamaPhase1Common,
  type PanamaPhase1InsertRow,
} from "../../utils/db_connector.js";
import { findProductById } from "../../utils/product-dictionary.js";

import type {
  OcdsApiResponse,
  OcdsAward,
  OcdsAwardItem,
  OcdsMoney,
  OcdsRelease,
} from "./pa_panamacompra.js";

const PA_SOURCE_ATC4 = "panamacompra_atc4_competitor" as const;
const CONFIDENCE_ATC4 = 0.8;
const OCDS_RELEASES_BASE =
  "https://ocdsv2dev.panamacompraencifras.gob.pa/api/v1/releases";
const USER_AGENT_ATC4 =
  "Mozilla/5.0 (compatible; UnitedPanama-ATC4/1.0)";
/** pa_panamacompra.ts 기본값(8페이지 조기 종료)은 비의약품 연속 페이지에서 키워드 0건이 되므로 ATC4 전용으로 상향 */
const PAGE_SIZE_ATC4 = 50;
const MAX_PAGES_PER_KEYWORD_ATC4 = 40;
const MAX_MATCHED_RELEASES_ATC4 = 120;
const MAX_PAGES_WHEN_ZERO_ATC4 = 35;
/**
 * 기본 900일 — OCDS 피드에 노출되는 낙찰이 2024년 상반기인 경우가 많아 730일이면 제외됨(실측 2024-03).
 * 365일만 원하면 PANAMACOMPRA_ATC4_LOOKBACK_DAYS=365
 */
function procurementLookbackMs(): number {
  const raw = process.env.PANAMACOMPRA_ATC4_LOOKBACK_DAYS?.trim();
  const days =
    raw !== undefined && raw !== ""
      ? Number.parseInt(raw, 10)
      : 900;
  if (!Number.isFinite(days) || days < 30 || days > 3650) {
    return 900 * 24 * 60 * 60 * 1000;
  }
  return days * 24 * 60 * 60 * 1000;
}
/** 전체 적재 상한 */
const MAX_TOTAL_INSERTS = 250;

function tlsStrictVerifyAtc4(): boolean {
  return process.env.PANAMACOMPRA_OCDS_STRICT_TLS === "1";
}

async function fetchJsonWithTlsAtc4(url: string): Promise<unknown> {
  const { Agent, fetch: undiciFetch } = await import("undici");
  const agent = new Agent({
    connect: { rejectUnauthorized: tlsStrictVerifyAtc4() },
  });
  const res = await undiciFetch(url, {
    dispatcher: agent,
    headers: {
      Accept: "application/json",
      "User-Agent": USER_AGENT_ATC4,
    },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${String(res.status)} ${res.statusText}`);
  }
  return (await res.json()) as unknown;
}

function isOcdsApiResponseAtc4(v: unknown): v is OcdsApiResponse {
  if (typeof v !== "object" || v === null) {
    return false;
  }
  const o = v as Record<string, unknown>;
  return Array.isArray(o.releases);
}

function buildFirstPageUrlAtc4(): string {
  const params = new URLSearchParams();
  params.set("page[size]", String(PAGE_SIZE_ATC4));
  return `${OCDS_RELEASES_BASE}?${params.toString()}`;
}

/** pa_panamacompra.releaseMatchesKeyword 와 동일 로직 — 키워드 부분일치 */
function releaseMatchesKeywordAtc4(
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
      if (it.classification?.description !== undefined) {
        chunks.push(it.classification.description);
      }
    }
  }
  const blob = chunks.join(" ").toLowerCase();
  return blob.includes(k);
}

/**
 * ATC4 경쟁품용 — 글로벌 피드에서 의약 키워드가 늦게 나올 수 있어 페이징 상한을 넓힘.
 * pa_panamacompra.ts 미수정.
 */
export async function fetchOcdsReleasesByKeywordAtc4(
  keyword: string,
): Promise<OcdsRelease[]> {
  const matched: OcdsRelease[] = [];
  let nextUrl: string | null = buildFirstPageUrlAtc4();
  let pages = 0;

  while (nextUrl !== null && pages < MAX_PAGES_PER_KEYWORD_ATC4) {
    if (pages > 0) {
      await sleepMs(randomDelayMs());
    }
    const raw = await fetchJsonWithTlsAtc4(nextUrl);
    pages += 1;
    if (!isOcdsApiResponseAtc4(raw)) {
      throw new Error("OCDS 응답 형식이 올바르지 않습니다(releases 배열 없음).");
    }
    for (const rel of raw.releases) {
      if (releaseMatchesKeywordAtc4(rel, keyword)) {
        matched.push(rel);
      }
    }
    if (matched.length >= MAX_MATCHED_RELEASES_ATC4) {
      break;
    }
    if (matched.length === 0 && pages >= MAX_PAGES_WHEN_ZERO_ATC4) {
      break;
    }
    const n = raw.links?.next;
    nextUrl = n !== undefined && n !== null && n !== "" ? n : null;
  }

  return matched;
}

interface CompetitorRuleOcds {
  atc4: string;
  selfInn: string;
  selfProductId: string;
  keywords: readonly string[];
  excludedForms?: readonly string[];
}

const COMPETITOR_KEYWORDS_OCDS: readonly CompetitorRuleOcds[] = [
  {
    atc4: "B01AC",
    selfInn: "Cilostazol",
    selfProductId: "fcae4399-aa80-4318-ad55-89d6401c10a9",
    keywords: ["CLOPIDOGREL", "TICAGRELOR", "PRASUGREL"],
  },
  {
    atc4: "L01XX",
    selfInn: "Hydroxyurea",
    selfProductId: "bdfc9883-6040-438a-8e7a-df01f1230682",
    keywords: ["HIDROXIUREA", "HIDROXICARBAMIDA"],
  },
  {
    atc4: "A03FA",
    selfInn: "Itopride",
    selfProductId: "24738c3b-3a5b-40a9-9e8e-889ec075b453",
    keywords: ["METOCLOPRAMIDA", "DOMPERIDONA", "MOSAPRIDA"],
  },
  {
    atc4: "M01AB",
    selfInn: "Aceclofenac",
    selfProductId: "2504d79b-c2ce-4660-9ea7-5576c8bb755f",
    keywords: ["DICLOFENACO", "INDOMETACINA", "KETOPROFENO"],
    excludedForms: ["GEL", "TÓPICO", "TOPICO", "CREMA", "POMADA"],
  },
  {
    atc4: "A02BC",
    selfInn: "Rabeprazole",
    selfProductId: "859e60f9-8544-43b3-a6a0-f6c7529847eb",
    keywords: ["OMEPRAZOL", "ESOMEPRAZOL", "PANTOPRAZOL", "LANSOPRAZOL"],
  },
  {
    atc4: "R05CB",
    selfInn: "Erdosteine",
    selfProductId: "014fd4d2-dc66-4fc1-8d4f-59695183387f",
    keywords: [
      "ACETILCISTEÍNA",
      "ACETILCISTEINA",
      "AMBROXOL",
      "BROMHEXINA",
      "CARBOCISTEÍNA",
      "CARBOCISTEINA",
    ],
  },
  {
    atc4: "C10AX",
    selfInn: "Omega-3",
    selfProductId: "f88b87b8-c0ab-4f6e-ba34-e9330d1d4e18",
    keywords: ["FENOFIBRATO", "EZETIMIBA", "OMEGA"],
  },
  {
    atc4: "R05DB",
    selfInn: "Levodropropizine",
    selfProductId: "895f49ae-6ce3-44a3-93bd-bb77e027ba59",
    keywords: ["BUTAMIRATO"],
  },
];

interface PanamacompraAtc4Notes {
  ocds_release_id: string;
  buyer_entity: string;
  supplier_name: string;
  contract_date: string;
  quantity_awarded: number | null;
  competitor_inn: string;
  self_inn_target: string;
  self_inn_atc4: string;
  match_type: "competitor_same_atc4";
  data_nature: "public_procurement_award";
  is_government_procurement: true;
  usage_purpose: string;
  self_inn_strategy: string;
}

function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function randomDelayMs(): number {
  return 1500 + Math.floor(Math.random() * 1500);
}

function stripForMatch(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

function isExcludedByForm(
  normalizedDesc: string,
  excludedForms: readonly string[] | undefined,
): boolean {
  if (excludedForms === undefined || excludedForms.length === 0) {
    return false;
  }
  for (const ex of excludedForms) {
    const token = stripForMatch(ex);
    if (token !== "" && normalizedDesc.includes(token)) {
      return true;
    }
  }
  return false;
}

/** 릴리스·낙찰 중 최신 시점이 lookback 이내이면 포함 */
function isReleaseRecentForProcurement(release: OcdsRelease): boolean {
  const cutoff = Date.now() - procurementLookbackMs();
  const candidates: number[] = [];
  const rd = Date.parse(release.date);
  if (!Number.isNaN(rd)) {
    candidates.push(rd);
  }
  for (const a of release.awards ?? []) {
    if (a.date !== undefined && a.date !== "") {
      const ad = Date.parse(a.date);
      if (!Number.isNaN(ad)) {
        candidates.push(ad);
      }
    }
  }
  if (candidates.length === 0) {
    return false;
  }
  return Math.max(...candidates) >= cutoff;
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

function buildReleaseSourceUrl(release: OcdsRelease): string {
  const u = release.tender?.uri;
  if (u !== undefined && u.trim() !== "") {
    return u.trim();
  }
  return `${OCDS_RELEASES_BASE}?ocid=${encodeURIComponent(release.ocid)}`;
}

function blobContainsKeyword(blob: string, keyword: string): boolean {
  const k = keyword.trim().toLowerCase();
  if (k === "") {
    return false;
  }
  return blob.toLowerCase().includes(k);
}

function buildFingerprint(
  releaseId: string,
  competitorInn: string,
  selfInnTarget: string,
): string {
  return `${releaseId}|${competitorInn}|${selfInnTarget}`;
}

async function loadExistingFingerprints(): Promise<Set<string>> {
  const set = new Set<string>();
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from(PANAMA_TABLE)
      .select("pa_notes")
      .eq("pa_source", PA_SOURCE_ATC4);
    if (error !== null) {
      console.warn(
        `[panamacompra_atc4] 기존 행 조회 경고: ${error.message}`,
      );
      return set;
    }
    for (const row of data ?? []) {
      const raw = row.pa_notes;
      if (typeof raw !== "string") {
        continue;
      }
      try {
        const j = JSON.parse(raw) as {
          ocds_release_id?: string;
          competitor_inn?: string;
          self_inn_target?: string;
        };
        if (
          j.ocds_release_id !== undefined &&
          j.competitor_inn !== undefined &&
          j.self_inn_target !== undefined
        ) {
          set.add(
            buildFingerprint(
              j.ocds_release_id,
              j.competitor_inn,
              j.self_inn_target,
            ),
          );
        }
      } catch {
        continue;
      }
    }
  } catch (e: unknown) {
    console.warn(
      `[panamacompra_atc4] 중복 지문 로드 실패: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
  return set;
}

function itemToAtc4Row(
  release: OcdsRelease,
  award: OcdsAward,
  item: OcdsAwardItem,
  rule: CompetitorRuleOcds,
  matchedKeyword: string,
  productWhoInn: string,
  crawledAt: string,
): PanamaPhase1InsertRow | null {
  const blob = buildItemBlob(release, award, item);
  if (!blobContainsKeyword(blob, matchedKeyword)) {
    return null;
  }
  const upperBlob = stripForMatch(blob);
  if (isExcludedByForm(upperBlob, rule.excludedForms)) {
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
  const collected = award.date ?? release.date;
  const qty =
    item.quantity !== undefined && typeof item.quantity === "number"
      ? item.quantity
      : null;

  const notes: PanamacompraAtc4Notes = {
    ocds_release_id: release.id,
    buyer_entity: release.buyer?.name ?? "",
    supplier_name: supplierName,
    contract_date: collected,
    quantity_awarded: qty,
    competitor_inn: matchedKeyword,
    self_inn_target: productWhoInn,
    self_inn_atc4: rule.atc4,
    match_type: "competitor_same_atc4",
    data_nature: "public_procurement_award",
    is_government_procurement: true,
    usage_purpose:
      "공공조달 낙찰가 = 정부 대량 구매 실거래가. 자사 가격 책정 하한 참조 (정부 대량 입찰가 기준)",
    self_inn_strategy:
      "자사 개량신약 가격은 공공조달가의 2~5배 수준 책정 가능 (민간 시장은 정부 대량 구매보다 비쌈)",
  };

  return {
    product_id: rule.selfProductId,
    market_segment: "public",
    fob_estimated_usd: null,
    confidence: CONFIDENCE_ATC4,
    crawled_at: crawledAt,
    pa_source: PA_SOURCE_ATC4,
    pa_source_url: buildReleaseSourceUrl(release),
    pa_collected_at: collected,
    pa_price_type: "tender_award",
    pa_price_local: money.amount,
    pa_currency_unit: currencyForRow(money),
    pa_product_name_local: desc.slice(0, 2000),
    pa_ingredient_inn: matchedKeyword.slice(0, 500),
    pa_notes: JSON.stringify(notes),
  };
}

export interface CrawlPanamaCompraAtc4Result {
  matchedCandidates: number;
  /** 후보 매칭 ATC4별 건수(중복 포함) */
  matchedByAtc4: Record<string, number>;
  acceptedNonDuplicate: number;
  /** 적재(또는 드라이런 시뮬레이션) ATC4별 건수 — 중복 제외 */
  acceptedByAtc4: Record<string, number>;
  inserted: number;
  skippedDuplicate: number;
  failed: number;
  dryRun: boolean;
  hitMaxTotal: boolean;
}

export async function crawlPanamaCompraAtc4(
  dryRun: boolean,
): Promise<CrawlPanamaCompraAtc4Result> {
  const crawledAt = new Date().toISOString();
  let inserted = 0;
  let skippedDuplicate = 0;
  let failed = 0;
  let matchedCandidates = 0;
  const matchedByAtc4: Record<string, number> = {};
  const acceptedByAtc4: Record<string, number> = {};
  let acceptedNonDuplicate = 0;
  let hitMaxTotal = false;

  const existingFp = dryRun ? new Set<string>() : await loadExistingFingerprints();
  const sessionFp = new Set<string>();

  const ruleOffEnv = process.env.PANAMACOMPRA_ATC4_RULE_OFFSET?.trim();
  const ruleOffset =
    ruleOffEnv !== undefined && ruleOffEnv !== ""
      ? Number.parseInt(ruleOffEnv, 10)
      : 0;
  const maxRulesEnv = process.env.PANAMACOMPRA_ATC4_MAX_RULES?.trim();
  const maxRules =
    maxRulesEnv !== undefined && maxRulesEnv !== ""
      ? Number.parseInt(maxRulesEnv, 10)
      : undefined;
  const maxKwEnv = process.env.PANAMACOMPRA_ATC4_MAX_KEYWORDS_PER_RULE?.trim();
  const maxKwPerRule =
    maxKwEnv !== undefined && maxKwEnv !== ""
      ? Number.parseInt(maxKwEnv, 10)
      : undefined;

  const ro =
    Number.isFinite(ruleOffset) && ruleOffset > 0 ? ruleOffset : 0;
  const rulesToRun =
    maxRules !== undefined && Number.isFinite(maxRules) && maxRules > 0
      ? COMPETITOR_KEYWORDS_OCDS.slice(ro, ro + maxRules)
      : COMPETITOR_KEYWORDS_OCDS.slice(ro);

  outer: for (const rule of rulesToRun) {
    const product = findProductById(rule.selfProductId);
    if (product === undefined) {
      continue;
    }
    const selfInnTarget = product.who_inn_en;

    const kws =
      maxKwPerRule !== undefined &&
      Number.isFinite(maxKwPerRule) &&
      maxKwPerRule > 0
        ? rule.keywords.slice(0, maxKwPerRule)
        : [...rule.keywords];

    for (const kw of kws) {
      try {
        await sleepMs(randomDelayMs());
        const releases = await fetchOcdsReleasesByKeywordAtc4(kw);
        for (const rel of releases) {
          if (!isReleaseRecentForProcurement(rel)) {
            continue;
          }
          for (const award of rel.awards ?? []) {
            for (const item of award.items ?? []) {
              const row = itemToAtc4Row(
                rel,
                award,
                item,
                rule,
                kw,
                selfInnTarget,
                crawledAt,
              );
              if (row === null) {
                continue;
              }
              matchedCandidates += 1;
              matchedByAtc4[rule.atc4] = (matchedByAtc4[rule.atc4] ?? 0) + 1;
              const fp = buildFingerprint(rel.id, kw, selfInnTarget);
              if (existingFp.has(fp) || sessionFp.has(fp)) {
                skippedDuplicate += 1;
                continue;
              }
              if (dryRun) {
                sessionFp.add(fp);
                acceptedNonDuplicate += 1;
                acceptedByAtc4[rule.atc4] = (acceptedByAtc4[rule.atc4] ?? 0) + 1;
                if (acceptedNonDuplicate >= MAX_TOTAL_INSERTS) {
                  hitMaxTotal = true;
                  break outer;
                }
                continue;
              }
              validatePanamaPhase1Common(row);
              const ins = await insertRow(row);
              if (ins.ok) {
                inserted += 1;
                existingFp.add(fp);
                sessionFp.add(fp);
                acceptedNonDuplicate += 1;
                acceptedByAtc4[rule.atc4] = (acceptedByAtc4[rule.atc4] ?? 0) + 1;
                if (acceptedNonDuplicate >= MAX_TOTAL_INSERTS) {
                  hitMaxTotal = true;
                  break outer;
                }
              } else {
                failed += 1;
              }
            }
          }
        }
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.warn(
          `[panamacompra_atc4] 키워드 "${kw}" OCDS 조회 실패: ${msg}. 다음 키워드로 진행합니다.`,
        );
      }
    }
  }

  return {
    matchedCandidates,
    matchedByAtc4,
    acceptedNonDuplicate,
    acceptedByAtc4,
    inserted,
    skippedDuplicate,
    failed,
    dryRun,
    hitMaxTotal,
  };
}

function writeStdoutJson(obj: unknown): void {
  process.stdout.write(`${JSON.stringify(obj, null, 2)}\n`);
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const r = await crawlPanamaCompraAtc4(dryRun);
  writeStdoutJson({
    ok: true,
    pa_source: PA_SOURCE_ATC4,
    maxTotalInserts: MAX_TOTAL_INSERTS,
    ...r,
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
