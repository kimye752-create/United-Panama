import Anthropic from "@anthropic-ai/sdk";
import type { Message } from "@anthropic-ai/sdk/resources/messages/messages.js";
import { createHash } from "node:crypto";

import { getSupabaseClient } from "@/src/utils/db_connector";
import type { ScenarioRow } from "@/src/logic/phase2/price_scenario_generator";
import type { Phase2MarketSegment } from "@/src/logic/phase2/margin_policy_resolver";

import { buildPhase2FallbackReport } from "./phase2_fallback_template";
import {
  parsePhase2Payload,
  PHASE2_TOOL,
  type Phase2ReportPayload,
} from "./phase2_schema";
import { PHASE2_SYSTEM_CONTEXT } from "./phase2_system_context";

const CACHE_TABLE = "panama_report_cache";
const HAIKU_MODEL = "claude-haiku-4-5-20251001";

export interface Phase2GeneratorInput {
  sourceProductId: string;
  productName: string;
  inn: string;
  market: Phase2MarketSegment;
  referencePricePab: number;
  baselineFormula: string;
  scenarios: ScenarioRow[];
}

export interface Phase2GeneratorResult {
  payload: Phase2ReportPayload;
  source: "cache" | "haiku" | "fallback";
  modelUsed: string;
}

function toDeterministicUuid(seed: string): string {
  const hex = createHash("sha256").update(seed).digest("hex");
  const p1 = hex.slice(0, 8);
  const p2 = hex.slice(8, 12);
  const p3 = `4${hex.slice(13, 16)}`;
  const p4 = `${(parseInt(hex.slice(16, 17), 16) & 0x3 | 0x8).toString(16)}${hex.slice(17, 20)}`;
  const p5 = hex.slice(20, 32);
  return `${p1}-${p2}-${p3}-${p4}-${p5}`;
}

function cacheProductId(productId: string, market: Phase2MarketSegment): string {
  return toDeterministicUuid(`phase2-report:${productId}:${market}`);
}

function buildPrompt(input: Phase2GeneratorInput): string {
  const baseline = input.scenarios.find((s) => s.scenario === "avg") ?? input.scenarios[0];
  const agg = input.scenarios.find((s) => s.scenario === "agg") ?? baseline;
  const cons = input.scenarios.find((s) => s.scenario === "cons") ?? baseline;
  const logicName = input.market === "public" ? "Logic A" : "Logic B";
  const marketLabel = input.market === "public" ? "공공 시장" : "민간 시장";
  return `
[입력]
- 제품: ${input.productName} (${input.inn})
- 시장: ${marketLabel}
- 참조가: ${input.referencePricePab.toFixed(2)} PAB
- 적용 로직: ${logicName}
- 기준 수식: ${input.baselineFormula}

[시나리오 수치]
- 공격(agg): FOB ${agg.fob.fobUsd.toFixed(2)}, CFR ${agg.incoterms.cfrUsd.toFixed(2)}, CIF ${agg.incoterms.cifUsd.toFixed(2)}, DDP ${agg.incoterms.ddpUsd.toFixed(2)}
- 기준(avg): FOB ${baseline.fob.fobUsd.toFixed(2)}, CFR ${baseline.incoterms.cfrUsd.toFixed(2)}, CIF ${baseline.incoterms.cifUsd.toFixed(2)}, DDP ${baseline.incoterms.ddpUsd.toFixed(2)}
- 보수(cons): FOB ${cons.fob.fobUsd.toFixed(2)}, CFR ${cons.incoterms.cfrUsd.toFixed(2)}, CIF ${cons.incoterms.cifUsd.toFixed(2)}, DDP ${cons.incoterms.ddpUsd.toFixed(2)}

[출력 제약]
- block1~5는 도구 스키마 길이 제한을 지킬 것
- block3에는 공격/기준/보수 각각의 산정 이유를 반드시 포함할 것
- block5에서 권고 수출가를 기준(avg) FOB로 명시할 것
`.trim();
}

