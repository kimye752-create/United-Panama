/**
 * Top 7.5 — Perplexity 논문/시장 인사이트 조회 + 7일 TTL 캐시
 */
/// <reference types="node" />

import { config as loadEnv } from "dotenv";
import { createSupabaseServer } from "../../lib/supabase-server";

const PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions";
const PERPLEXITY_MODEL = "sonar";
const CACHE_TABLE = "panama_perplexity_cache";
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

loadEnv({ path: ".env.local" });
loadEnv();

export interface PerplexityPaper {
  title: string;
  url: string;
  published_at: string | null;
  summary: string;
  source: string;
}

export interface PerplexityInsight {
  inn: string;
  papers: PerplexityPaper[];
  generated_at: string;
  expires_at: string;
  source: "cache_hit" | "api_fresh";
}

interface PerplexityCacheRow {
  inn_target: string;
  papers: unknown;
  generated_at: string;
  expires_at: string;
}

function resolvePerplexityKey(): string {
  const key = process.env.PERPLEXITY_API_KEY ?? process.env.Perplexity_API_key;
  if (key === undefined || key.trim() === "") {
    throw new Error(
      "PERPLEXITY_API_KEY가 비어 있습니다. .env.local 또는 배포 환경변수에 API 키를 등록하세요.",
    );
  }
  return key.trim();
}

function normalizePaper(raw: unknown): PerplexityPaper | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return null;
  }
  const obj = raw as Record<string, unknown>;
  const title =
    typeof obj.title === "string" && obj.title.trim() !== ""
      ? obj.title.trim()
      : null;
  const url =
    typeof obj.url === "string" && obj.url.trim() !== ""
      ? obj.url.trim()
      : null;
  const summary =
    typeof obj.summary === "string" && obj.summary.trim() !== ""
      ? obj.summary.trim()
      : null;
  if (title === null || url === null || summary === null) {
    return null;
  }
  const publishedRaw = obj.published_at;
  let published_at: string | null = null;
  if (typeof publishedRaw === "string" && publishedRaw.trim() !== "") {
    const parsed = Date.parse(publishedRaw.trim());
    published_at = Number.isNaN(parsed)
      ? publishedRaw.trim()
      : new Date(parsed).toISOString();
  }
  const source =
    typeof obj.source === "string" && obj.source.trim() !== ""
      ? obj.source.trim()
      : "unknown";
  return {
    title: title.slice(0, 500),
    url: url.slice(0, 2000),
    published_at,
    summary: summary.slice(0, 2000),
    source: source.slice(0, 200),
  };
}

function parsePapersFromContent(content: string): PerplexityPaper[] {
  const trimmed = content.trim();
  const blocks: string[] = [];

  const fenced = [...trimmed.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)];
  for (const match of fenced) {
    const body = match[1];
    if (body !== undefined) {
      blocks.push(body.trim());
    }
  }
  blocks.push(trimmed);

  for (const block of blocks) {
    const start = block.indexOf("[");
    const end = block.lastIndexOf("]");
    if (start === -1 || end === -1 || end <= start) {
      continue;
    }
    try {
      const parsed = JSON.parse(block.slice(start, end + 1)) as unknown;
      if (!Array.isArray(parsed)) {
        continue;
      }
      const papers = parsed
        .map((item) => normalizePaper(item))
        .filter((item): item is PerplexityPaper => item !== null)
        .slice(0, 10);
      if (papers.length > 0) {
        return papers;
      }
    } catch {
      continue;
    }
  }
  return [];
}

async function checkCache(inn: string): Promise<PerplexityInsight | null> {
  const supabase = createSupabaseServer();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from(CACHE_TABLE)
    .select("inn_target, papers, generated_at, expires_at")
    .eq("inn_target", inn)
    .gt("expires_at", now)
    .maybeSingle();
  if (error !== null || data === null) {
    return null;
  }
  const row = data as PerplexityCacheRow;
  const papersRaw = Array.isArray(row.papers) ? row.papers : [];
  const papers = papersRaw
    .map((item) => normalizePaper(item))
    .filter((item): item is PerplexityPaper => item !== null);
  return {
    inn,
    papers,
    generated_at: row.generated_at,
    expires_at: row.expires_at,
    source: "cache_hit",
  };
}

