/**
 * 시장조사 보고서 — Anthropic Haiku LLM 분석 (5블록)
 * DB 데이터(가격·EML·PanamaCompra) 기반으로 실제 인사이트 생성
 */
import Anthropic from "@anthropic-ai/sdk";
import type { Tool } from "@anthropic-ai/sdk/resources/messages/messages.js";

// ─── 스키마 ───────────────────────────────────────────────────
export interface MarketAnalysisPayload {
  block1_macro_overview: string;       // 파나마 거시환경 + EML 현황 요약 (50-200자)
  block2_regulatory_path: string;      // MINSA 등록 + 진입채널 (50-250자)
  block3_price_context: string;        // 수집 가격 데이터 해석 + 경쟁 현황 (50-250자)
  block4_risk_factors: string;         // 규제/경쟁/조달 리스크 (50-200자)
  block5_action_recommendation: string; // 진출 전략 권고 (50-200자)
}

const MARKET_TOOL: Tool = {
  name: "generate_market_analysis",
  description: "파나마 시장조사 보고서 5블록을 생성한다.",
  input_schema: {
    type: "object",
    properties: {
      block1_macro_overview: {
        type: "string",
        minLength: 50,
        maxLength: 200,
        description: "파나마 거시환경(인구·GDP·시장규모) + EML 등재 현황 요약",
      },
      block2_regulatory_path: {
        type: "string",
        minLength: 50,
        maxLength: 250,
        description: "MINSA DNFD 등록 절차, 공공·민간 진입채널, 한-파나마 FTA 관세",
      },
      block3_price_context: {
        type: "string",
        minLength: 50,
        maxLength: 250,
        description: "수집된 PanamaCompra·ACODECO 가격 데이터 해석 및 경쟁사 포지셔닝",
      },
      block4_risk_factors: {
        type: "string",
        minLength: 50,
        maxLength: 200,
        description: "MINSA 심사 지연, 경쟁 강도, 포뮬러리 등재 요건 등 주요 리스크",
      },
      block5_action_recommendation: {
        type: "string",
        minLength: 50,
        maxLength: 200,
        description: "우선 진입 채널, 권고 전략, 단기/중기 실행 방향 제시",
      },
    },
    required: [
      "block1_macro_overview",
      "block2_regulatory_path",
      "block3_price_context",
      "block4_risk_factors",
      "block5_action_recommendation",
    ],
  },
};

const MARKET_SYSTEM = `
당신은 한국유나이티드제약 파나마 시장 전문 컨설턴트다.
출력은 반드시 generate_market_analysis 도구로만 생성한다.

[핵심 규칙]
1) 입력 데이터에 있는 수치만 사용. 없는 숫자 임의 생성 금지.
2) 파나마 의약품 시장 고정 수치 (참조용):
   - 인구: 4,351,267명 (2024, World Bank)
   - 1인당 GDP: USD 19,445 (2024, IMF)
   - 의약품 시장 규모: USD 496M (2024, Statista)
   - 수입 의존도: ~90%
3) EML 등재 현황(WHO/PAHO/MINSA)은 입력 데이터 그대로 반영.
4) 가격 데이터가 없으면 "데이터 미수집" 또는 "수집 대기 중"으로 명시.
5) 마크다운 헤더(##, **) 금지. 순수 텍스트만 출력.
6) 각 블록은 독립 문단으로 완결되어야 함.
`.trim();

function buildMarketPrompt(input: MarketLLMInput): string {
  const emlLine = `WHO EML: ${input.emlWho ? "등재" : "미등재"}, PAHO: ${input.emlPaho ? "등재" : "미등재"}, MINSA: ${input.emlMinsa ? "등재" : "미등재"}`;
  const priceSection =
    input.publicProcurementCount > 0 || input.privateRetailCount > 0
      ? `PanamaCompra 가격 수집: ${input.publicProcurementCount}건 (평균 ${input.pubAvg !== null ? `PAB ${input.pubAvg.toFixed(2)}` : "—"}), ACODECO/CABAMED: ${input.privateRetailCount}건 (평균 ${input.privAvg !== null ? `PAB ${input.privAvg.toFixed(2)}` : "—"})`
      : "가격 데이터: 현재 미수집 상태";

  return `
[제품 정보]
- 제품명: ${input.productName} (${input.inn})
- 치료 영역: ${input.therapeuticArea}
- ATC 코드: ${input.atc4Code}

[EML 등재 현황]
${emlLine}

[가격 데이터 현황]
${priceSection}

[조달 현황]
- PanamaCompra 입찰 건수: ${input.publicProcurementCount}건
- 민간 소매가 표본 수: ${input.privateRetailCount}건
- 판정: Case ${input.caseGrade} — ${input.caseRationale}

위 데이터를 기반으로 파나마 시장 분석 5블록 보고서를 생성하라.
`.trim();
}

// ─── 입력 타입 ────────────────────────────────────────────────
export interface MarketLLMInput {
  productName: string;
  inn: string;
  therapeuticArea: string;
  atc4Code: string;
  emlWho: boolean;
  emlPaho: boolean;
  emlMinsa: boolean;
  publicProcurementCount: number;
  privateRetailCount: number;
  pubAvg: number | null;
  privAvg: number | null;
  caseGrade: string;
  caseRationale: string;
}

