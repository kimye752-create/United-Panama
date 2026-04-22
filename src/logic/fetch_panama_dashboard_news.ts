/**
 * 메인 대시보드 — 파나마 의약·규제 뉴스 헤드라인
 * Perplexity Sonar API (실시간 웹 검색) + 12h Supabase 캐시
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
const NEWS_CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12시간 (더 신선한 뉴스)
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

// ─── Fallback ─────────────────────────────────────────────────
const FALLBACK_NEWS: PanamaDashboardNewsItem[] = [
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
    headline: "파나마 의약품 시장동향",
    meta_line: "한국 발행 · KOTRA 파나마무역관 · 2024-05-07",
    url: "https://dream.kotra.or.kr/kotranews/cms/news/actionKotraBoardDetail.do?SITE_NO=3&MENU_ID=190&CONTENTS_NO=2&bbsGbn=254&bbsSn=254&pNttSn=214468",
    category: "한국 발행",
    publishedAt: "2024-05-07",
  },
  {
    headline: "파나마 의약품 수출, 2023년 21.5억 달러로 10년 최고치 기록",
    meta_line: "파나마 현지 · Statista · 2023",
    category: "파나마 현지",
    publishedAt: "2023",
  },
  {
    headline: "위생등록만 되면 된다! 29년 경력의 파나마 의약품 바이어와의 인터뷰",
    meta_line: "한국 발행 · KOTRA 파나마무역관 · 2022-07-21",
    url: "https://www.kotra.or.kr/panama/index.do",
    category: "한국 발행",
    publishedAt: "2022-07-21",
  },
  {
    headline: "2026 파나마 진출전략",
    meta_line: "한국 발행 · KOTRA · 2026-01-01",
    url: "https://openknowledge.kotra.or.kr/handle/2014.oak/33829",
    category: "한국 발행",
    publishedAt: "2026-01-01",
  },
];

// ─── 환경변수 ─────────────────────────────────────────────────
function resolvePerplexityKey(): string | null {
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

// ─── 날짜 정규화 ──────────────────────────────────────────────
function pad2(n: number): string { return String(n).padStart(2, "0"); }

function normalizeDateStr(raw: string | null | undefined): string {
  if (raw == null || raw.trim() === "") return "";
  const t = raw.trim();
  const iso = t.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  if (iso) return `${iso[1]}-${pad2(Number(iso[2]))}-${pad2(Number(iso[3]))}`;
  const yearOnly = t.match(/\b(20\d{2})\b/);
  if (yearOnly) return yearOnly[1];
  return "";
}

function safeUrl(url: unknown): string | undefined {
  if (typeof url !== "string") return undefined;
  return /^https?:\/\//i.test(url.trim()) ? url.trim() : undefined;
}

function normalizeCategory(val: unknown): NewsCategory {
  if (val === "파나마 현지" || val === "한국 발행" || val === "글로벌") return val;
  return "글로벌";
}

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

// ─── Perplexity 응답 텍스트에서 JSON 파싱 ────────────────────
function parseItemsFromText(text: string): PanamaDashboardNewsItem[] {
  const candidates: string[] = [];
  // 1) 코드블록 우선
  for (const m of text.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)) {
    if (m[1]) candidates.push(m[1].trim());
  }
  // 2) 전체 텍스트
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

// ─── Perplexity API 호출 ──────────────────────────────────────
async function fetchFromPerplexity(apiKey: string): Promise<PanamaDashboardNewsItem[]> {
  // 파나마 특화 프롬프트 — 실제 현지/글로벌 제약 뉴스 타겟
  const prompt = `Search the web for news articles specifically about PANAMA pharmaceutical market, medicine regulation, drug policy, or healthcare industry in Panama published in 2024 or 2025.

Search queries to use:
- "Panama pharmaceutical market 2024 2025"
- "Panama MINSA medicamentos 2024"
- "Panama drug regulation CSS 2024"
- "Panama medicine import export 2025"
- "panamá mercado farmacéutico 2024 2025"
- "panamá medicamentos regulación 2025"

Find 6-8 real articles from sources like: La Prensa (prensa.com), La Estrella de Panama, Telemetro, TVN Noticias, Panama America, GABIonline, FiercePharma, Reuters, Bloomberg, PharmaTimes, or trade publications covering Latin America pharma.

Do NOT include articles about illegal drug trafficking. Only pharmaceutical/medicine business and regulation news.

Return ONLY a valid JSON array (no other text, no markdown, no explanation):
[
  {
    "headline_ko": "한국어로 번역된 기사 제목 (스페인어/영어 → 한국어)",
    "headline": "Original headline",
    "source": "Publisher name (e.g. La Prensa, GABIonline, Reuters)",
    "date": "YYYY-MM-DD",
    "url": "https://real-article-url",
    "category": "파나마 현지"
  }
]

category values: "파나마 현지" for Panama local news, "글로벌" for international coverage of Panama pharma, "한국 발행" for Korean sources.

Start your response with [ and end with ]. Nothing else.`;

  const res = await fetch(PERPLEXITY_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: PERPLEXITY_MODEL,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2500,
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

  process.stderr.write(`[panama_news] Perplexity raw (first 400): ${content.slice(0, 400)}\n`);

  return parseItemsFromText(content);
}

// ─── 중복 제거 + 날짜 내림차순 ───────────────────────────────
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

// ─── 메인 export ──────────────────────────────────────────────
export async function fetchPanamaDashboardNews(): Promise<PanamaDashboardNewsPayload> {
  const generatedAt = new Date().toISOString();

  // 1. 캐시 확인 (12시간)
  const cached = await loadCache();
  if (cached !== null) {
    return { items: cached, generated_at: generatedAt, source: "cache" };
  }

  // 2. API 키 확인
  const apiKey = resolvePerplexityKey();
  if (apiKey === null) {
    return {
      items: dedupeAndSort(FALLBACK_NEWS, DEFAULT_NEWS_LIMIT),
      generated_at: generatedAt,
      source: "fallback",
      warning: "PERPLEXITY_API_KEY가 설정되지 않아 fallback 뉴스를 사용했습니다.",
    };
  }

  // 3. Perplexity 호출
  try {
    const rawItems = await fetchFromPerplexity(apiKey);
    process.stderr.write(`[panama_news] parsed ${rawItems.length} items from Perplexity\n`);

    let finalItems: PanamaDashboardNewsItem[];

    if (rawItems.length >= 3) {
      // ✅ Perplexity 결과 충분 → fallback 없이 실제 뉴스만 표시
      finalItems = dedupeAndSort(rawItems, DEFAULT_NEWS_LIMIT);
    } else if (rawItems.length > 0) {
      // 부족 → Perplexity 우선, fallback으로 보충
      finalItems = dedupeAndSort([...rawItems, ...FALLBACK_NEWS], DEFAULT_NEWS_LIMIT);
    } else {
      throw new Error("Perplexity 응답에서 뉴스 항목을 파싱하지 못했습니다.");
    }

    await saveCache(finalItems);
    return { items: finalItems, generated_at: generatedAt, source: "api" };
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
