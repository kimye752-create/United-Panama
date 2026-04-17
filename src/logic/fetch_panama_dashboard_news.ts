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

function normalizeNewsItem(raw: unknown): PanamaDashboardNewsItem | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return null;
  }
  const row = raw as Record<string, unknown>;
  const headline = textField(row, "headline", "title");
  if (headline === null) {
    return null;
  }
  const source = textField(row, "source", "source_label") ?? "출처 미상";
  const date = textField(row, "date", "date_hint") ?? "날짜 미상";
  const category = normalizeCategory(textField(row, "category"));
  const url = normalizeUrl(textField(row, "url", "link"));
  return {
    headline: headline.slice(0, 400),
    meta_line: `${category} · ${source} · ${date}`.slice(0, 300),
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
            "기사는 실제 URL이 있는 항목만 포함하고, 항목 스키마는 " +
            "[{\"title\":\"...\",\"source\":\"...\",\"date\":\"YYYY-MM-DD or YYYY\",\"url\":\"https://...\",\"category\":\"파나마 현지|한국 발행|글로벌\"}] 형식으로 작성하시오. " +
            "최소 6건, 최대 10건. 파나마 무관 기사 제외.",
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
