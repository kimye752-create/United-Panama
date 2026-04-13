/**
 * W5: Report1 LLM 생성 — 캐시 → Opus 4.6 → Sonnet 4.6 → 규칙 폴백 (호출 한도 준수)
 */
import Anthropic from "@anthropic-ai/sdk";
import type { Message } from "@anthropic-ai/sdk/resources/messages/messages.js";
import type { SupabaseClient } from "@supabase/supabase-js";

import { buildFallbackReport, type FallbackInput } from "./report1_fallback_template";
import { getSupabaseClient } from "../utils/db_connector";
import {
  parseReport1Payload,
  REPORT1_SYSTEM_PROMPT,
  REPORT1_TOOL,
  type Report1Payload,
} from "./report1_schema";

const OPUS_MODEL = "claude-opus-4-6";
const SONNET_MODEL = "claude-sonnet-4-6";
const LLM_TIMEOUT_MS = 15000;
const MAX_TOKENS = 4000;
const CACHE_TABLE = "panama_report_cache";

/** 절대원칙 5: 실행당 LLM 호출 상한 (기본 3) */
function readMaxLlmCallsPerRun(): number {
  const raw = process.env.MAX_LLM_CALLS_PER_RUN;
  if (raw === undefined || raw.trim() === "") {
    return 3;
  }
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n) || n < 0) {
    return 3;
  }
  return Math.min(3, n);
}

export interface GeneratorInput {
  productId: string;
  innEn: string;
  brandName: string;
  caseGrade: "A" | "B" | "C";
  caseVerdict: string;
  emlWho: boolean;
  emlPaho: boolean;
  prevalenceMetric: string | null;
  /** PAHO 권역 참조 단가 등 — 없으면 null */
  pahoRegionalReference: string | null;
  distributorNames: string[];
  panamacompraCount: number;
  rawDataDigest: string;
}

export interface GeneratorResult {
  payload: Report1Payload;
  source: "cache" | "opus" | "sonnet" | "fallback";
  modelUsed: string;
}

async function tryCache(
  supabase: SupabaseClient,
  productId: string,
): Promise<Report1Payload | null> {
  try {
    const { data, error } = await supabase
      .from(CACHE_TABLE)
      .select("report_payload, expires_at")
      .eq("product_id", productId)
      .maybeSingle();

    if (error !== null) {
      throw new Error(`캐시 조회 실패: ${error.message}`);
    }
    if (data === null) {
      return null;
    }
    if (new Date(data.expires_at) < new Date()) {
      return null;
    }
    return parseReport1Payload(data.report_payload);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`panama_report_cache 읽기 중 오류: ${msg}`);
  }
}

