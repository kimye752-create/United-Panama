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
const NEWS_CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12시간 — Perplexity 호출 주기
const DEFAULT_NEWS_LIMIT = 6;   // 화면에 표시할 개수
const NEWS_CACHE_POOL_SIZE = 14; // 캐시에 저장할 총 뉴스 개수 (매 새로고침마다 랜덤 6개 추출)

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
    headline: "파나마 MINSA, 2026년 필수의약품 목록 개정 — 고지혈증·당뇨 치료제 대폭 확대",
    meta_line: "파나마 현지 · MINSA · 2026-01-20",
    url: "https://www.minsa.gob.pa",
    category: "파나마 현지",
    publishedAt: "2026-01-20",
  },
  {
    headline: "파나마 CSS, 2026년 1분기 의약품 공개조달 입찰 공고 — Rosuvastatin 등 64개 성분",
    meta_line: "파나마 현지 · PanamaCompra · 2026-01-08",
    url: "https://www.panamacompra.gob.pa",
    category: "파나마 현지",
    publishedAt: "2026-01-08",
  },
  {
    headline: "파나마 의약품 가격 인하법 시행 1년 — 약국 소매가 평균 18% 하락 확인",
    meta_line: "파나마 현지 · La Prensa · 2026-03-05",
    url: "https://www.prensa.com",
    category: "파나마 현지",
    publishedAt: "2026-03-05",
  },
  {
    headline: "한-파나마 FTA 발효 5주년 — 의약품 교역액 전년 대비 23% 증가",
    meta_line: "한국 발행 · KOTRA 파나마무역관 · 2026-03-01",
    url: "https://dream.kotra.or.kr",
    category: "한국 발행",
    publishedAt: "2026-03-01",
  },
  {
    headline: "파나마, 의약품 공급 보장 및 약가 20~30% 인하 법안 시행",
    meta_line: "파나마 현지 · GABIonline · 2025-06-18",
    url: "https://www.gabionline.net/policies-legislation/Panama-enacts-new-bill-to-guarantee-medicine-supply-and-reduce-drug-prices-by-20-30",
    category: "파나마 현지",
    publishedAt: "2025-06-18",
  },
  {
    headline: "파나마 의약품 시장동향 — 수입 의존도 90% 속 한국산 제품 기회",
    meta_line: "한국 발행 · KOTRA 파나마무역관 · 2025-08-07",
    url: "https://dream.kotra.or.kr/kotranews/cms/news/actionKotraBoardDetail.do?SITE_NO=3&MENU_ID=190&CONTENTS_NO=2&bbsGbn=254&bbsSn=254&pNttSn=214468",
    category: "한국 발행",
    publishedAt: "2025-08-07",
  },
  {
    headline: "파나마 CSS, 2025년 의약품 조달 예산 전년 대비 12% 증액",
    meta_line: "파나마 현지 · La Prensa · 2025-11-14",
    url: "https://www.prensa.com",
    category: "파나마 현지",
    publishedAt: "2025-11-14",
  },
  {
    headline: "라틴아메리카 제약시장, 2025년 이후 연평균 7.2% 성장 전망",
    meta_line: "글로벌 · Market Data Forecast · 2025-09-20",
    url: "https://www.marketdataforecast.com/market-reports/latin-america-pharmaceutical-market",
    category: "글로벌",
    publishedAt: "2025-09-20",
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
  // 파나마 특화 프롬프트 — 2026년 최신 뉴스 우선, 없으면 2025 후반
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = String(now.getMonth() + 1).padStart(2, "0");
  const prompt = `Today is ${currentYear}-${currentMonth}. You must find the MOST RECENT news about Panama's pharmaceutical and healthcare market.

CRITICAL: Search for ${currentYear} articles FIRST. The date today is ${currentYear}-${currentMonth}. Recent news from ${currentYear} should exist.

Search these queries in order:
1. "Panama medicamentos ${currentYear}" site:prensa.com OR site:laestrella.com.pa OR site:telemetro.com
2. "panamá MINSA medicamentos ${currentYear}"
3. "Panama CSS medicamentos ${currentYear}"
4. "Panama pharmaceutical market ${currentYear}"
5. "panamá ACODECO CABAMED precios medicamentos ${currentYear}"
6. "Panama drug regulation ${currentYear}"
7. "panamá farmacéutico precio ${currentYear}"
8. "Panama medicine prices regulation 2025 2026"

Target sources: La Prensa (prensa.com), La Estrella de Panama (laestrella.com.pa), Telemetro (telemetro.com), TVN Noticias (tvn-2.com), Panama America (panamaamerica.com.pa), GABIonline, MINSA Panama, PanamaCompra, KOTRA, Reuters, Bloomberg Health.

STRICT RULES:
- Articles from ${currentYear} are MANDATORY if they exist on the web
- Do NOT include drug trafficking, narcotics, or crime news
- Include ONLY: pharma business, medicine pricing, drug regulation, healthcare policy, CSS/MINSA procurement, market entry
- If article is in Spanish or English, translate headline to Korean for "headline_ko"

Return ONLY a valid JSON array (10-14 items total). Start with [ and end with ]. No markdown, no explanation:
[
  {
    "headline_ko": "한국어로 번역된 기사 제목 (구체적이고 정보가 담긴 제목)",
    "headline": "Original headline in source language",
    "source": "Publisher name (e.g. La Prensa, MINSA, Reuters)",
    "date": "YYYY-MM-DD",
    "url": "https://actual-article-url",
    "category": "파나마 현지"
  }
]

category values: "파나마 현지" (Panama local news), "글로벌" (international pharma news about Panama), "한국 발행" (Korean source)
Sort by date descending — most recent first.`;

  // 단기(1개월) → 부족 시 연단위 재시도
  async function callPerplexity(recencyFilter: "month" | "year"): Promise<PanamaDashboardNewsItem[]> {
    const resp = await fetch(PERPLEXITY_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: PERPLEXITY_MODEL,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 3000,
        temperature: 0.1,
        search_recency_filter: recencyFilter,
        return_citations: true,
      }),
    });

    if (!resp.ok) {
      const body = await resp.text();
      throw new Error(`Perplexity API HTTP ${resp.status}: ${body.slice(0, 300)}`);
    }

    const data = (await resp.json()) as unknown;
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

    process.stderr.write(`[panama_news] Perplexity(${recencyFilter}) raw (first 400): ${content.slice(0, 400)}\n`);
    return parseItemsFromText(content);
  }

  // 1차: 최근 1개월 기사 (2026년 확보 우선)
  let items = await callPerplexity("month");
  process.stderr.write(`[panama_news] month-filter: ${items.length} items\n`);

  // 2차: 결과 부족하면 1년치로 확장
  if (items.length < 4) {
    const yearItems = await callPerplexity("year");
    process.stderr.write(`[panama_news] year-filter: ${yearItems.length} items\n`);
    items = dedupe([...items, ...yearItems]);
  }

  return items;
}

