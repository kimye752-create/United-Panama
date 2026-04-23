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

function stringifyUnknownError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function formatHaikuErrorDetails(error: unknown): string {
  const chunks: string[] = [];
  if (error instanceof Error) {
    chunks.push(`message=${error.message}`);
  }
  if (typeof error === "object" && error !== null && !Array.isArray(error)) {
    const row = error as Record<string, unknown>;
    if (typeof row.status === "number") {
      chunks.push(`status=${String(row.status)}`);
    }
    if (typeof row.type === "string") {
      chunks.push(`type=${row.type}`);
    }
    if (typeof row.name === "string") {
      chunks.push(`name=${row.name}`);
    }
    if (row.error !== undefined) {
      try {
        chunks.push(`error=${JSON.stringify(row.error).slice(0, 600)}`);
      } catch {
        chunks.push("error=[unserializable]");
      }
    }
  }
  return chunks.join(" | ");
}

export interface Phase2GeneratorInput {
  sourceProductId: string;
  productName: string;
  inn: string;
  /** 제형 (Tab., Soft Cap., Inhaler DPI 등) */
  formulation?: string;
  /** 독점 기술 (CombiGel, BILDAS, Activair DPI 등) */
  patentTech?: string | null;
  /** 복합제 여부 */
  isCombinationDrug?: boolean;
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
  const logicName = input.market === "public" ? "Logic A (공공조달 역산)" : "Logic B (민간 마진 역산)";
  const marketLabel = input.market === "public" ? "공공 시장 (CSS/PanamaCompra)" : "민간 시장 (약국·도매 체인)";

  const productDetail = [
    `- 제품명: ${input.productName} (${input.inn})`,
    input.formulation ? `- 제형: ${input.formulation}` : null,
    input.isCombinationDrug ? `- 복합제: 2성분 이상 (DNFD 심사 기간 가산 요인)` : null,
    input.patentTech
      ? `- 독점 기술: ${input.patentTech} (경쟁사 동일 기술 없음 — 프리미엄 포지셔닝 근거)`
      : `- 독점 기술: 없음 (일반 제형)`,
  ].filter(Boolean).join("\n");

  return `
[제품 정보]
${productDetail}

[시장 및 가격]
- 타겟 시장: ${marketLabel}
- 참조가: USD ${input.referencePricePab.toFixed(2)} (PAB 1:1 USD 등가)
- 적용 로직: ${logicName}
- 기준 FOB 역산 수식: ${input.baselineFormula}

[시나리오 수치 — 반드시 이 값 그대로 인용]
- 저가 진입 / Penetration (agg): FOB USD ${agg.fob.fobUsd.toFixed(4)}, FOB천장 ${agg.fob.fobCeilingUsd.toFixed(4)}, 배수 ${agg.fob.strategyMultiplier.toFixed(2)}x | CFR ${agg.incoterms.cfrUsd.toFixed(4)}, CIF ${agg.incoterms.cifUsd.toFixed(4)}, DDP ${agg.incoterms.ddpUsd.toFixed(4)}
- 기준가   / Reference   (avg): FOB USD ${baseline.fob.fobUsd.toFixed(4)}, FOB천장 ${baseline.fob.fobCeilingUsd.toFixed(4)}, 배수 ${baseline.fob.strategyMultiplier.toFixed(2)}x | CFR ${baseline.incoterms.cfrUsd.toFixed(4)}, CIF ${baseline.incoterms.cifUsd.toFixed(4)}, DDP ${baseline.incoterms.ddpUsd.toFixed(4)}
- 프리미엄  / Premium    (cons): FOB USD ${cons.fob.fobUsd.toFixed(4)}, FOB천장 ${cons.fob.fobCeilingUsd.toFixed(4)}, 배수 ${cons.fob.strategyMultiplier.toFixed(2)}x | CFR ${cons.incoterms.cfrUsd.toFixed(4)}, CIF ${cons.incoterms.cifUsd.toFixed(4)}, DDP ${cons.incoterms.ddpUsd.toFixed(4)}

[출력 지침]
- block1: 시장·제품 개요 (파나마 콜론 FTZ·CSS·수입의존도 + 제품 차별화 포인트 포함)
- block2: FOB 역산 경로 (FTA 0%·ITBMS 0% 필수 언급, 경쟁사 평균가 참조)
- block3: 저가진입/기준가/프리미엄 각각 FOB 수치 인용 + 수입상 마진 영향 포함
- block4: FOB→CFR→CIF→DDP 순산 요약
- block5: DNFD 리스크 + 경쟁 포지셔닝 + 3단계 마진 전략 단계 + 권고 수출가(avg FOB) 최종 제시
`.trim();
}

async function callModel(model: string, input: Phase2GeneratorInput): Promise<Phase2ReportPayload> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey === undefined || apiKey.trim() === "") {
    throw new Error("ANTHROPIC_API_KEY가 없어 2단계 수출가격 책정 보고서 LLM 생성이 불가능합니다.");
  }
  const client = new Anthropic({ apiKey });
  const response: Message = await client.messages.create({
    model,
    max_tokens: 2400,
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
    process.stderr.write(`[phase2_generator] Haiku ATTEMPT model=${HAIKU_MODEL}\n`);
    const haikuPayload = await callModel(HAIKU_MODEL, input);
    try {
      await saveCache(input, haikuPayload, HAIKU_MODEL);
    } catch {
      // 캐시 저장 실패는 응답 성공 처리
    }
    return { payload: haikuPayload, source: "haiku", modelUsed: HAIKU_MODEL };
  } catch (haikuErr: unknown) {
    const m = stringifyUnknownError(haikuErr);
    const details = formatHaikuErrorDetails(haikuErr);
    process.stderr.write(`[phase2_generator] Haiku failed: ${m}\n`);
    process.stderr.write(`[phase2_generator] Haiku failed details: ${details}\n`);
    process.stderr.write(
      `[phase2_generator] KEY_EXISTS: ${String(!!process.env.ANTHROPIC_API_KEY)}, KEY_LEN: ${String(process.env.ANTHROPIC_API_KEY?.length ?? 0)}\n`,
    );
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
