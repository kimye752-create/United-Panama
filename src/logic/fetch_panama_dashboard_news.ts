/**
 * 메인 대시보드 — 파나마 의약·규제 뉴스 헤드라인
 * Perplexity Sonar API (실시간 웹 검색) + 24h Supabase 캐시
 * 영문 기사 제목은 한국어로 번역하여 반환
 */
/// <reference types="node" />

import { config as loadEnv } from "dotenv";

import { getSupabaseClient } from "@/src/utils/db_connector";

loadEnv({ path: ".env.local" });
loadEnv();

const PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions";
const PERPLEXITY_MODEL = "sonar";
const NEWS_CACHE_TABLE = "panama_news_cache";
const NEWS_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_NEWS_LIMIT = 6;

type NewsCategory = "파나마 현지" | "한국 발행" | "글로벌";

export interface PanamaDashboardNewsItem {
  headline: string;       // 항상 한국어
  meta_line: string;      // "카테고리 · 출처 · 날짜"
  url?: string;
  category?: NewsCategory;
  publishedAt?: string;
}

export interface PanamaDashboardNewsPayload {
  items: PanamaDashboardNewsItem[];
  generated_at: string;
  source: "api" | "cache" | "fallback";
  warning?: string;
}

interface PanamaNewsCacheRow {
  news_json: unknown;
  created_at: string;
}

// ─── Fallback (API 실패 시 사용) ───────────────────────────────
const FALLBACK_NEWS: PanamaDashboardNewsItem[] = [
  {
    headline: "2026 파나마 진출전략",
    meta_line: "한국 발행 · KOTRA · 2026-01-01",
    url: "https://openknowledge.kotra.or.kr/handle/2014.oak/33829",
    category: "한국 발행",
    publishedAt: "2026-01-01",
  },
  {
    headline: "파나마 의약품 시장동향",
    meta_line: "한국 발행 · KOTRA 파나마무역관 · 2024-05-07",
    url: "https://dream.kotra.or.kr/kotranews/cms/news/actionKotraBoardDetail.do?SITE_NO=3&MENU_ID=190&CONTENTS_NO=2&bbsGbn=254&bbsSn=254&pNttSn=214468",
    category: "한국 발행",
    publishedAt: "2024-05-07",
  },
  {
    headline: "파나마, 의약품 공급 보장 및 약가 20~30% 인하 법안 제정",
    meta_line: "파나마 현지 · GABIonline · 2024-01-18",
    url: "https://www.gabionline.net/policies-legislation/Panama-enacts-new-bill-to-guarantee-medicine-supply-and-reduce-drug-prices-by-20-30",
    category: "파나마 현지",
    publishedAt: "2024-01-18",
  },
  {
    headline: "파나마 제약산업의 전략적 이점",
    meta_line: "글로벌 · PharmTech · 2023-10-19",
    url: "https://www.pharmtech.com/view/panama-s-strategic-advantages-for-the-pharmaceutical-industry",
    category: "글로벌",
    publishedAt: "2023-10-19",
  },
  {
    headline: "위생등록만 되면 된다! 29년 경력의 파나마 의약품 바이어와의 인터뷰",
    meta_line: "한국 발행 · KOTRA 파나마무역관 · 2022-07-21",
    url: "https://www.kotra.or.kr/panama/index.do",
    category: "한국 발행",
    publishedAt: "2022-07-21",
  },
  {
    headline: "파나마 의약품 수출, 2023년 21.5억 달러로 10년 최고치 기록",
    meta_line: "파나마 현지 · Statista · 2023",
    category: "파나마 현지",
    publishedAt: "2023",
  },
];

// ─── 환경변수 ────────────────────────────────────────────────
function resolvePerplexityKey(): string | null {
  // .env.local: Perplexity_API_key = pplx-...
  const candidates = [
    process.env["Perplexity_API_key"],
    process.env["PERPLEXITY_API_KEY"],
    process.env["PERPLEXITY_API_key"],
  ];
  for (const key of candidates) {
    if (typeof key === "string" && key.trim().startsWith("pplx-")) {
      return key.trim();
    }
  }
  return null;
}