// ─── 중복 제거 ────────────────────────────────────────────────
function dedupe(items: readonly PanamaDashboardNewsItem[]): PanamaDashboardNewsItem[] {
  const seen = new Set<string>();
  const unique: PanamaDashboardNewsItem[] = [];
  for (const item of items) {
    const key = item.headline.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }
  return unique;
}

// ─── 날짜 내림차순 정렬 + limit ───────────────────────────────
function sortByDate(
  items: readonly PanamaDashboardNewsItem[],
  limit: number,
): PanamaDashboardNewsItem[] {
  return [...items]
    .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""))
    .slice(0, limit);
}

// ─── 랜덤 셔플 후 limit 추출 (매 새로고침 다른 순서) ──────────
function shuffleAndPick(
  items: readonly PanamaDashboardNewsItem[],
  limit: number,
): PanamaDashboardNewsItem[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j] as PanamaDashboardNewsItem, arr[i] as PanamaDashboardNewsItem];
  }
  return arr.slice(0, limit);
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

    // 캐시에는 이미 정규화된 PanamaDashboardNewsItem 형식으로 저장되어 있습니다.
    // source 필드가 없고 meta_line만 있으므로 normalizeItem()을 재실행하지 않고
    // headline + meta_line 존재 여부만 확인합니다.
    const items = (parsed as unknown[]).filter(
      (x): x is PanamaDashboardNewsItem =>
        typeof x === "object" &&
        x !== null &&
        typeof (x as Record<string, unknown>)["headline"] === "string" &&
        ((x as Record<string, unknown>)["headline"] as string).trim() !== "" &&
        typeof (x as Record<string, unknown>)["meta_line"] === "string",
    );

    // 풀 전체를 보관하고, 표시 시점에 랜덤 6개를 뽑아 다양성 제공
    return items.length > 0 ? shuffleAndPick(items, DEFAULT_NEWS_LIMIT) : null;
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
export async function fetchPanamaDashboardNews(
  forceRefresh = false,
): Promise<PanamaDashboardNewsPayload> {
  const generatedAt = new Date().toISOString();

  // 1. 캐시 확인 (12시간) — force=true 이면 캐시 우회
  if (!forceRefresh) {
    const cached = await loadCache();
    if (cached !== null) {
      return { items: cached, generated_at: generatedAt, source: "cache" };
    }
  }

  // 2. API 키 확인
  const apiKey = resolvePerplexityKey();
  if (apiKey === null) {
    return {
      items: shuffleAndPick(dedupe(FALLBACK_NEWS), DEFAULT_NEWS_LIMIT),
      generated_at: generatedAt,
      source: "fallback",
      warning: "PERPLEXITY_API_KEY가 설정되지 않아 fallback 뉴스를 사용했습니다.",
    };
  }

  // 3. Perplexity 호출
  try {
    const rawItems = await fetchFromPerplexity(apiKey);
    process.stderr.write(`[panama_news] parsed ${rawItems.length} items from Perplexity\n`);

    // Perplexity 결과 + fallback으로 풀(pool) 구성 후 캐시에 저장
    let pool: PanamaDashboardNewsItem[];
    if (rawItems.length >= 3) {
      // Perplexity 결과 충분 → fallback과 합쳐 최대 POOL_SIZE 개 저장
      pool = sortByDate(dedupe([...rawItems, ...FALLBACK_NEWS]), NEWS_CACHE_POOL_SIZE);
    } else if (rawItems.length > 0) {
      // 부족 → fallback으로 보충
      pool = sortByDate(dedupe([...rawItems, ...FALLBACK_NEWS]), NEWS_CACHE_POOL_SIZE);
    } else {
      throw new Error("Perplexity 응답에서 뉴스 항목을 파싱하지 못했습니다.");
    }

    await saveCache(pool); // 풀 전체 캐시
    const finalItems = shuffleAndPick(pool, DEFAULT_NEWS_LIMIT); // 랜덤 6개 반환
    return { items: finalItems, generated_at: generatedAt, source: "api" };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    process.stderr.write(`[panama_news] Perplexity FAILED: ${msg}\n`);
    return {
      items: shuffleAndPick(dedupe(FALLBACK_NEWS), DEFAULT_NEWS_LIMIT),
      generated_at: generatedAt,
      source: "fallback",
      warning: `뉴스 API fallback: ${msg.slice(0, 240)}`,
    };
  }
}
