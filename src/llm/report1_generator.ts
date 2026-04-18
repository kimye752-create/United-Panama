/**
 * W5: Report1 LLM 생성 — 캐시 → Claude Haiku → 규칙 폴백 (호출 한도 준수)
 */
import Anthropic from "@anthropic-ai/sdk";
import type { Message } from "@anthropic-ai/sdk/resources/messages/messages.js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ZodIssue } from "zod";

import {
  buildFallbackReport,
  buildFallbackReportV3,
  type FallbackInput,
} from "./report1_fallback_template";
import type { EntryFeasibility } from "./logic/panama_entry_feasibility";
import type { MarketPriceStats } from "../logic/market_stats";
import type { PerplexityPaper } from "../logic/perplexity_insights";
import { getSupabaseClient } from "../utils/db_connector";
import { findProductById } from "../utils/product-dictionary";
import {
  parseReport1Payload,
  REPORT1_PAYLOAD_SCHEMA,
  parseReport1PayloadV3,
  REPORT1_SYSTEM_PROMPT,
  REPORT1_SYSTEM_PROMPT_V3,
  REPORT1_TOOL,
  REPORT1_TOOL_V3,
  type Report1Payload,
  type Report1PayloadV3,
} from "./report1_schema";

/** 신선도 판정(`freshness_checker`)과 동일 Haiku 스냅샷 ID */
const HAIKU_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001";
const LLM_TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS ?? 58000);
const LLM_RETRY_TIMEOUT_MS = 30000;
const MAX_TOKENS = 4096;
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

function normalizeTimeoutMs(value: number, fallback: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }
  return Math.trunc(value);
}

function canRetryHaiku(error: unknown): boolean {
  const raw = stringifyUnknownError(error).toLowerCase();
  return (
    raw.includes("timeout") ||
    raw.includes("network") ||
    raw.includes("fetch failed") ||
    raw.includes("econnreset") ||
    raw.includes("etimedout") ||
    raw.includes("econnrefused") ||
    raw.includes("429") ||
    raw.includes("schema mismatch") ||
    raw.includes("parse")
  );
}

function getValueByIssuePath(source: unknown, path: PropertyKey[]): unknown {
  let current: unknown = source;
  for (const key of path) {
    if (typeof key === "symbol") {
      return undefined;
    }
    if (typeof key === "number") {
      if (!Array.isArray(current) || key < 0 || key >= current.length) {
        return undefined;
      }
      current = current[key];
      continue;
    }
    if (typeof current !== "object" || current === null || Array.isArray(current)) {
      return undefined;
    }
    const row = current as Record<string, unknown>;
    current = row[key];
  }
  return current;
}

function buildZodIssueLogs(source: unknown, issues: ZodIssue[]): string {
  const summary = issues.map((issue) => {
    const receivedValue = getValueByIssuePath(source, issue.path);
    let receivedLength: number | null = null;
    if (typeof receivedValue === "string") {
      receivedLength = receivedValue.length;
    } else if (Array.isArray(receivedValue)) {
      receivedLength = receivedValue.length;
    }
    return {
      path: issue.path.map((node) => String(node)).join("."),
      code: issue.code,
      message: issue.message,
      received_length: receivedLength,
    };
  });
  return JSON.stringify(summary, null, 2);
}

export interface GeneratorInput {
  productId: string;
  innEn: string;
  brandName: string;
  caseGrade: "A" | "B" | "C";
  caseVerdict: string;
  emlWho: boolean;
  emlPaho: boolean;
  /** 비어 있으면 역학 인용 생략(폴백·프롬프트에서 다른 INN·거시 행으로 채우지 않음) */
  prevalenceMetric: string;
  /** PAHO 권역 참조 단가 등 — 없으면 null */
  pahoRegionalReference: string | null;
  distributorNames: string[];
  panamacompraCount: number;
  panamacompraStats: MarketPriceStats | null;
  panamacompraV3Top: {
    totalCount: number;
    proveedor: string;
    count: number;
    proveedorWins: number;
    fabricante: string;
    paisOrigen: string;
    nombreComercial: string;
    entidadCompradora: string;
    fechaOrden: string;
    representativePrice: number | null;
  } | null;
  cabamedStats: MarketPriceStats | null;
  rawDataDigest: string;
  entryFeasibility: EntryFeasibility;
  entryFeasibilityText: string;
  perplexityPapers?: PerplexityPaper[];
}

