/**
 * 메인 대시보드 — 파나마 의약·규제 뉴스 헤드라인 (Haiku web_search + 24h 캐시)
 */
/// <reference types="node" />

import { config as loadEnv } from "dotenv";

import { getSupabaseClient } from "@/src/utils/db_connector";

loadEnv({ path: ".env.local" });
loadEnv();

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const HAIKU_MODEL = "claude-haiku-4-5-20251001";
const NEWS_CACHE_TABLE = "panama_news_cache";
const NEWS_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

type NewsCategory = "파나마 현지" | "한국 발행" | "글로벌";

export interface PanamaDashboardNewsItem {
  headline: string;
  meta_line: string;
  url?: string;
  category?: NewsCategory;
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

const FALLBACK_NEWS: PanamaDashboardNewsItem[] = [
  {
    headline: "파나마 의약품 시장동향",
    meta_line: "한국 발행 · KOTRA 파나마무역관 · 2024-05-07",
    url: "https://dream.kotra.or.kr/kotranews/cms/news/actionKotraBoardDetail.do?SITE_NO=3&MENU_ID=190&CONTENTS_NO=2&bbsGbn=254&bbsSn=254&pNttSn=214468",
    category: "한국 발행",
  },
  {
    headline: "Panama enacts new bill to guarantee medicine supply and reduce drug prices by 20-30%",
    meta_line: "파나마 현지 · GABIonline · 2024-01-18",
    url: "https://www.gabionline.net/policies-legislation/Panama-enacts-new-bill-to-guarantee-medicine-supply-and-reduce-drug-prices-by-20-30",
    category: "파나마 현지",
  },
  {
    headline: "위생등록만 되면 된다! 29년 경력의 파나마 의약품 바이어와의 인터뷰",
    meta_line: "한국 발행 · KOTRA 파나마무역관 · 2022-07-21",
    url: "https://www.kotra.or.kr/panama/index.do",
    category: "한국 발행",
  },
  {
    headline: "Panama's Strategic Advantages for the Pharmaceutical Industry",
    meta_line: "글로벌 · PharmTech · 2023-10-19",
    url: "https://www.pharmtech.com/view/panama-s-strategic-advantages-for-the-pharmaceutical-industry",
    category: "글로벌",
  },
  {
    headline: "2026 파나마 진출전략",
    meta_line: "한국 발행 · KOTRA · 2026-01-01",
    url: "https://openknowledge.kotra.or.kr/handle/2014.oak/33829",
    category: "한국 발행",
  },
  {
    headline: "Panama pharmaceutical exports reach $2.15 billion in 2023, highest value in decade",
    meta_line: "파나마 현지 · Statista · 2023",
    category: "파나마 현지",
  },
];

function resolveAnthropicKey(): string | null {
  const key = process.env.ANTHROPIC_API_KEY;
  if (key === undefined || key.trim() === "") {
    return null;
  }
  return key.trim();
}

function textField(record: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim() !== "") {
      return value.trim();
    }
  }
  return null;
}

function normalizeCategory(value: string | null): NewsCategory {
  if (value === "파나마 현지" || value === "한국 발행" || value === "글로벌") {
    return value;
  }
  return "글로벌";
}

function normalizeUrl(url: string | null): string | undefined {
  if (url === null) {
    return undefined;
  }
  if (!/^https?:\/\//i.test(url)) {
    return undefined;
  }
  return url;
}