async function saveCache(
  supabase: SupabaseClient,
  productId: string,
  caseGrade: "A" | "B" | "C",
  payload: Report1Payload,
  modelUsed: string,
): Promise<void> {
  try {
    const { error } = await supabase.from(CACHE_TABLE).upsert(
      {
        product_id: productId,
        case_grade: caseGrade,
        report_payload: payload,
        llm_model: modelUsed,
        generated_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
      { onConflict: "product_id" },
    );
    if (error !== null) {
      throw new Error(`캐시 upsert 실패: ${error.message}`);
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`Supabase 캐시 저장 중 오류: ${msg}`);
  }
}

function buildUserPrompt(input: GeneratorInput): string {
  const pahoLine =
    input.pahoRegionalReference !== null && input.pahoRegionalReference !== ""
      ? input.pahoRegionalReference
      : "해당 INN 시드 미적재 (낙찰·민간가만 근거)";
  return `[입력 데이터]
- 제품: ${input.brandName} (${input.innEn})
- Case 판정: ${input.caseGrade} (${input.caseVerdict})
- WHO EML 등재: ${input.emlWho ? "Y" : "N"}
- PAHO Strategic Fund 등재: ${input.emlPaho ? "Y" : "N"}
- 표적 질환 prevalence: ${input.prevalenceMetric ?? "데이터 없음 (폴백 룰 적용)"}
- PAHO 권역 참조 단가(별도 시드): ${pahoLine}
- 발굴 유통 파트너(회사명 중복 없음): ${input.distributorNames.join(", ")}
- PanamaCompra 최근 낙찰 건수: ${String(input.panamacompraCount)}

[Supabase raw 데이터 발췌]
${input.rawDataDigest}

위 데이터를 근거로 generate_report1 도구를 호출하여 보고서 본문을 생성하시오. 모든 필드는 필수이며, 도구의 description에 명시된 양식·금지·강제 룰을 100% 준수하시오.`;
}

async function callLLM(model: string, input: GeneratorInput): Promise<Report1Payload> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey === undefined || apiKey.trim() === "") {
    throw new Error(
      "ANTHROPIC_API_KEY가 없습니다. 환경변수를 설정한 뒤 다시 시도하세요.",
    );
  }
  const client = new Anthropic({ apiKey });

  const response: Message = await new Promise<Message>((resolve, reject) => {
    const t = setTimeout(() => {
      reject(new Error(`LLM timeout (${model})`));
    }, LLM_TIMEOUT_MS);
    client.messages
      .create({
        model,
        max_tokens: MAX_TOKENS,
        temperature: 0,
        system: REPORT1_SYSTEM_PROMPT,
        tools: [REPORT1_TOOL],
        tool_choice: { type: "tool", name: "generate_report1" },
        messages: [{ role: "user", content: buildUserPrompt(input) }],
      })
      .then((msg) => {
        clearTimeout(t);
        resolve(msg);
      })
      .catch((err: unknown) => {
        clearTimeout(t);
        reject(err);
      });
  });

  const toolUseBlock = response.content.find((b) => b.type === "tool_use");
  if (toolUseBlock === undefined || toolUseBlock.type !== "tool_use") {
    throw new Error(`${model} 응답에 tool_use 블록이 없습니다.`);
  }
  const parsed = parseReport1Payload(toolUseBlock.input);
  if (parsed === null) {
    throw new Error(`${model} 도구 출력이 스키마와 맞지 않습니다.`);
  }
  return parsed;
}

export async function generateReport1(input: GeneratorInput): Promise<GeneratorResult> {
  const maxCalls = readMaxLlmCallsPerRun();
  let llmCallsThisRun = 0;

  let supabase: SupabaseClient;
  try {
    supabase = getSupabaseClient();
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    process.stderr.write(`[report1_generator] Supabase 초기화 실패: ${msg}\n`);
    throw error;
  }

  try {
    const cached = await tryCache(supabase, input.productId);
    if (cached !== null) {
      return { payload: cached, source: "cache", modelUsed: "cache" };
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    process.stderr.write(`[report1_generator] 캐시 조회 실패, LLM 경로 진행: ${msg}\n`);
  }

  if (llmCallsThisRun < maxCalls) {
    llmCallsThisRun += 1;
    try {
      const payload = await callLLM(OPUS_MODEL, input);
      await saveCache(supabase, input.productId, input.caseGrade, payload, OPUS_MODEL);
      return { payload, source: "opus", modelUsed: OPUS_MODEL };
    } catch (opusErr: unknown) {
      const m =
        opusErr instanceof Error ? opusErr.message : String(opusErr);
      process.stderr.write(`[generator] Opus failed: ${m}\n`);
    }
  }

  if (llmCallsThisRun < maxCalls) {
    llmCallsThisRun += 1;
    try {
      const payload = await callLLM(SONNET_MODEL, input);
      await saveCache(supabase, input.productId, input.caseGrade, payload, SONNET_MODEL);
      return { payload, source: "sonnet", modelUsed: SONNET_MODEL };
    } catch (sonnetErr: unknown) {
      const m =
        sonnetErr instanceof Error ? sonnetErr.message : String(sonnetErr);
      process.stderr.write(`[generator] Sonnet failed: ${m}\n`);
    }
  }

  const fallbackInput: FallbackInput = {
    innEn: input.innEn,
    brandName: input.brandName,
    caseGrade: input.caseGrade,
    caseVerdict: input.caseVerdict,
    emlWho: input.emlWho,
    emlPaho: input.emlPaho,
    prevalenceMetric: input.prevalenceMetric,
    pahoRegionalReference: input.pahoRegionalReference,
    distributorNames: input.distributorNames,
    panamacompraCount: input.panamacompraCount,
  };
  const payload = buildFallbackReport(fallbackInput);
  return { payload, source: "fallback", modelUsed: "rule-based-template" };
}