export interface GeneratorResult {
  payload: Report1Payload;
  source: "cache" | "haiku" | "fallback";
  modelUsed: string;
}

export interface GeneratorResultV3 {
  payload: Report1PayloadV3;
  source: "haiku" | "fallback";
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
  const selectedProduct = findProductById(input.productId);
  const selectedInn = selectedProduct?.who_inn_en ?? "UNKNOWN";
  const selectedAtc4 =
    selectedProduct?.is_combination_drug === true &&
    selectedProduct.secondary_atc4 !== undefined &&
    selectedProduct.secondary_atc4.trim() !== ""
      ? `${selectedProduct.atc4_code} + ${selectedProduct.secondary_atc4}`
      : (selectedProduct?.atc4_code ?? "UNKNOWN");
  const selectedKrBrand = selectedProduct?.kr_brand_name ?? "UNKNOWN";
  const pahoLine =
    input.pahoRegionalReference !== null && input.pahoRegionalReference !== ""
      ? input.pahoRegionalReference
      : "해당 INN 시드 미적재 (낙찰·민간가만 근거)";
  const aceclofenacFootnoteRule =
    input.innEn === "Aceclofenac" &&
    input.prevalenceMetric.includes("latam_average")
      ? `INN Aceclofenac + prevalence에 scope=latam_average 포함: 1번 줄에서 괄호(scope) 구간은 쓰지 말고, block3_latam_scope_footnote에 시스템 프롬프트 고정 각주 한 줄을 넣을 것.`
      : `INN이 Aceclofenac이 아니거나 latam_average 없음: block3_latam_scope_footnote는 빈 문자열.`;

  const statLine = (label: string, stats: MarketPriceStats | null): string => {
    if (stats === null) {
      return `${label}: 해당 INN 매칭 경쟁품 없음`;
    }
    return `${label}: 건수 ${String(stats.count)} / 평균 ${String(stats.avgPrice)} / 최고 ${String(
      stats.maxPrice,
    )} / 최저 ${String(stats.minPrice)}`;
  };
  const pricingFallbackGuidance =
    input.panamacompraStats === null && input.cabamedStats === null
      ? "해당 INN은 파나마 공공조달 데이터 매칭 경쟁품 없음. 거시 지표 기반 진입 분석."
      : "";
  const v3MetaLine =
    input.panamacompraV3Top === null
      ? "PanamaCompra V3 직접 메타: 없음"
      : [
          `PanamaCompra V3 직접 메타: 총 ${String(input.panamacompraV3Top.totalCount)}건`,
          `핵심 proveedor=${input.panamacompraV3Top.proveedor} (${String(input.panamacompraV3Top.proveedorWins)}건)`,
          `fabricante=${input.panamacompraV3Top.fabricante}`,
          `pais_origen=${input.panamacompraV3Top.paisOrigen}`,
          `nombre_comercial=${input.panamacompraV3Top.nombreComercial}`,
          `entidad=${input.panamacompraV3Top.entidadCompradora}`,
          `fecha=${input.panamacompraV3Top.fechaOrden}`,
          `precio=${input.panamacompraV3Top.representativePrice !== null ? String(input.panamacompraV3Top.representativePrice) : "N/A"}`,
        ].join(" | ");
  const v3PromptRules =
    input.panamacompraV3Top === null
      ? "PanamaCompra V3 직접 메타가 없으면 일반 공공조달 규칙만 따른다."
      : `PanamaCompra V3 직접 메타가 존재하므로 아래를 강제:
1) 블록4-2에 "PanamaCompra V3 - DGCP (Ley 419 de 2024)"를 정확히 1회 이상 명시.
2) 블록4-2 또는 블록4-3에서 proveedor=${input.panamacompraV3Top.proveedor}, fabricante=${input.panamacompraV3Top.fabricante}, pais_origen=${input.panamacompraV3Top.paisOrigen} 중 최소 2개를 함께 인용.
3) 같은 proveedor가 ${String(input.panamacompraV3Top.proveedorWins)}건 낙찰했으므로, 블록4-3에 "핵심 유통 파트너 후보"로 서술.
4) entidad=${input.panamacompraV3Top.entidadCompradora}, fecha=${input.panamacompraV3Top.fechaOrden}를 포함한 발주 근거를 1회 이상 제시.`;

