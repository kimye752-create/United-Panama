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
        minLength: 80,
        maxLength: 450,
        description: "MINSA DNFD 신규 등록 신청 단계별 절차(신청서·서류·심사기간·MAH 요건), 공공(ALPS/CSS) 및 민간(약국체인) 진입채널, 한-파나마 FTA 관세 혜택, 포뮬러리 등재 조건 포함",
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
5) 마크다운 헤더(##, **) 금지. 서브섹션 구분은 반드시 "▸ 소제목:" 형식 사용.
6) 각 블록은 독립 문단으로 완결되어야 함.

[block2_regulatory_path 작성 형식 — 반드시 아래 3개 서브섹션 "▸" 마커로 구분]
▸ MINSA/DNFD 등록 현황: 신청서 제출 → 서류 심사(GMP 증명서, CoA, SPC, 원산지 증명) → 이화학·미생물 시험 → 위원회 심의 → 등록번호(RN) 발급. 통상 12~18개월. MAH는 현지 파트너 위임 가능. WLA 인증 시 Law 419(2024.02 발효) 패스트트랙 적용.
▸ 진입 채널 권고: 공공채널(ALPS 입찰)은 MINSA 등록 후 Formulario Nacional 등재 + CSS 별도 포뮬러리 신청 필요. 민간채널은 도매상(Distribuidora) 경유 약국 체인(Arrocha, Rey, Metro) 납품.
▸ 관세 및 무역: 한-파나마 FTA(2021.3 발효) HS 3004 관세 0%, ITBMS(부가세) 의약품 면세. 파나마시티 항구(Balboa) CIF 조건 통관.

[block3_price_context 작성 형식 — 반드시 아래 형식으로 경쟁사 가격 나열]
▸ 참조 시장가: 수집된 PanamaCompra·ACODECO 가격 데이터를 "제품명: PAB XX.XX (출처)" 형식으로 2~3건 나열. 데이터 없으면 "수집 대기 중" 명시.
▸ 전략 제안: 경쟁사 대비 포지셔닝 방향 1문장 (예: "Tier 1 대비 15~20% 할인 포지셔닝으로 초기 공공 채널 진입 권고").

[block4_risk_factors 작성 형식 — 반드시 아래 3개 서브섹션 "▸" 마커로 구분]
▸ 규제 심사 소요 기간: MINSA 신규 등록 통상 12~18개월, 행정 지연 시 24개월 이상 가능.
▸ 경쟁 강도: 동일 성분 기진입 경쟁사 수·주요 업체명·가격 수준 기술.
▸ 포뮬러리 등재: CSS/MINSA 포뮬러리 등재 요건, EML 미등재 성분의 조달 입찰 제한 가능성.
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
      `▸ MINSA/DNFD 등록 현황: 신청서·GMP 증명서·CoA·SPC·원산지 증명 제출 → 이화학·미생물 시험 → 위원회 심의 → 등록번호(RN) 발급. 통상 12~18개월(WLA 인증 시 Law 419 패스트트랙 단축 가능). MAH는 현지 파트너 위임 등록 가능. ▸ 진입 채널 권고: 공공채널(ALPS) — MINSA 등록 후 Formulario Nacional 등재 + CSS 포뮬러리 별도 신청 필요. 민간채널 — 도매상(Distribuidora) 경유 약국 체인(Arrocha, Rey, Metro) 납품. ▸ 관세 및 무역: 한-파나마 FTA(2021.3 발효) HS 3004 관세 0%, ITBMS 의약품 면세. Balboa 항구 CIF 조건 통관.`.slice(0, 450),
    block3_price_context:
      `▸ 참조 시장가: PanamaCompra 수집 ${input.publicProcurementCount}건(공공 평균 ${input.pubAvg !== null ? `PAB ${input.pubAvg.toFixed(2)}` : "미집계"}), ACODECO/CABAMED 민간 ${input.privateRetailCount}건(소매 평균 ${input.privAvg !== null ? `PAB ${input.privAvg.toFixed(2)}` : "미집계"}). 판정 Case ${input.caseGrade}: ${input.caseRationale} ▸ 전략 제안: 수집 데이터 기준 Tier 2 경쟁사 대비 10~15% 할인 포지셔닝으로 공공 채널 초기 진입 권고.`.slice(0, 250),
    block4_risk_factors:
      `▸ 규제 심사 소요 기간: MINSA 신규 등록 통상 12~18개월, 행정 지연 시 24개월 이상 가능. ▸ 경쟁 강도: 동일 INN 성분 다국적 제네릭(Bayer, Sandoz, Genfar 등) 기진입 시장으로 경쟁 강도 높음. ▸ 포뮬러리 등재: CSS/MINSA 포뮬러리 등재 요건 충족 필요. EML 미등재 성분의 경우 공공 조달 입찰 자격 제한 가능성 있음.`.slice(0, 200),
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