// ─── 날짜 정규화 ─────────────────────────────────────────────
function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function normalizeDateStr(raw: string | null | undefined): string {
  if (raw == null || raw.trim() === "") return "";
  const t = raw.trim();
  const iso = t.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  if (iso) {
    return `${iso[1]}-${pad2(Number(iso[2]))}-${pad2(Number(iso[3]))}`;
  }
  const yearOnly = t.match(/\b(20\d{2})\b/);
  if (yearOnly) return yearOnly[1];
  return "";
}

// ─── URL 검증 ────────────────────────────────────────────────
function safeUrl(url: unknown): string | undefined {
  if (typeof url !== "string") return undefined;
  return /^https?:\/\//i.test(url.trim()) ? url.trim() : undefined;
}

// ─── 카테고리 정규화 ──────────────────────────────────────────
function normalizeCategory(val: unknown): NewsCategory {
  if (val === "파나마 현지" || val === "한국 발행" || val === "글로벌") return val;
  return "글로벌";
}

// ─── raw 항목 → PanamaDashboardNewsItem ───────────────────────
function normalizeItem(raw: unknown): PanamaDashboardNewsItem | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;

  const headline =
    typeof row["headline_ko"] === "string" && row["headline_ko"].trim() !== ""
      ? row["headline_ko"].trim()
      : typeof row["headline"] === "string" && row["headline"].trim() !== ""
        ? row["headline"].trim()
        : null;
  if (!headline) return null;

  const url = safeUrl(row["url"] ?? row["link"]);
  const date = normalizeDateStr(
    (row["date"] ?? row["publishedAt"] ?? row["published_at"]) as string | undefined,
  );
  const source =
    typeof row["source"] === "string" && row["source"].trim() !== ""
      ? row["source"].trim()
      : "";

  if (!source || !date) return null;

  const category = normalizeCategory(row["category"]);

  return {
    headline: headline.slice(0, 400),
    meta_line: `${category} · ${source} · ${date}`.slice(0, 300),
    url,
    category,
    publishedAt: date,
  };
}

// ─── Perplexity 응답 텍스트 파싱 ─────────────────────────────
function parseItemsFromText(text: string): PanamaDashboardNewsItem[] {
  const candidates: string[] = [];
  // 코드블록 우선
  for (const m of text.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)) {
    if (m[1]) candidates.push(m[1].trim());
  }
  candidates.push(text.trim());

  for (const c of candidates) {
    const s = c.indexOf("[");
    const e = c.lastIndexOf("]");
    if (s < 0 || e <= s) continue;
    try {
      const parsed = JSON.parse(c.slice(s, e + 1)) as unknown;
      if (!Array.isArray(parsed)) continue;
      const items = parsed
        .map(normalizeItem)
        .filter((x): x is PanamaDashboardNewsItem => x !== null);
      if (items.length > 0) return items;
    } catch {
      continue;
    }
  }
  return [];
}