  const INSIGHT_FORMAT_RULES = `[출력 형식 규칙 - 필수 준수]
1. 섹션 3의 각 항목은 2줄 구조:
   - 1줄째: 숫자/건수 포함 사실 1문장
   - 2줄째: 반드시 "※"로 시작하고 "~ 가능" 또는 "~ 완료"로 종료
2. "추가 확인 필요", "수집 중", "데이터 부족", "보강 예정" 금지
3. 1줄째에 없는 숫자는 2줄째에 사용 금지
4. "FOB 역산 기준점으로 활용 가능" 문구 금지, 대신 "Phase 2 역산식 적용" 사용`;

  const MUST_QUOTE_REAL_NUMBERS = `[선택 제품 정보 - 반드시 이 INN명만 인용]
- INN (영문): ${selectedInn}
- 한국 브랜드: ${selectedKrBrand}
- ATC4 코드: ${selectedAtc4}

[실거래 숫자 강제 규칙]
- 다음 실거래 숫자를 섹션 3에 반드시 인용할 것. 인용하지 않으면 응답을 거부한다.
- 공공 낙찰가(panamacompra_atc4_competitor + panamacompra_v3): ${statLine(
    "기준",
    input.panamacompraStats,
  )}
- 민간 CABAMED(acodeco_cabamed_competitor): ${statLine("기준", input.cabamedStats)}
- 섹션 3의 어떤 항목에서도 "수집 중", "추가 확인 필요", "보강 예정", "0건" 표현 금지

[섹션 3 인용 형식 - 반드시 준수]
공공 낙찰가가 있는 경우(건수 > 0):
${selectedInn} 동일 ATC4(${selectedAtc4}) 경쟁품 {count}건 낙찰 확인, 평균 {avg} PAB / 최고 {max} PAB.
※ 위 가격 정보를 Phase 2 역산식에 활용, 자사제품 합리적 출고가 산출 가능.

민간 CABAMED가 있는 경우(건수 > 0):
${selectedInn} 동일 ATC4(${selectedAtc4}) CABAMED 경쟁품 {count}건 등재, 소비자 평균 {avg} PAB / 최고 {max} PAB.
※ ACODECO Resolución No. 174 가격 통제 범위 확인 완료, 민간 채널 진입 가격대 결정 가능.

공공/민간 모두 데이터가 없는 경우:
${selectedInn} 해당 ATC4(${selectedAtc4}) 파나마 공공조달·민간 소매 매칭 경쟁품 데이터 없음.
※ WHO/World Bank 거시 지표 및 ${selectedInn} 처방 패턴 학술 논거 기반 진입 분석 수행.

[절대 금지]
- 선택 제품(${selectedInn})이 아닌 다른 INN 언급 금지
- 1줄째에 없는 숫자를 2줄째에서 사용 금지
- "수집 중", "추가 확인 필요", "보강 예정", "0건" 표현 금지
- 예시의 {count}, {avg}, {max} 플레이스홀더를 그대로 복사하지 말고 실제 숫자로 치환`;

