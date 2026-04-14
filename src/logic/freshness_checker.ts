/**
 * Top 7 — panama 행 단위 데이터 신선도 LLM 판정 (Claude Haiku)
 * 호출부는 별도 연동 — 본 모듈은 판정 API만 제공함.
 */
/// <reference types="node" />

import Anthropic from "@anthropic-ai/sdk";

const HAIKU_MODEL = "claude-haiku-4-5-20251001" as const;
const MAX_TOKENS = 200;
const TEMPERATURE = 0;
/** 시스템 기준일(박제) — 프롬프트 일관성용 */
const REFERENCE_DATE = "2026-04-14";

const SYSTEM_PROMPT = `당신은 파나마 제약 시장 분석 시스템의 데이터 신선도 판정자입니다.
각 데이터 항목이 현재 시점(${REFERENCE_DATE}) 기준으로 신선한지 판정하세요.

판정 기준:
- 경제 거시지표 (World Bank, WHO): 1-2년 시차 정상
- 공공조달 낙찰 (PanamaCompra OCDS): 과거 체결 건은 불변
- 환율: 1일 초과 시 stale
- 법령/규제 메타데이터: 법령 개정 없으면 불변
- 약가 리스트 (CABAMED): 월 1회 갱신 정상

반드시 JSON 한 객체만 출력하세요. 키: status, confidence, reasoning, suggested_action
status는 "fresh" | "stale_likely" | "stale_confirmed" 중 하나.
confidence는 0.0~1.0 숫자.
reasoning은 한글 1~2문장.
suggested_action은 "pass" | "refresh" | "manual_review" 중 하나.`;

export type FreshnessInput = {
  source: string;
  collectedAt: string;
  paNotes: Record<string, unknown>;
  valueDescription: string;
};

export type FreshnessStatus = "fresh" | "stale_likely" | "stale_confirmed";

export type FreshnessSuggestedAction = "pass" | "refresh" | "manual_review";

export type FreshnessResult = {
  status: FreshnessStatus;
  confidence: number;
  reasoning: string;
  suggested_action: FreshnessSuggestedAction;
};

function fallbackFailure(message: string): FreshnessResult {
  return {
    status: "stale_likely",
    confidence: 0.3,
    reasoning: message,
    suggested_action: "manual_review",
  };
}

function parseJsonResult(text: string): FreshnessResult | null {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }
  const slice = trimmed.slice(start, end + 1);
  try {
    const raw: unknown = JSON.parse(slice);
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
      return null;
    }
    const o = raw as Record<string, unknown>;
    const status = o["status"];
    const confidence = o["confidence"];
    const reasoning = o["reasoning"];
    const suggested = o["suggested_action"];
    if (
      (status !== "fresh" &&
        status !== "stale_likely" &&
        status !== "stale_confirmed") ||
      typeof confidence !== "number" ||
      typeof reasoning !== "string" ||
      (suggested !== "pass" &&
        suggested !== "refresh" &&
        suggested !== "manual_review")
    ) {
      return null;
    }
    const c = Math.min(1, Math.max(0, confidence));
    return {
      status,
      confidence: c,
      reasoning,
      suggested_action: suggested,
    };
  } catch {
    return null;
  }
}

/**
 * 단일 행 신선도 판정 — Haiku 호출 (~$0.00005/건 가정)
 */
export async function checkFreshness(
  input: FreshnessInput,
): Promise<FreshnessResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey === undefined || apiKey.trim() === "") {
    return fallbackFailure(
      "ANTHROPIC_API_KEY가 없어 LLM 판정을 건너뜁니다. .env를 설정하세요.",
    );
  }

  try {
    const client = new Anthropic({ apiKey });
    const userPayload = JSON.stringify({
      source: input.source,
      collectedAt: input.collectedAt,
      paNotes: input.paNotes,
      valueDescription: input.valueDescription,
    });

    const msg = await client.messages.create({
      model: HAIKU_MODEL,
      max_tokens: MAX_TOKENS,
      temperature: TEMPERATURE,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPayload }],
    });

    const block = msg.content[0];
    if (block === undefined || block.type !== "text") {
      return fallbackFailure("LLM 응답 블록이 비어 있거나 텍스트가 아닙니다.");
    }
    const parsed = parseJsonResult(block.text);
    if (parsed === null) {
      return fallbackFailure("LLM 판정 실패: JSON 파싱 불가");
    }
    return parsed;
  } catch (error: unknown) {
    const msg =
      error instanceof Error ? error.message : "알 수 없는 오류";
    return fallbackFailure(`LLM 판정 실패: ${msg}`);
  }
}

/**
 * 배치 판정 — 입력 순서와 동일한 배열 반환
 */
export async function batchCheckFreshness(
  inputs: FreshnessInput[],
): Promise<FreshnessResult[]> {
  const out: FreshnessResult[] = [];
  for (const input of inputs) {
    // 순차 호출로 레이트 한도 완화
    out.push(await checkFreshness(input));
  }
  return out;
}
