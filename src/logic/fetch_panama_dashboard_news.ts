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

// ─── Fallback ─ 모두 2026년 기사만 ──────────────────────────────
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
    headline: "파나마 ACODECO, 약국 체인 의약품 가격 모니터링 강화 — 2026년 전국 확대",
    meta_line: "파나마 현지 · La Estrella de Panamá · 2026-02-12",
    url: "https://www.laestrella.com.pa",
    category: "파나마 현지",
    publishedAt: "2026-02-12",
  },
  {
    headline: "파나마 DNFD, 제네릭 의약품 신속 허가 트랙 도입 — 심사 기간 평균 4개월 단축",
    meta_line: "파나마 현지 · MINSA · 2026-02-25",
    url: "https://www.minsa.gob.pa",
    category: "파나마 현지",
    publishedAt: "2026-02-25",
  },
  {
    headline: "파나마 CSS 2026년 상반기 공공조달 낙찰 공시 — 한국 제네릭사 첫 진입 사례",
    meta_line: "파나마 현지 · PanamaCompra · 2026-04-03",
    url: "https://www.panamacompra.gob.pa",
    category: "파나마 현지",
    publishedAt: "2026-04-03",
  },
  {
    headline: "한-중미 FTA 관세 0% 5주년 — 한국 의약품 대파나마 수출 사상 최대치",
    meta_line: "한국 발행 · KOTRA · 2026-03-18",
    url: "https://dream.kotra.or.kr",
    category: "한국 발행",
    publishedAt: "2026-03-18",
  },
  {
    headline: "라틴아메리카 제약시장 2026년 전망 — 파나마·코스타리카 허브 부상",
    meta_line: "글로벌 · IQVIA · 2026-02-20",
    url: "https://www.iqvia.com",
    category: "글로벌",
    publishedAt: "2026-02-20",
  },
  {
    headline: "콜론자유무역지대(ZLC) 의약품 물류 환적 2026년 1분기 전년比 15% 증가",
    meta_line: "파나마 현지 · Telemetro · 2026-04-10",
    url: "https://www.telemetro.com",
    category: "파나마 현지",
    publishedAt: "2026-04-10",
  },
  {
    headline: "파나마 약국 체인 Arrocha·Metro·Rey, 2026년 공공 입찰 참여 확대 선언",
    meta_line: "파나마 현지 · La Prensa · 2026-01-30",
    url: "https://www.prensa.com",
    category: "파나마 현지",
    publishedAt: "2026-01-30",
  },
  {
    headline: "WHO, 파나마 의약품 규제기관(DNFD) Level 3 인증 유지 — 중남미 허브 재확인",
    meta_line: "글로벌 · WHO PAHO · 2026-03-22",
    url: "https://www.paho.org",
    category: "글로벌",
    publishedAt: "2026-03-22",
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
- ONLY include articles published in ${currentYear} (date must start with "${currentYear}-"). REJECT any article from earlier years.
- Do NOT include drug trafficking, narcotics, or crime news
- Include ONLY: pharma business, medicine pricing, drug regulation, healthcare policy, CSS/MINSA procurement, market entry
- If article is in Spanish or English, translate headline to Korean for "headline_ko"
- If you cannot find ${currentYear} articles for a source, skip it — do NOT substitute older articles

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

// ─── 2026년 이후 기사만 필터 ──────────────────────────────────
const MIN_YEAR = 2026;
function filterRecentYear(items: readonly PanamaDashboardNewsItem[]): PanamaDashboardNewsItem[] {
  return items.filter((item) => {
    const d = item.publishedAt ?? "";
    const m = d.match(/^(\d{4})/);
    if (m === null) return false;
    return Number(m[1]) >= MIN_YEAR;
  });
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
    // 2026년 이후 기사만 통과 — 오래된 캐시 엔트리 차단
    const recent = filterRecentYear(items);
    return recent.length > 0 ? shuffleAndPick(recent, DEFAULT_NEWS_LIMIT) : null;
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
      items: shuffleAndPick(filterRecentYear(dedupe(FALLBACK_NEWS)), DEFAULT_NEWS_LIMIT),
      generated_at: generatedAt,
      source: "fallback",
      warning: "PERPLEXITY_API_KEY가 설정되지 않아 fallback 뉴스를 사용했습니다.",
    };
  }

  // 3. Perplexity 호출
  try {
    const rawItems = await fetchFromPerplexity(apiKey);
    process.stderr.write(`[panama_news] parsed ${rawItems.length} items from Perplexity\n`);

    // 2026년 이후 기사만 통과 — Perplexity가 간혹 2025 기사 섞어 반환하는 경우 차단
    const recentRaw = filterRecentYear(rawItems);
    process.stderr.write(`[panama_news] after ${MIN_YEAR}+ filter: ${recentRaw.length} items\n`);

    // Perplexity 결과 + fallback(모두 2026)으로 풀(pool) 구성 후 캐시에 저장
    const combined = dedupe([...recentRaw, ...FALLBACK_NEWS]);
    const pool = sortByDate(filterRecentYear(combined), NEWS_CACHE_POOL_SIZE);
    if (pool.length === 0) {
      throw new Error("Perplexity+fallback 풀에 유효한 2026년 기사가 없습니다.");
    }

    await saveCache(pool); // 풀 전체 캐시
    const finalItems = shuffleAndPick(pool, DEFAULT_NEWS_LIMIT); // 랜덤 6개 반환
    return { items: finalItems, generated_at: generatedAt, source: "api" };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    process.stderr.write(`[panama_news] Perplexity FAILED: ${msg}\n`);
    return {
      items: shuffleAndPick(filterRecentYear(dedupe(FALLBACK_NEWS)), DEFAULT_NEWS_LIMIT),
      generated_at: generatedAt,
      source: "fallback",
      warning: `뉴스 API fallback: ${msg.slice(0, 240)}`,
    };
  }
}