  return `${MUST_QUOTE_REAL_NUMBERS}

[진출 가능성 자동 판정 - 블록 4-5에 반드시 인용]
${input.entryFeasibilityText}

근거 데이터:
- 등급: ${input.entryFeasibility.grade}
- 판정: ${input.entryFeasibility.verdict}
- 경로: ${input.entryFeasibility.path}
- 기간: ${input.entryFeasibility.duration_days !== null ? String(input.entryFeasibility.duration_days) : "N/A"}일
- 비용: $${input.entryFeasibility.cost_usd !== null ? String(input.entryFeasibility.cost_usd) : "N/A"}

[출력 형식 - 블록 4-5]
진출 가능성: [등급] [판정 한 줄]. 경로 [경로명]. 예상 [기간]일/$[비용].
※ [근거 + 한국유나이티드제약 입장 시사점]

[입력 데이터]
- 제품: ${input.brandName} (${input.innEn})
- Case 판정: ${input.caseGrade} (${input.caseVerdict})
- WHO EML 등재: ${input.emlWho ? "Y" : "N"}
- PAHO Strategic Fund 등재: ${input.emlPaho ? "Y" : "N"}
- 표적 질환 prevalence: ${input.prevalenceMetric.trim() !== "" ? input.prevalenceMetric : "없음(해당 product_id DB 행 없음, 인용 생략)"}
- PAHO 권역 참조 단가(별도 시드): ${pahoLine}
- 파나마 의약품 시장 규모(대표값): US$ 496.00m (2024 Statista, 표기 시 $0.50B 병기 권장)
- 발굴 유통 파트너(회사명 중복 없음): ${input.distributorNames.join(", ")}
- PanamaCompra 최근 낙찰 건수: ${String(input.panamacompraCount)}

[실거래 통계 - 이 숫자를 우선 인용]
- ${statLine("공공 낙찰가(panamacompra_atc4_competitor + panamacompra_v3)", input.panamacompraStats)}
- ${statLine("민간 CABAMED(acodeco_cabamed_competitor)", input.cabamedStats)}
- ${v3MetaLine}
${pricingFallbackGuidance !== "" ? `- 대체 문구: ${pricingFallbackGuidance}` : ""}

[PanamaCompra V3 강화 규칙]
${v3PromptRules}

[섹션 3 형식 강제]
${INSIGHT_FORMAT_RULES}

[블록3 길이 가이드 — 도구 스키마와 동일]
- block3_reasoning: 5~8개 bullet
- 각 bullet은 반드시 150~250자 범위
- 250자 초과 시 도구 호출이 거부되므로 절대 초과하지 말 것

[블록4 길이 가이드 — 도구 스키마와 동일]
- block4_1_channel, block4_2_pricing, block4_3_partners, block4_4_risks, block4_5_entry_feasibility
- 각 섹션은 반드시 150~250자 범위, 절대 250자 초과 금지
- 7개 필드 모두 생성해야 하며 block4_3~block4_5 누락 시 무효 처리됨
- 핵심 근거만 압축해 간결하게 작성
${aceclofenacFootnoteRule}

[Supabase raw 데이터 발췌]
${input.rawDataDigest}

위 데이터를 근거로 generate_report1 도구를 호출하여 보고서 본문을 생성하시오. 모든 필드는 필수이며, 도구의 description에 명시된 양식·금지·강제 룰을 100% 준수하시오.`;
}