function toHostname(url: string | undefined): string {
  if (url === undefined) {
    return "";
  }
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function stripWwwPrefix(hostname: string): string {
  if (hostname.startsWith("www.")) {
    return hostname.slice(4);
  }
  return hostname;
}

function inferSourceFromUrl(url: string | undefined, explicitSource: string | null): string {
  if (explicitSource !== null && explicitSource.trim() !== "" && explicitSource.trim() !== "출처 미상") {
    return explicitSource.trim();
  }
  const hostname = stripWwwPrefix(toHostname(url));
  if (hostname === "") {
    return "";
  }
  if (hostname === "dream.kotra.or.kr") {
    return "KOTRA";
  }
  if (hostname === "kita.net" || hostname.endsWith(".kita.net")) {
    return "KITA 한국무역협회";
  }
  if (hostname === "statista.com" || hostname.endsWith(".statista.com")) {
    return "Statista";
  }
  if (hostname === "gabionline.net" || hostname.endsWith(".gabionline.net")) {
    return "GABIonline";
  }
  if (hostname === "pharmtech.com" || hostname.endsWith(".pharmtech.com")) {
    return "PharmTech";
  }
  if (hostname === "news.naver.com") {
    // 네이버 뉴스는 원문 언론사명을 써야 하므로 미제공 시 빈값 처리한다.
    return "";
  }
  return hostname;
}

function parseMetaLine(metaLine: string | null): { category: string | null; source: string | null; date: string | null } {
  if (metaLine === null || metaLine.trim() === "") {
    return { category: null, source: null, date: null };
  }
  const parts = metaLine
    .split("·")
    .map((part) => part.trim())
    .filter((part) => part !== "");
  if (parts.length < 3) {
    return { category: null, source: null, date: null };
  }
  return { category: parts[0] ?? null, source: parts[1] ?? null, date: parts[2] ?? null };
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function normalizeDateValue(raw: string | null): string {
  if (raw === null) {
    return "";
  }
  const text = raw.trim();
  if (text === "" || text === "날짜 미상") {
    return "";
  }
  const isoLike = text.match(/\b(19\d{2}|20\d{2})[-./](\d{1,2})[-./](\d{1,2})\b/);
  if (isoLike !== null) {
    const year = Number(isoLike[1]);
    const month = Number(isoLike[2]);
    const day = Number(isoLike[3]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${String(year)}-${pad2(month)}-${pad2(day)}`;
    }
  }
  const koreanDate = text.match(/\b(19\d{2}|20\d{2})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일\b/);
  if (koreanDate !== null) {
    const year = Number(koreanDate[1]);
    const month = Number(koreanDate[2]);
    const day = Number(koreanDate[3]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${String(year)}-${pad2(month)}-${pad2(day)}`;
    }
  }

  const monthMap: Record<string, number> = {
    january: 1,
    february: 2,
    march: 3,
    april: 4,
    may: 5,
    june: 6,
    july: 7,
    august: 8,
    september: 9,
    october: 10,
    november: 11,
    december: 12,
  };
  const englishDate1 = text.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(19\d{2}|20\d{2})\b/i,
  );
  if (englishDate1 !== null) {
    const month = monthMap[englishDate1[1].toLowerCase()];
    const day = Number(englishDate1[2]);
    const year = Number(englishDate1[3]);
    if (month !== undefined && day >= 1 && day <= 31) {
      return `${String(year)}-${pad2(month)}-${pad2(day)}`;
    }
  }
  const englishDate2 = text.match(
    /\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(19\d{2}|20\d{2})\b/i,
  );
  if (englishDate2 !== null) {
    const day = Number(englishDate2[1]);
    const month = monthMap[englishDate2[2].toLowerCase()];
    const year = Number(englishDate2[3]);
    if (month !== undefined && day >= 1 && day <= 31) {
      return `${String(year)}-${pad2(month)}-${pad2(day)}`;
    }
  }
  const yearOnly = text.match(/\b(19\d{2}|20\d{2})\b/);
  if (yearOnly !== null) {
    return yearOnly[1];
  }
  return "";
}

function resolveDate(row: Record<string, unknown>, metaDate: string | null): string {
  const direct = normalizeDateValue(
    textField(row, "date", "published_at", "publishedAt", "published_date", "date_hint", "published"),
  );
  if (direct !== "") {
    return direct;
  }
  const fromMeta = normalizeDateValue(metaDate);
  if (fromMeta !== "") {
    return fromMeta;
  }
  return normalizeDateValue(
    textField(row, "snippet", "summary", "description", "content_snippet", "title", "headline"),
  );
}

function normalizeNewsItem(raw: unknown): PanamaDashboardNewsItem | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return null;
  }
  const row = raw as Record<string, unknown>;
  const headline = textField(row, "headline", "title");
  if (headline === null) {
    return null;
  }
  const url = normalizeUrl(textField(row, "url", "link"));
  const meta = parseMetaLine(textField(row, "meta_line", "metaLine"));
  const source = inferSourceFromUrl(url, textField(row, "source", "source_label", "publisher", "press", "outlet") ?? meta.source);
  const date = resolveDate(row, meta.date);
  if (source.trim() === "" || date.trim() === "") {
    return null;
  }
  const category = normalizeCategory(textField(row, "category") ?? meta.category);
  return {
    headline: headline.slice(0, 400),
    meta_line: `${category} · ${source.trim()} · ${date.trim()}`.slice(0, 300),
    url,
    category,
  };
}

function parseNewsItemsFromText(text: string): PanamaDashboardNewsItem[] {
  const trimmed = text.trim();
  const candidates: string[] = [];
  const fenced = [...trimmed.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)];
  for (const match of fenced) {
    if (match[1] !== undefined) {
      candidates.push(match[1].trim());
    }
  }
  candidates.push(trimmed);
  for (const candidate of candidates) {
    const start = candidate.indexOf("[");
    const end = candidate.lastIndexOf("]");
    if (start < 0 || end <= start) {
      continue;
    }
    try {
      const parsed = JSON.parse(candidate.slice(start, end + 1)) as unknown;
      if (!Array.isArray(parsed)) {
        continue;
      }
      const items = parsed
        .map((row) => normalizeNewsItem(row))
        .filter((row): row is PanamaDashboardNewsItem => row !== null);
      if (items.length > 0) {
        return items;
      }
    } catch {
      continue;
    }
  }
  return [];
}

