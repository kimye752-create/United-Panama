/**
 * PanamaCompra OCDS 최근 7일 실시간 적재 (분석 중 백그라운드 실행용)
 */
/// <reference types="node" />

import { Agent, fetch as undiciFetch } from "undici";
import { insertRow, PANAMA_TABLE, getSupabaseClient } from "../../utils/db_connector";

const MAX_KEYWORDS_PER_RUN = 10;
const TIMEOUT_PER_KEYWORD_MS = 5_000;
const TOTAL_TIMEOUT_MS = 30_000;
const LOOKBACK_DAYS = 7;
const PA_SOURCE_RECENT = "panamacompra_recent" as const;

export interface OcdsRecentResult {
  totalFetched: number;
  newInserted: number;
  skippedDuplicate: number;
  failed: number;
  elapsedMs: number;
}

const OCDS_RELEASES_BASE =
  "https://ocdsv2dev.panamacompraencifras.gob.pa/api/v1/releases";
const PAGE_SIZE = 50;
const MAX_PAGES_PER_KEYWORD = 6;
// 파나마 정부 OCDS 서버 SSL 인증서 만료 상태 (2026-04)
// 파나마 측 갱신 시 dispatcher 옵션 제거 예정
const PANAMACOMPRA_AGENT = new Agent({
  connect: { rejectUnauthorized: false },
});

interface OcdsMoney {
  amount: number;
  currency: string;
}

interface OcdsAwardItem {
  id: string;
  description?: string;
  totalValue?: OcdsMoney;
  classification?: { description?: string };
  unit?: { name?: string };
}

interface OcdsAward {
  id: string;
  title?: string;
  description?: string;
  value?: OcdsMoney;
  date?: string;
  items?: ReadonlyArray<OcdsAwardItem>;
}

interface OcdsRelease {
  id: string;
  ocid: string;
  date: string;
  tender?: { title?: string; description?: string; uri?: string };
  awards?: ReadonlyArray<OcdsAward>;
}

function releaseMatchesKeyword(release: OcdsRelease, keyword: string): boolean {
  const k = keyword.toLowerCase();
  const blob = [
    release.tender?.title ?? "",
    release.tender?.description ?? "",
    ...(release.awards ?? []).flatMap((a) => [
      a.title ?? "",
      a.description ?? "",
      ...(a.items ?? []).flatMap((it) => [
        it.description ?? "",
        it.classification?.description ?? "",
      ]),
    ]),
  ]
    .join(" ")
    .toLowerCase();
  return blob.includes(k);
}

function buildFirstPageUrl(): string {
  const params = new URLSearchParams();
  params.set("page[size]", String(PAGE_SIZE));
  return `${OCDS_RELEASES_BASE}?${params.toString()}`;
}

function parseOcdsResponse(raw: unknown): {
  releases: OcdsRelease[];
  nextUrl: string | null;
} {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("OCDS 응답이 객체가 아닙니다.");
  }
  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj.releases)) {
    throw new Error("OCDS 응답에 releases 배열이 없습니다.");
  }
  const links =
    typeof obj.links === "object" && obj.links !== null
      ? (obj.links as Record<string, unknown>)
      : null;
  const nextRaw = links?.next;
  const nextUrl =
    typeof nextRaw === "string" && nextRaw.trim() !== "" ? nextRaw : null;
  return {
    releases: obj.releases as OcdsRelease[],
    nextUrl,
  };
}