function buildUserPromptV3(input: GeneratorInput): string {
  const selectedProduct = findProductById(input.productId);
  const selectedInn = selectedProduct?.who_inn_en ?? input.innEn;
  const selectedAtc4 =
    selectedProduct?.is_combination_drug === true &&
    selectedProduct.secondary_atc4 !== undefined &&
    selectedProduct.secondary_atc4.trim() !== ""
      ? `${selectedProduct.atc4_code} + ${selectedProduct.secondary_atc4}`
      : (selectedProduct?.atc4_code ?? "UNKNOWN");
  const panamacompraLine =
    input.panamacompraStats === null
      ? "공공조달 통계: 미수집"
      : `공공조달 통계: 건수 ${String(input.panamacompraStats.count)}, 평균 ${String(input.panamacompraStats.avgPrice)}, 최고 ${String(input.panamacompraStats.maxPrice)}, 최저 ${String(input.panamacompraStats.minPrice)}`;
  const cabamedLine =
    input.cabamedStats === null
      ? "민간 소매 통계: 미수집"
      : `민간 소매 통계: 건수 ${String(input.cabamedStats.count)}, 평균 ${String(input.cabamedStats.avgPrice)}, 최고 ${String(input.cabamedStats.maxPrice)}, 최저 ${String(input.cabamedStats.minPrice)}`;

  return `[V3 입력 데이터]
- 제품명: ${input.brandName}
- INN: ${selectedInn}
- ATC4: ${selectedAtc4}
- Case 등급/판정: ${input.caseGrade} / ${input.caseVerdict}
- WHO EML: ${input.emlWho ? "Y" : "N"}
- PAHO Strategic Fund: ${input.emlPaho ? "Y" : "N"}
- prevalence: ${input.prevalenceMetric.trim() !== "" ? input.prevalenceMetric : "미수집"}
- 발굴 파트너: ${input.distributorNames.join(", ")}
- ${panamacompraLine}
- ${cabamedLine}
- PanamaCompra V3 top: ${input.panamacompraV3Top === null ? "미수집" : JSON.stringify(input.panamacompraV3Top)}
- entryFeasibility: ${JSON.stringify(input.entryFeasibility)}
- entryFeasibilityText: ${input.entryFeasibilityText}

[V3 강제 규칙]
- 반드시 generate_report1_v3 도구 호출
- 필수 필드 14개 전부 생성
- 각 문자열 필드 250자 초과 금지
- data_gaps는 입력 통계를 기준으로 true/false 판정
- block4_papers는 최소 1개, block4_databases는 최소 3개`;
}

