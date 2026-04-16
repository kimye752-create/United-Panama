/**
 * 메인 대시보드 — 파나마 의약·규제 뉴스 헤드라인 (Perplexity sonar)
 */
/// <reference types="node" />

import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });
loadEnv();

const PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions";
const PERPLEXITY_MODEL = "sonar";

export interface PanamaDashboardNewsItem {
  headline: string;
  meta_line: string;
}

export interface PanamaDashboardNewsPayload {
  items: PanamaDashboardNewsItem[];
  generated_at: string;
  source: "api" | "fallback";
  warning?: string;
}

function resolvePerplexityKey(): string | null {
  const key = process.env.PERPLEXITY_API_KEY ?? process.env.Perplexity_API_key;
  if (key === undefined || key.trim() === "") {
    return null;
  }
  return key.trim();
}

function normalizeItem(raw: unknown): PanamaDashboardNewsItem | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return null;
  }
  const obj = raw as Record<string, unknown>;
  const headline =
    typeof obj.headline === "string" && obj.headline.trim() !== ""
      ? obj.headline.trim()
      : null;
  if (headline === null) {
    return null;
  }
  const sourceLabel =
    typeof obj.source_label === "string" && obj.source_label.trim() !== ""
      ? obj.source_label.trim()
      : "출처 미상";
  const dateHint =
    typeof obj.date_hint === "string" && obj.date_hint.trim() !== ""
      ? obj.date_hint.trim()
      : "";
  const meta_line =
    dateHint !== ""
      ? `${sourceLabel} · ${dateHint}`
      : `${sourceLabel} · Perplexity 요약`;
  return {
    headline: headline.slice(0, 400),
    meta_line: meta_line.slice(0, 300),
  };
}

function parseItemsFromContent(content: string): PanamaDashboardNewsItem[] {
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
      const items = parsed
        .map((item) => normalizeItem(item))
        .filter((item): item is PanamaDashboardNewsItem => item !== null)
        .slice(0, 8);
      if (items.length > 0) {
        return items;
      }
    } catch {
      continue;
    }
  }
  return [];
}

const FALLBACK_ITEMS: PanamaDashboardNewsItem[] = [
  {
    headline:
      "Perplexity API 키가 설정되지 않았거나 뉴스를 불러오지 못했습니다. .env에 PERPLEXITY_API_KEY를 추가한 뒤 새로고침하세요.",
    meta_line: "United Panama · 안내",
  },
];

/**
 * 파나마 공중보건·의약품 규제·조달 관련 최근 헤드라인을 Perplexity로 조회합니다.
 */
export async function fetchPanamaDashboardNews(): Promise<PanamaDashboardNewsPayload> {
  const apiKey = resolvePerplexityKey();
  const generatedAt = new Date().toISOString();

  if (apiKey === null) {
    return {
      items: FALLBACK_ITEMS,
      generated_at: generatedAt,
      source: "fallback",
      warning:
        "PERPLEXITY_API_KEY가 비어 있습니다. 배포 환경 또는 .env.local에 키를 등록하세요.",
    };
  }

  try {
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
              "You summarize recent public news only. Respond with a single JSON array, no markdown outside JSON.",
          },
          {
            role: "user",
            content:
              "List 6 to 8 recent news headlines (2024–2026) relevant to Panama pharmaceutical market, public health (MINSA), medicine registration (DNFD), PanamaCompra public procurement of medicines, or regional Latin America pharma trade affecting Panama. " +
              "Each item: {\"headline\":\"English or Spanish title\",\"source_label\":\"outlet or agency name\",\"date_hint\":\"month/year or approximate\"}. " +
              "JSON array only, e.g. [{\"headline\":\"...\",\"source_label\":\"...\",\"date_hint\":\"...\"}]",
          },
        ],
        max_tokens: 1200,
        temperature: 0.15,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Perplexity API HTTP ${String(response.status)}: ${text.slice(0, 200)}`,
      );
    }

    const raw = (await response.json()) as unknown;
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
      throw new Error("Perplexity 응답이 객체가 아닙니다.");
    }
    const choices = (raw as Record<string, unknown>).choices;
    if (!Array.isArray(choices) || choices.length === 0) {
      throw new Error("Perplexity choices가 비어 있습니다.");
    }
    const first = choices[0];
    if (typeof first !== "object" || first === null || Array.isArray(first)) {
      throw new Error("Perplexity choice 형식 오류입니다.");
    }
    const message = (first as Record<string, unknown>).message;
    if (typeof message !== "object" || message === null || Array.isArray(message)) {
      throw new Error("Perplexity message 형식 오류입니다.");
    }
    const content = (message as Record<string, unknown>).content;
    if (typeof content !== "string" || content.trim() === "") {
      throw new Error("Perplexity 응답 본문이 비어 있습니다.");
    }

    const items = parseItemsFromContent(content);
    if (items.length === 0) {
      return {
        items: [
          {
            headline:
              "뉴스 본문을 파싱하지 못했습니다. 잠시 후 새로고침하거나 API 응답 형식을 확인하세요.",
            meta_line: "United Panama · 파싱",
          },
        ],
        generated_at: generatedAt,
        source: "fallback",
        warning: "JSON 파싱 결과가 비어 있습니다.",
      };
    }

    return {
      items,
      generated_at: generatedAt,
      source: "api",
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      items: [
        {
          headline: `뉴스 로드 중 오류: ${message.slice(0, 240)}`,
          meta_line: "United Panama · 오류",
        },
      ],
      generated_at: generatedAt,
      source: "fallback",
      warning: message,
    };
  }
}