// ─── 페이로드 파싱 ────────────────────────────────────────────
function parseMarketPayload(raw: unknown): MarketAnalysisPayload | null {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const b1 = r["block1_macro_overview"];
  const b2 = r["block2_regulatory_path"];
  const b3 = r["block3_price_context"];
  const b4 = r["block4_risk_factors"];
  const b5 = r["block5_action_recommendation"];
  if (
    typeof b1 !== "string" || b1.length < 30 ||
    typeof b2 !== "string" || b2.length < 30 ||
    typeof b3 !== "string" || b3.length < 30 ||
    typeof b4 !== "string" || b4.length < 30 ||
    typeof b5 !== "string" || b5.length < 30
  ) return null;
  return {
    block1_macro_overview: b1,
    block2_regulatory_path: b2,
    block3_price_context: b3,
    block4_risk_factors: b4,
    block5_action_recommendation: b5,
  };
}

// ─── 폴백 ──────────────────────────────────────────────────────
function buildFallback(input: MarketLLMInput): MarketAnalysisPayload {
  const emlStatus = `WHO ${input.emlWho ? "등재" : "미등재"}, PAHO ${input.emlPaho ? "등재" : "미등재"}, MINSA ${input.emlMinsa ? "등재" : "미등재"}`;
  return {
    block1_macro_overview:
      `파나마는 인구 약 435만 명(World Bank 2024), 1인당 GDP USD 19,445로 중미 최고 소득 국가다. 의약품 시장 규모는 USD 496M(Statista 2024), 수입 의존도 약 90%. ${input.productName}(${input.inn})의 EML 등재 현황: ${emlStatus}.`.slice(0, 200),
    block2_regulatory_path:
      `MINSA DNFD 사전 등록 필요(통상 12~18개월). 기등록 INN 성분의 경우 서류 간소화 가능. 한-파나마 FTA(2021.3 발효)로 HS 3004 관세 0%, ITBMS 의약품 면세 적용. 공공채널: ALPS 조달시스템 + MAH 등록 필수. 민간채널: 약국 체인(Arrocha, Rey 등) + 전문 도매상.`.slice(0, 250),
    block3_price_context:
      `PanamaCompra 수집 ${input.publicProcurementCount}건(평균 ${input.pubAvg !== null ? `PAB ${input.pubAvg.toFixed(2)}` : "미집계"}), ACODECO/CABAMED 민간 소매 ${input.privateRetailCount}건(평균 ${input.privAvg !== null ? `PAB ${input.privAvg.toFixed(2)}` : "미집계"}). 판정 Case ${input.caseGrade}: ${input.caseRationale} 수집 데이터를 기준 참조가로 활용한다.`.slice(0, 250),
    block4_risk_factors:
      `MINSA 신규 등록 심사 12~18개월 소요, 행정 지연 시 24개월 이상 가능. 다국적 제네릭(Bayer, Sandoz 등) 기진입 시장으로 경쟁 강도 높음. CSS/MINSA 포뮬러리 등재 요건 충족 필요. EML 미등재 성분의 경우 조달 입찰 자격 제한 가능성 있음.`.slice(0, 200),
    block5_action_recommendation:
      `단기: ALPS 공공 입찰 전 MINSA 등록 + 포뮬러리 등재 신청 병행. 중기: 약국 체인 파트너(PSI 기준 상위 3개사)와 민간 유통 계약 체결. 권고 진입 채널: 공공(ALPS) 우선, 민간 병행. Case ${input.caseGrade} 판정 기준으로 가격 경쟁력 확보 전략 수립.`.slice(0, 200),
  };
}

// ─── 메인 export ──────────────────────────────────────────────
export interface MarketLLMResult {
  payload: MarketAnalysisPayload;
  source: "haiku" | "fallback";
}

export async function generateMarketAnalysisLLM(
  input: MarketLLMInput,
): Promise<MarketLLMResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey?.trim()) {
    return { payload: buildFallback(input), source: "fallback" };
  }

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1600,
      temperature: 0,
      system: MARKET_SYSTEM,
      tools: [MARKET_TOOL],
      tool_choice: { type: "tool", name: "generate_market_analysis" },
      messages: [{ role: "user", content: buildMarketPrompt(input) }],
    });

    const toolBlock = response.content.find((b) => b.type === "tool_use");
    if (toolBlock === undefined || toolBlock.type !== "tool_use") {
      throw new Error("tool_use 블록 없음");
    }
    const parsed = parseMarketPayload(toolBlock.input);
    if (parsed === null) throw new Error("스키마 검증 실패");

    return { payload: parsed, source: "haiku" };
  } catch (e: unknown) {
    process.stderr.write(
      `[market_llm] Haiku 실패: ${e instanceof Error ? e.message : String(e)}\n`,
    );
    return { payload: buildFallback(input), source: "fallback" };
  }
}