async function callLLM(
  model: string,
  input: GeneratorInput,
  timeoutMs: number,
): Promise<Report1Payload> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey === undefined || apiKey.trim() === "") {
    throw new Error(
      "ANTHROPIC_API_KEY가 없습니다. 환경변수를 설정한 뒤 다시 시도하세요.",
    );
  }
  const client = new Anthropic({ apiKey });
  const userPrompt = buildUserPrompt(input);
  process.stderr.write(`[report1_generator] USER_PROMPT_BEGIN model=${model}\n`);
  process.stderr.write(`${userPrompt}\n`);
  process.stderr.write("[report1_generator] USER_PROMPT_END\n");

  const response: Message = await new Promise<Message>((resolve, reject) => {
    const t = setTimeout(() => {
      reject(new Error(`LLM timeout (${model})`));
    }, timeoutMs);
    client.messages
      .create({
        model,
        max_tokens: MAX_TOKENS,
        temperature: 0,
        system: REPORT1_SYSTEM_PROMPT,
        tools: [REPORT1_TOOL],
        tool_choice: { type: "tool", name: "generate_report1" },
        messages: [{ role: "user", content: userPrompt }],
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
  try {
    const parsed = parseReport1Payload(toolUseBlock.input);
    if (parsed === null) {
      throw new Error("parseReport1Payload returned null");
    }
    return parsed;
  } catch (parseErr: unknown) {
    const parseMessage =
      parseErr instanceof Error ? parseErr.message : String(parseErr);
    const rawOutput = JSON.stringify(toolUseBlock.input ?? {}, null, 2);
    const truncated =
      rawOutput.length > 3000
        ? `${rawOutput.slice(0, 3000)}...[truncated]`
        : rawOutput;
    const validation = REPORT1_PAYLOAD_SCHEMA.safeParse(toolUseBlock.input);
    process.stderr.write("[report1_generator] Tool output parse FAILED\n");
    if (!validation.success) {
      const issuesLog = buildZodIssueLogs(toolUseBlock.input, validation.error.issues);
      process.stderr.write(`[report1_generator] Zod issues: ${issuesLog}\n`);
    }
    process.stderr.write(`[report1_generator] Parse error: ${parseMessage}\n`);
    process.stderr.write(
      `[report1_generator] Raw tool output:\n${truncated}\n`,
    );
    throw new Error(`Schema mismatch: ${parseMessage}`);
  }
}

async function callLLMV3(
  model: string,
  input: GeneratorInput,
  timeoutMs: number,
): Promise<Report1PayloadV3> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey === undefined || apiKey.trim() === "") {
    throw new Error(
      "ANTHROPIC_API_KEY가 없습니다. 환경변수를 설정한 뒤 다시 시도하세요.",
    );
  }
  const client = new Anthropic({ apiKey });
  const userPrompt = buildUserPromptV3(input);
  process.stderr.write(`[report1_generator_v3] USER_PROMPT_BEGIN model=${model}\n`);
  process.stderr.write(`${userPrompt}\n`);
  process.stderr.write("[report1_generator_v3] USER_PROMPT_END\n");

  const response: Message = await new Promise<Message>((resolve, reject) => {
    const t = setTimeout(() => {
      reject(new Error(`LLM timeout (${model})`));
    }, timeoutMs);
    client.messages
      .create({
        model,
        max_tokens: MAX_TOKENS,
        temperature: 0,
        system: REPORT1_SYSTEM_PROMPT_V3,
        tools: [REPORT1_TOOL_V3],
        tool_choice: { type: "tool", name: "generate_report1_v3" },
        messages: [{ role: "user", content: userPrompt }],
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
  try {
    const parsed = parseReport1PayloadV3(toolUseBlock.input);
    if (parsed === null) {
      throw new Error("parseReport1PayloadV3 returned null");
    }
    return parsed;
  } catch (parseErr: unknown) {
    const parseMessage =
      parseErr instanceof Error ? parseErr.message : String(parseErr);
    process.stderr.write(
      `[report1_generator_v3] Parse error: ${parseMessage}\n`,
    );
    throw new Error(`Schema mismatch: ${parseMessage}`);
  }
}

// Stage 1 임시 fallback 보존용 (원복 필요 시 참고).
// function temporaryFallbackV3(): Report1PayloadV3 {
//   return {
//     block2_market_medical: "...",
//     block2_regulation: "...",
//     block2_trade: "...",
//     block2_procurement: "...",
//     block2_distribution: "...",
//     block2_reference_price: null,
//     block3_1_channel: "...",
//     block3_2_pricing: "...",
//     block3_3_partners: "...",
//     block3_4_risks: "...",
//     block3_5_entry_feasibility: "...",
//     block3_data_gaps: {
//       public_procurement_missing: false,
//       retail_missing: false,
//       note: "...",
//     },
//     block4_papers: [],
//     block4_databases: [],
//   };
// }

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
    const primaryTimeoutMs = normalizeTimeoutMs(LLM_TIMEOUT_MS, 58000);
    const retryTimeoutMs = normalizeTimeoutMs(LLM_RETRY_TIMEOUT_MS, 30000);
    try {
      process.stderr.write(`[report1_generator] Haiku ATTEMPT model=${HAIKU_MODEL}\n`);
      const startedAt = Date.now();
      const payload = await callLLM(HAIKU_MODEL, input, primaryTimeoutMs);
      await saveCache(supabase, input.productId, input.caseGrade, payload, HAIKU_MODEL);
      process.stderr.write(
        `[report1_generator] Haiku SUCCESS in ${String(Date.now() - startedAt)}ms\n`,
      );
      return { payload, source: "haiku", modelUsed: HAIKU_MODEL };
    } catch (haikuErr: unknown) {
      const m = stringifyUnknownError(haikuErr);
      const stack = haikuErr instanceof Error ? (haikuErr.stack ?? "") : "";
      const details = formatHaikuErrorDetails(haikuErr);
      process.stderr.write(`[report1_generator] Haiku FAILED: ${m}\n`);
      process.stderr.write(`[report1_generator] Haiku FAILED DETAILS: ${details}\n`);
      process.stderr.write(`[report1_generator] Stack: ${stack}\n`);
      process.stderr.write(
        `[report1_generator] KEY_EXISTS: ${String(!!process.env.ANTHROPIC_API_KEY)}, KEY_LEN: ${String(process.env.ANTHROPIC_API_KEY?.length ?? 0)}\n`,
      );
      if (canRetryHaiku(haikuErr)) {
        process.stderr.write("[report1_generator] Haiku FAILED: retryable → RETRY\n");
        try {
          const retryStartedAt = Date.now();
          const retryPayload = await callLLM(HAIKU_MODEL, input, retryTimeoutMs);
          await saveCache(
            supabase,
            input.productId,
            input.caseGrade,
            retryPayload,
            HAIKU_MODEL,
          );
          process.stderr.write(
            `[report1_generator] Haiku RETRY SUCCESS in ${String(Date.now() - retryStartedAt)}ms\n`,
          );
          return { payload: retryPayload, source: "haiku", modelUsed: HAIKU_MODEL };
        } catch (retryErr: unknown) {
          const retryMessage = stringifyUnknownError(retryErr);
          const retryDetails = formatHaikuErrorDetails(retryErr);
          process.stderr.write(
            `[report1_generator] Haiku RETRY FAILED: ${retryMessage} → fallback\n`,
          );
          process.stderr.write(
            `[report1_generator] Haiku RETRY FAILED DETAILS: ${retryDetails}\n`,
          );
        }
      } else {
        process.stderr.write(
          "[report1_generator] Haiku FAILED: non-retryable error → fallback\n",
        );
      }
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
    panamacompraStats: input.panamacompraStats,
    panamacompraV3Top: input.panamacompraV3Top,
    cabamedStats: input.cabamedStats,
    entryFeasibility: input.entryFeasibility,
    entryFeasibilityText: input.entryFeasibilityText,
  };
  if (process.env.DEBUG_REPORT1_V3 === "1") {
    process.stderr.write(
      `[report1_generator][DEBUG] fallbackInput.panamacompraV3Top: ${JSON.stringify(fallbackInput.panamacompraV3Top)}\n`,
    );
  }
  const payload = buildFallbackReport(fallbackInput);
  return {
    payload,
    source: "fallback",
    modelUsed: "rule-based-template",
  };
}

export async function generateReport1V3(input: GeneratorInput): Promise<GeneratorResultV3> {
  const maxCalls = readMaxLlmCallsPerRun();
  let llmCallsThisRun = 0;
  if (llmCallsThisRun < maxCalls) {
    llmCallsThisRun += 1;
    const primaryTimeoutMs = normalizeTimeoutMs(LLM_TIMEOUT_MS, 58000);
    const retryTimeoutMs = normalizeTimeoutMs(LLM_RETRY_TIMEOUT_MS, 30000);
    try {
      process.stderr.write(`[report1_generator_v3] Haiku ATTEMPT model=${HAIKU_MODEL}\n`);
      const payload = await callLLMV3(HAIKU_MODEL, input, primaryTimeoutMs);
      return { payload, source: "haiku", modelUsed: HAIKU_MODEL };
    } catch (haikuErr: unknown) {
      const message = stringifyUnknownError(haikuErr);
      process.stderr.write(`[report1_generator_v3] Haiku FAILED: ${message}\n`);
      if (canRetryHaiku(haikuErr)) {
        process.stderr.write("[report1_generator_v3] retryable error → RETRY\n");
        try {
          const retryPayload = await callLLMV3(HAIKU_MODEL, input, retryTimeoutMs);
          return { payload: retryPayload, source: "haiku", modelUsed: HAIKU_MODEL };
        } catch (retryErr: unknown) {
          const retryMessage = stringifyUnknownError(retryErr);
          process.stderr.write(
            `[report1_generator_v3] Haiku RETRY FAILED: ${retryMessage}\n`,
          );
        }
      }
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
    panamacompraStats: input.panamacompraStats,
    panamacompraV3Top: input.panamacompraV3Top,
    cabamedStats: input.cabamedStats,
    entryFeasibility: input.entryFeasibility,
    entryFeasibilityText: input.entryFeasibilityText,
    perplexityPapers: input.perplexityPapers,
  };
  const fallbackPayload = buildFallbackReportV3(fallbackInput);
  return {
    payload: fallbackPayload,
    source: "fallback",
    modelUsed: "rule-based-template-v3",
  };
}
