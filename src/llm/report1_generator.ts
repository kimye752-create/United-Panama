/**
 * W5: Report1 LLM 생성 — 캐시 → Opus 4.6 → Sonnet 4.6 → 규칙 폴백 (호출 한도 준수)
 */
import Anthropic from "@anthropic-ai/sdk";
import type { Message } from "@anthropic-ai/sdk/resources/messages/messages.js";
import type { SupabaseClient } from "@supabase/supabase-js";

import { buildFallbackReport, type FallbackInput } from "./report1_fallback_template";
import type { MarketPriceStats } from "../logic/market_stats";
import { getSupabaseClient } from "../utils/db_connector";
import { findProductById } from "../utils/product-dictionary";
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
  /** 비어 있으면 역학 인용 생략(폴백·프롬프트에서 다른 INN·거시 행으로 채우지 않음) */
  prevalenceMetric: string;
  /** PAHO 권역 참조 단가 등 — 없으면 null */
  pahoRegionalReference: string | null;
  distributorNames: string[];
  panamacompraCount: number;
  panamacompraStats: MarketPriceStats | null;
  cabamedStats: MarketPriceStats | null;
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
- 공공 낙찰가(panamacompra_atc4_competitor): ${statLine(
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

[입력 데이터]
- 제품: ${input.brandName} (${input.innEn})
- Case 판정: ${input.caseGrade} (${input.caseVerdict})
- WHO EML 등재: ${input.emlWho ? "Y" : "N"}
- PAHO Strategic Fund 등재: ${input.emlPaho ? "Y" : "N"}
- 표적 질환 prevalence: ${input.prevalenceMetric.trim() !== "" ? input.prevalenceMetric : "없음(해당 product_id DB 행 없음, 인용 생략)"}
- PAHO 권역 참조 단가(별도 시드): ${pahoLine}
- 발굴 유통 파트너(회사명 중복 없음): ${input.distributorNames.join(", ")}
- PanamaCompra 최근 낙찰 건수: ${String(input.panamacompraCount)}

[실거래 통계 - 이 숫자를 우선 인용]
- ${statLine("공공 낙찰가(panamacompra_atc4_competitor)", input.panamacompraStats)}
- ${statLine("민간 CABAMED(acodeco_cabamed_competitor)", input.cabamedStats)}
${pricingFallbackGuidance !== "" ? `- 대체 문구: ${pricingFallbackGuidance}` : ""}

[섹션 3 형식 강제]
${INSIGHT_FORMAT_RULES}

[블록3 줄별 길이 — 도구 스키마와 동일]
- 1번 시장·의료: 30~200자 (prevalence·출처 풀 인용 가능)
- 2~4번: 각 30~100자
- 5번 유통: 30~250자 (4개 파트너 전체명 + AHP·PSI 문구)
${aceclofenacFootnoteRule}

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
  const userPrompt = buildUserPrompt(input);
  console.log(`[report1_generator] USER_PROMPT_BEGIN model=${model}`);
  console.log(userPrompt);
  console.log("[report1_generator] USER_PROMPT_END");

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
    panamacompraStats: input.panamacompraStats,
    cabamedStats: input.cabamedStats,
  };
  const payload = buildFallbackReport(fallbackInput);
  return {
    payload,
    source: "fallback",
    modelUsed: "rule-based-template",
  };
}