async function callModel(model: string, input: Phase2GeneratorInput): Promise<Phase2ReportPayload> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey === undefined || apiKey.trim() === "") {
    throw new Error("ANTHROPIC_API_KEY가 없어 2공정 보고서 LLM 생성이 불가능합니다.");
  }
  const client = new Anthropic({ apiKey });
  const response: Message = await client.messages.create({
    model,
    max_tokens: 1800,
    temperature: 0,
    system: PHASE2_SYSTEM_CONTEXT,
    tools: [PHASE2_TOOL],
    tool_choice: { type: "tool", name: "generate_phase2_report" },
    messages: [{ role: "user", content: buildPrompt(input) }],
  });
  const toolUseBlock = response.content.find((b) => b.type === "tool_use");
  if (toolUseBlock === undefined || toolUseBlock.type !== "tool_use") {
    throw new Error(`${model} 응답에 tool_use가 없습니다.`);
  }
  const parsed = parsePhase2Payload(toolUseBlock.input);
  if (parsed === null) {
    throw new Error(`${model} 출력이 phase2 스키마 검증에 실패했습니다.`);
  }
  return parsed;
}

async function tryCache(input: Phase2GeneratorInput): Promise<Phase2ReportPayload | null> {
  const sb = getSupabaseClient();
  const key = cacheProductId(input.sourceProductId, input.market);
  const { data, error } = await sb
    .from(CACHE_TABLE)
    .select("report_payload, expires_at")
    .eq("product_id", key)
    .maybeSingle();
  if (error !== null || data === null) {
    return null;
  }
  if (new Date(data.expires_at) < new Date()) {
    return null;
  }
  const reportPayload = (data.report_payload as Record<string, unknown>)["report"] as unknown;
  return parsePhase2Payload(reportPayload);
}

async function saveCache(
  input: Phase2GeneratorInput,
  payload: Phase2ReportPayload,
  modelUsed: string,
): Promise<void> {
  const sb = getSupabaseClient();
  const key = cacheProductId(input.sourceProductId, input.market);
  const reportEnvelope = {
    market_segment: "phase2_report",
    source_product_id: input.sourceProductId,
    market: input.market,
    report: payload,
  };
  const { error } = await sb.from(CACHE_TABLE).upsert(
    {
      product_id: key,
      case_grade: "B",
      report_payload: reportEnvelope,
      llm_model: modelUsed,
      generated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
    },
    { onConflict: "product_id" },
  );
  if (error !== null) {
    throw new Error(`phase2 캐시 저장 실패: ${error.message}`);
  }
}

export async function generatePhase2Report(
  input: Phase2GeneratorInput,
): Promise<Phase2GeneratorResult> {
  try {
    const cached = await tryCache(input);
    if (cached !== null) {
      return { payload: cached, source: "cache", modelUsed: "cache" };
    }
  } catch {
    // 캐시 조회 실패는 보고서 생성 자체를 막지 않음
  }

  try {
    const haikuPayload = await callModel(HAIKU_MODEL, input);
    try {
      await saveCache(input, haikuPayload, HAIKU_MODEL);
    } catch {
      // 캐시 저장 실패는 응답 성공 처리
    }
    return { payload: haikuPayload, source: "haiku", modelUsed: HAIKU_MODEL };
  } catch (haikuErr: unknown) {
    const m = haikuErr instanceof Error ? haikuErr.message : String(haikuErr);
    process.stderr.write(`[phase2_generator] Haiku failed: ${m}\n`);
  }

  const fallbackPayload = buildPhase2FallbackReport({
    productName: input.productName,
    inn: input.inn,
    market: input.market,
    referencePricePab: input.referencePricePab,
    baselineFormula: input.baselineFormula,
    scenarios: input.scenarios,
  });
  try {
    await saveCache(input, fallbackPayload, "phase2-fallback-template");
  } catch {
    // 캐시 저장 실패는 응답 성공 처리
  }
  return {
    payload: fallbackPayload,
    source: "fallback",
    modelUsed: "phase2-fallback-template",
  };
}