async function fetchOcdsReleases(keyword: string): Promise<OcdsRelease[]> {
  const out: OcdsRelease[] = [];
  let nextUrl: string | null = buildFirstPageUrl();
  let page = 0;
  while (nextUrl !== null && page < MAX_PAGES_PER_KEYWORD) {
    const response = await undiciFetch(nextUrl, {
      method: "GET",
      // 파나마 정부 OCDS 서버 SSL 인증서 만료 상태 (2026-04)
      // 파나마 측 갱신 시 dispatcher 옵션 제거 예정
      dispatcher: PANAMACOMPRA_AGENT,
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; UnitedPanama/1.0)",
      },
    });
    if (!response.ok) {
      throw new Error(
        `OCDS API 호출 실패(HTTP ${String(response.status)}): 네트워크/TLS 상태를 확인하세요.`,
      );
    }
    const parsed = parseOcdsResponse((await response.json()) as unknown);
    for (const rel of parsed.releases) {
      if (releaseMatchesKeyword(rel, keyword)) {
        out.push(rel);
      }
    }
    nextUrl = parsed.nextUrl;
    page += 1;
  }
  return out;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        new Error(
          `${label} 타임아웃(${String(ms)}ms)입니다. 키워드 수를 줄이거나 네트워크 상태를 확인하세요.`,
        ),
      );
    }, ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error: unknown) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

function isRecentWithinDays(iso: string, days: number): boolean {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) {
    return false;
  }
  const now = Date.now();
  const diff = now - t;
  return diff >= 0 && diff <= days * 24 * 60 * 60 * 1000;
}

function firstMoney(item: OcdsAwardItem, award: OcdsAward): OcdsMoney | null {
  const iv = item.totalValue;
  if (iv !== undefined && Number.isFinite(iv.amount)) {
    return iv;
  }
  const av = award.value;
  if (av !== undefined && Number.isFinite(av.amount)) {
    return av;
  }
  return null;
}

function buildBlob(release: OcdsRelease, award: OcdsAward, item: OcdsAwardItem): string {
  return [
    release.tender?.title ?? "",
    release.tender?.description ?? "",
    award.title ?? "",
    award.description ?? "",
    item.description ?? "",
    item.classification?.description ?? "",
  ]
    .join(" ")
    .toLowerCase();
}

function currencyOrRaw(m: OcdsMoney): string {
  const c = m.currency.trim().toUpperCase();
  if (c === "PAB" || c === "USD") {
    return c;
  }
  return m.currency;
}

function releaseSourceUrl(release: OcdsRelease): string {
  const uri = release.tender?.uri;
  if (uri !== undefined && uri.trim() !== "") {
    return uri.trim();
  }
  return `https://ocdsv2dev.panamacompraencifras.gob.pa/api/v1/releases?ocid=${encodeURIComponent(release.ocid)}`;
}

function parseNotesReleaseId(paNotes: string | null): string | null {
  if (paNotes === null) {
    return null;
  }
  try {
    const raw: unknown = JSON.parse(paNotes);
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
      return null;
    }
    const rid = (raw as Record<string, unknown>)["ocds_release_id"];
    return typeof rid === "string" && rid !== "" ? rid : null;
  } catch {
    return null;
  }
}

async function loadExistingReleaseIds(sinceIso: string): Promise<Set<string>> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from(PANAMA_TABLE)
    .select("pa_notes")
    .eq("pa_source", PA_SOURCE_RECENT)
    .gte("pa_item_collected_at", sinceIso);
  if (error !== null || data === null) {
    throw new Error(
      `기존 panamacompra_recent 조회 실패: ${error?.message ?? "data null"}. DB 권한을 확인하세요.`,
    );
  }
  const out = new Set<string>();
  for (const row of data as { pa_notes: string | null }[]) {
    const id = parseNotesReleaseId(row.pa_notes);
    if (id !== null) {
      out.add(id);
    }
  }
  return out;
}