// ─── Perplexity API 호출 ─────────────────────────────────────
async function fetchFromPerplexity(apiKey: string): Promise<PanamaDashboardNewsItem[]> {
  const prompt = `파나마 의약품·제약 시장 관련 최신 뉴스(2023~2026)를 웹에서 검색하여 JSON 배열로만 반환하시오.

규칙:
1. 반드시 실제 URL이 존재하는 기사만 포함 (URL 없으면 제외)
2. 영문 기사 제목은 반드시 한국어로 번역하여 headline_ko 필드에 제공
3. source(언론사명)와 date(YYYY-MM-DD 또는 YYYY) 반드시 포함 — 없으면 제외
4. 6~8건 반환. 파나마 의약품 무관 기사 제외.
5. category는 "파나마 현지" / "한국 발행" / "글로벌" 중 하나

스키마(JSON 배열):
[{
  "headline_ko": "한국어 기사 제목 (영문이면 번역, 한국어면 원문)",
  "headline": "원문 제목",
  "source": "언론사명 (예: KOTRA, PharmTech, GABIonline, Statista 등)",
  "date": "YYYY-MM-DD 또는 YYYY",
  "url": "https://...",
  "category": "파나마 현지|한국 발행|글로벌"
}]

JSON 배열 외 다른 텍스트 없이 배열만 출력하시오.`;

  const res = await fetch(PERPLEXITY_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: PERPLEXITY_MODEL,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2000,
      temperature: 0.1,
      search_recency_filter: "year",
      return_citations: true,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Perplexity API HTTP ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = (await res.json()) as unknown;
  if (typeof data !== "object" || data === null) {
    throw new Error("Perplexity 응답이 객체가 아닙니다.");
  }

  const choices = (data as Record<string, unknown>)["choices"];
  if (!Array.isArray(choices) || choices.length === 0) {
    throw new Error("Perplexity choices가 비어 있습니다.");
  }

  const message = (choices[0] as Record<string, unknown>)["message"];
  const content =
    typeof message === "object" && message !== null
      ? ((message as Record<string, unknown>)["content"] as string | undefined)
      : undefined;

  if (typeof content !== "string" || content.trim() === "") {
    throw new Error("Perplexity 응답 content가 비어 있습니다.");
  }

  return parseItemsFromText(content);
}

// ─── 중복 제거 + 정렬 ────────────────────────────────────────
function dedupeAndSort(
  items: readonly PanamaDashboardNewsItem[],
  limit: number,
): PanamaDashboardNewsItem[] {
  const seen = new Set<string>();
  const unique: PanamaDashboardNewsItem[] = [];
  for (const item of items) {
    const key = item.headline.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }
  // 날짜 내림차순 정렬
  unique.sort((a, b) => {
    const da = a.publishedAt ?? "";
    const db = b.publishedAt ?? "";
    return db.localeCompare(da);
  });
  return unique.slice(0, limit);
}

// ─── Supabase 캐시 ────────────────────────────────────────────
async function loadCache(): Promise<PanamaDashboardNewsItem[] | null> {
  try {
    const sb = getSupabaseClient();
    const threshold = new Date(Date.now() - NEWS_CACHE_TTL_MS).toISOString();
    const { data, error } = await sb
      .from(NEWS_CACHE_TABLE)
      .select("news_json, created_at")
      .gte("created_at", threshold)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error !== null || data === null) return null;

    const row = data as PanamaNewsCacheRow;
    const parsed = Array.isArray(row.news_json) ? row.news_json : [];
    const items = parsed
      .map(normalizeItem)
      .filter((x): x is PanamaDashboardNewsItem => x !== null);

    return items.length > 0 ? dedupeAndSort(items, DEFAULT_NEWS_LIMIT) : null;
  } catch {
    return null;
  }
}

async function saveCache(items: readonly PanamaDashboardNewsItem[]): Promise<void> {
  try {
    const sb = getSupabaseClient();
    const { error } = await sb
      .from(NEWS_CACHE_TABLE)
      .insert({ news_json: items, created_at: new Date().toISOString() });
    if (error !== null) {
      process.stderr.write(`[panama_news] cache save failed: ${error.message}\n`);
    }
  } catch (e: unknown) {
    process.stderr.write(
      `[panama_news] cache save exception: ${e instanceof Error ? e.message : String(e)}\n`,
    );
  }
}

// ─── 메인 export ─────────────────────────────────────────────
export async function fetchPanamaDashboardNews(): Promise<PanamaDashboardNewsPayload> {
  const generatedAt = new Date().toISOString();

  // 1. 캐시
  const cached = await loadCache();
  if (cached !== null) {
    return { items: cached, generated_at: generatedAt, source: "cache" };
  }

  // 2. Perplexity API
  const apiKey = resolvePerplexityKey();
  if (apiKey === null) {
    return {
      items: dedupeAndSort(FALLBACK_NEWS, DEFAULT_NEWS_LIMIT),
      generated_at: generatedAt,
      source: "fallback",
      warning: "PERPLEXITY_API_KEY가 설정되지 않아 fallback 뉴스를 사용했습니다.",
    };
  }

  try {
    const rawItems = await fetchFromPerplexity(apiKey);
    // Perplexity 결과 + fallback 병합 후 중복 제거
    const merged = dedupeAndSort([...rawItems, ...FALLBACK_NEWS], DEFAULT_NEWS_LIMIT);
    if (merged.length === 0) throw new Error("뉴스 파싱 결과가 비어 있습니다.");

    await saveCache(merged);
    return { items: merged, generated_at: generatedAt, source: "api" };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    process.stderr.write(`[panama_news] Perplexity FAILED: ${msg}\n`);
    return {
      items: dedupeAndSort(FALLBACK_NEWS, DEFAULT_NEWS_LIMIT),
      generated_at: generatedAt,
      source: "fallback",
      warning: `뉴스 API fallback: ${msg.slice(0, 240)}`,
    };
  }
}