function dedupeAndLimit(items: readonly PanamaDashboardNewsItem[], limit: number): PanamaDashboardNewsItem[] {
  const seen = new Set<string>();
  const result: PanamaDashboardNewsItem[] = [];
  for (const item of items) {
    const key = item.headline.trim().toLowerCase();
    if (key === "" || seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(item);
    if (result.length >= limit) {
      break;
    }
  }
  return result;
}

function extractTextBlocks(raw: unknown): string {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return "";
  }
  const content = (raw as Record<string, unknown>)["content"];
  if (!Array.isArray(content)) {
    return "";
  }
  const textBlocks: string[] = [];
  for (const block of content) {
    if (typeof block !== "object" || block === null || Array.isArray(block)) {
      continue;
    }
    const row = block as Record<string, unknown>;
    if (row["type"] === "text" && typeof row["text"] === "string") {
      textBlocks.push(row["text"]);
    }
  }
  return textBlocks.join("\n").trim();
}

async function requestHaikuNews(apiKey: string): Promise<PanamaDashboardNewsItem[]> {
  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": "web-search-2025-03-05",
    },
    body: JSON.stringify({
      model: HAIKU_MODEL,
      max_tokens: 1800,
      temperature: 0.1,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [
        {
          role: "user",
          content:
            "파나마 의약품 시장 최신 뉴스(2023~2026)를 검색해 JSON 배열만 반환하시오. " +
            "기사는 반드시 실제 URL이 있는 항목만 포함하고, 각 항목에서 source/date를 절대 누락하지 마시오. " +
            "web_search 결과의 URL·페이지 제목·snippet에서 source/date를 직접 파싱하시오. " +
            "source 규칙: dream.kotra.or.kr=KOTRA, kita.net=KITA 한국무역협회, statista.com=Statista, gabionline.net=GABIonline, pharmtech.com=PharmTech, news.naver.com=원문 언론사명, 그 외=도메인명. " +
            "date 규칙: snippet 또는 페이지 내용에서 추출하고, 못 찾으면 빈 문자열(절대 '날짜 미상' 금지). " +
            "항목 스키마는 " +
            "[{\"title\":\"...\",\"source\":\"...\",\"date\":\"YYYY-MM-DD or YYYY 또는 빈 문자열\",\"url\":\"https://...\",\"category\":\"파나마 현지|한국 발행|글로벌\",\"snippet\":\"...\"}] 형식으로 작성하시오. " +
            "source 또는 date가 빈 문자열인 항목은 출력하지 말고 제외하시오. 최소 6건, 최대 10건. 파나마 무관 기사 제외.",
        },
      ],
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Haiku web_search HTTP ${String(response.status)}: ${text.slice(0, 260)}`);
  }
  const raw = (await response.json()) as unknown;
  const text = extractTextBlocks(raw);
  if (text === "") {
    throw new Error("Haiku 응답 텍스트 블록이 비어 있습니다.");
  }
  return parseNewsItemsFromText(text);
}

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
    if (error !== null || data === null) {
      return null;
    }
    const row = data as PanamaNewsCacheRow;
    if (typeof row.created_at !== "string" || row.created_at.trim() === "") {
      return null;
    }
    const parsed = Array.isArray(row.news_json) ? row.news_json : [];
    const items = parsed
      .map((item) => normalizeNewsItem(item))
      .filter((item): item is PanamaDashboardNewsItem => item !== null);
    if (items.length === 0) {
      return null;
    }
    return dedupeAndLimit(items, 6);
  } catch {
    return null;
  }
}

async function saveCache(items: readonly PanamaDashboardNewsItem[]): Promise<void> {
  try {
    const sb = getSupabaseClient();
    const { error } = await sb.from(NEWS_CACHE_TABLE).insert({
      news_json: items,
      created_at: new Date().toISOString(),
    });
    if (error !== null) {
      process.stderr.write(`[panama_news] cache save failed: ${error.message}\n`);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`[panama_news] cache save exception: ${message}\n`);
  }
}

/**
 * 파나마 공중보건·의약품 규제·조달 관련 최근 헤드라인 조회.
 */
export async function fetchPanamaDashboardNews(): Promise<PanamaDashboardNewsPayload> {
  const generatedAt = new Date().toISOString();
  const cached = await loadCache();
  if (cached !== null) {
    return {
      items: cached,
      generated_at: generatedAt,
      source: "cache",
    };
  }

  const apiKey = resolveAnthropicKey();
  if (apiKey === null) {
    return {
      items: FALLBACK_NEWS.slice(0, 6),
      generated_at: generatedAt,
      source: "fallback",
      warning: "ANTHROPIC_API_KEY가 비어 있어 fallback 뉴스를 사용했습니다.",
    };
  }

  try {
    const rawItems = await requestHaikuNews(apiKey);
    const items = dedupeAndLimit([...rawItems, ...FALLBACK_NEWS], 6);
    if (items.length === 0) {
      throw new Error("Haiku 뉴스 파싱 결과가 비어 있습니다.");
    }
    await saveCache(items);
    return {
      items,
      generated_at: generatedAt,
      source: "api",
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`[panama_news] Haiku FAILED: ${message}\n`);
    return {
      items: FALLBACK_NEWS.slice(0, 6),
      generated_at: generatedAt,
      source: "fallback",
      warning: `뉴스 API fallback: ${message.slice(0, 240)}`,
    };
  }
}