function toRecentRows(keyword: string, release: OcdsRelease) {
  const rows: {
    pa_source_url: string;
    pa_product_name_local: string;
    pa_price_local: number;
    pa_currency_unit: string;
    pa_package_unit: string | null;
    pa_notes: string;
    pa_item_collected_at: string;
  }[] = [];
  if (!isRecentWithinDays(release.date, LOOKBACK_DAYS)) {
    return rows;
  }
  for (const award of release.awards ?? []) {
    for (const item of award.items ?? []) {
      const blob = buildBlob(release, award, item);
      if (!blob.includes(keyword.toLowerCase())) {
        continue;
      }
      const money = firstMoney(item, award);
      if (money === null) {
        continue;
      }
      const unitName =
        item.unit?.name !== undefined && item.unit.name.trim() !== ""
          ? item.unit.name
          : null;
      rows.push({
        pa_source_url: releaseSourceUrl(release),
        pa_product_name_local:
          (item.description ?? award.description ?? release.tender?.title ?? "").slice(0, 2000),
        pa_price_local: money.amount,
        pa_currency_unit: currencyOrRaw(money),
        pa_package_unit: unitName,
        pa_notes: JSON.stringify({
          ocds_release_id: release.id,
          ocid: release.ocid,
          award_id: award.id,
          item_id: item.id,
          keyword,
          contract_date: award.date ?? release.date,
        }),
        pa_item_collected_at: release.date,
      });
    }
  }
  return rows;
}

export async function fetchAndInsertOcdsRecent(
  productId: string,
  keywords: string[],
): Promise<OcdsRecentResult> {
  const started = Date.now();
  const crawledAt = new Date().toISOString();
  const lookbackIso = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const existingReleaseIds = await loadExistingReleaseIds(lookbackIso);

  const uniqueKeywords = [...new Set(keywords.map((k) => k.trim()).filter((k) => k !== ""))]
    .slice(0, MAX_KEYWORDS_PER_RUN);
  console.info(`[ocds_recent] 백그라운드 시작: 키워드 ${String(uniqueKeywords.length)}개`);

  let totalFetched = 0;
  let newInserted = 0;
  let skippedDuplicate = 0;
  let failed = 0;
  const processedIds = new Set<string>();

  for (const keyword of uniqueKeywords) {
    const elapsed = Date.now() - started;
    if (elapsed >= TOTAL_TIMEOUT_MS) {
      console.warn(
        `[ocds_recent] 전체 타임아웃(${String(TOTAL_TIMEOUT_MS)}ms) 도달, 부분 결과로 종료`,
      );
      break;
    }
    try {
      const releases = await withTimeout(
        fetchOcdsReleases(keyword),
        TIMEOUT_PER_KEYWORD_MS,
        `키워드=${keyword}`,
      );
      totalFetched += releases.length;
      for (const release of releases) {
        if (!isRecentWithinDays(release.date, LOOKBACK_DAYS)) {
          continue;
        }
        if (existingReleaseIds.has(release.id) || processedIds.has(release.id)) {
          skippedDuplicate += 1;
          continue;
        }
        const rows = toRecentRows(keyword, release);
        if (rows.length === 0) {
          continue;
        }
        for (const row of rows) {
          const inserted = await insertRow({
            product_id: productId,
            market_segment: "public",
            fob_estimated_usd: null,
            confidence: 0.85,
            crawled_at: crawledAt,
            pa_source: PA_SOURCE_RECENT,
            pa_source_url: row.pa_source_url,
            pa_product_name_local: row.pa_product_name_local,
            pa_price_type: "tender_award",
            pa_price_local: row.pa_price_local,
            pa_currency_unit: row.pa_currency_unit,
            pa_package_unit: row.pa_package_unit,
            pa_decree_listed: null,
            pa_stock_status: null,
            pa_notes: row.pa_notes,
            pa_item_collected_at: row.pa_item_collected_at,
          });
          if (inserted.ok) {
            newInserted += 1;
          } else {
            failed += 1;
          }
        }
        processedIds.add(release.id);
      }
    } catch (error: unknown) {
      failed += 1;
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`[ocds_recent] 키워드 처리 실패(${keyword}): ${msg}`);
    }
  }

  return {
    totalFetched,
    newInserted,
    skippedDuplicate,
    failed,
    elapsedMs: Date.now() - started,
  };
}