export async function getPerplexityCacheInsight(
  inn: string,
): Promise<PerplexityInsight | null> {
  return checkCache(inn);
}

async function upsertCache(inn: string, papers: PerplexityPaper[]): Promise<void> {
  const supabase = createSupabaseServer();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + TTL_MS);
  const { error } = await supabase.from(CACHE_TABLE).upsert(
    {
      inn_target: inn,
      papers,
      generated_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    },
    { onConflict: "inn_target" },
  );
  if (error !== null) {
    throw new Error(
      `Perplexity 캐시 업서트 실패: ${error.message}. panama_perplexity_cache 권한/스키마를 확인하세요.`,
    );
  }
}

async function fetchFromPerplexityApi(inn: string): Promise<PerplexityPaper[]> {
  const apiKey = resolvePerplexityKey();
  const response = await fetch(PERPLEXITY_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: PERPLEXITY_MODEL,
      messages: [
        {
          role: "system",
          content:
            "당신은 의약품 시장 분석 전문가입니다. 주어진 INN에 대한 최근 학술 논문과 시장 동향을 5~10개 추출하고, JSON 배열만 반환하세요.",
        },
        {
          role: "user",
          content:
            `INN: ${inn}\n` +
            "중남미(특히 파나마) 시장에서 임상 근거, 처방 패턴, 가격 동향 관련 최근 논문 5~10개를 JSON 배열로 반환하세요.\n" +
            '[{"title":"", "url":"", "published_at":"", "summary":"", "source":""}]',
        },
      ],
      max_tokens: 1500,
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Perplexity API 호출 실패: HTTP ${String(response.status)} ${response.statusText}`,
    );
  }
  const raw = (await response.json()) as unknown;
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new Error("Perplexity API 응답 형식이 객체가 아닙니다.");
  }
  const choices = (raw as Record<string, unknown>).choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    throw new Error("Perplexity API 응답에 choices가 없습니다.");
  }
  const first = choices[0];
  if (typeof first !== "object" || first === null || Array.isArray(first)) {
    throw new Error("Perplexity API 첫 choice 형식이 잘못되었습니다.");
  }
  const message = (first as Record<string, unknown>).message;
  if (typeof message !== "object" || message === null || Array.isArray(message)) {
    throw new Error("Perplexity API message 형식이 잘못되었습니다.");
  }
  const content = (message as Record<string, unknown>).content;
  if (typeof content !== "string" || content.trim() === "") {
    throw new Error("Perplexity API message.content가 비어 있습니다.");
  }
  return parsePapersFromContent(content);
}

export async function fetchPerplexityInsight(
  inn: string,
): Promise<PerplexityInsight> {
  const normalizedInn = inn.trim();
  if (normalizedInn === "") {
    const now = new Date().toISOString();
    return {
      inn: normalizedInn,
      papers: [],
      generated_at: now,
      expires_at: now,
      source: "api_fresh",
    };
  }

  const cached = await checkCache(normalizedInn);
  if (cached !== null) {
    return cached;
  }

  try {
    const papers = await fetchFromPerplexityApi(normalizedInn);
    if (papers.length > 0) {
      await upsertCache(normalizedInn, papers);
    }
    const now = new Date();
    return {
      inn: normalizedInn,
      papers,
      generated_at: now.toISOString(),
      expires_at: new Date(now.getTime() + TTL_MS).toISOString(),
      source: "api_fresh",
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[perplexity] API 실패(${normalizedInn}): ${msg}`);
    const now = new Date().toISOString();
    return {
      inn: normalizedInn,
      papers: [],
      generated_at: now,
      expires_at: now,
      source: "api_fresh",
    };
  }
}

export async function batchFetchPerplexityInsights(
  inns: string[],
): Promise<PerplexityInsight[]> {
  const out: PerplexityInsight[] = [];
  for (const inn of inns) {
    out.push(await fetchPerplexityInsight(inn));
  }
  return out;
}
