/**
 * 시장조사 보고서 — Anthropic Haiku LLM 분석
 * SG_01_시장보고서_Sereterol.docx 양식 기준 5섹션 구조
 * DB 데이터(가격·EML·PanamaCompra·치료영역통계) 기반 실제 인사이트 생성
 */
import Anthropic from "@anthropic-ai/sdk";
import type { Tool } from "@anthropic-ai/sdk/resources/messages/messages.js";

// ─── 스키마 ─────────────────────────────────────────────────────────────────
export interface MarketAnalysisPayload {
  /** 섹션 1 본문: 거시환경 서술 단락 (시장 개요 + EML 현황) */
  block1_market_narrative: string;
  /** 섹션 1 치료영역: 유병률·흡입제·치료영역 시장 특이사항 */
  block1_therapeutic_context: string;
  /** 섹션 2: 규제/무역 환경 (▸ 3개 서브섹션 포함) */
  block2_regulatory_path: string;
  /** 섹션 3 본문: 가격 맥락 분석 */
  block3_price_narrative: string;
  /** 섹션 4: 리스크·조건 (▸ 3개 서브섹션 포함) */
  block4_risk_factors: string;
  /** 섹션 4 하단 권고: 진출 전략 핵심 행동 */
  block5_action_recommendation: string;
}

const MARKET_TOOL: Tool = {
  name: "generate_market_analysis",
  description: "파나마 시장조사 보고서를 SG_01 docx 양식에 맞춰 6블록으로 생성한다.",
  input_schema: {
    type: "object",
    properties: {
      block1_market_narrative: {
        type: "string",
        description:
          "파나마 의약품 시장 개요 서술 단락 (2~4문장). 거시환경·의료 인프라 수준·해당 제품 성분의 시장 내 위치(EML 등재 여부 포함)를 자연스럽게 서술. 수치는 입력 데이터만 사용.",
      },
      block1_therapeutic_context: {
        type: "string",
        description:
          "해당 치료영역의 파나마 현지 유병률·시장 특이사항 1~2문장. 예: '파나마 성인 천식 유병률 약 X%, ICS/LABA 복합제 처방 비중 증가 추세.' 수치가 없으면 정성적으로 서술.",
      },
      block2_regulatory_path: {
        type: "string",
        description:
          "반드시 아래 3개 ▸ 서브섹션으로 구성. 각 서브섹션은 1~3문장.\n▸ MINSA/DNFD 등록 현황: 신청 절차·서류·심사기간·MAH 요건·패스트트랙 조건 서술.\n▸ 진입 채널 권고: 공공(ALPS/CSS/포뮬러리)·민간(약국체인) 채널 구체적으로 서술.\n▸ 관세 및 무역: 한-파나마 FTA 관세율·ITBMS 면세·통관 조건 서술.",
      },
      block3_price_narrative: {
        type: "string",
        description:
          "수집된 경쟁가격 데이터 해석 및 포지셔닝 전략 서술 단락 (2~3문장). '▸ 전략 제안:' 문구로 마지막에 1문장 가격 포지셔닝 방향 제시.",
      },
      block4_risk_factors: {
        type: "string",
        description:
          "반드시 아래 3개 ▸ 서브섹션으로 구성.\n▸ 규제 심사 소요 기간: MINSA 심사 기간 및 지연 리스크.\n▸ 경쟁 강도: 동일 성분 경쟁사 현황·처방 전환 난이도.\n▸ 포뮬러리 등재: CSS/MINSA 등재 요건·미등재 시 입찰 제한.",
      },
      block5_action_recommendation: {
        type: "string",
        description:
          "단기·중기 핵심 실행 방향 2~3문장. '단기:' '중기:' 구분 사용. 구체적 채널명·기관명 포함.",
      },
    },
    required: [
      "block1_market_narrative",
      "block1_therapeutic_context",
      "block2_regulatory_path",
      "block3_price_narrative",
      "block4_risk_factors",
      "block5_action_recommendation",
    ],
  },
};

const MARKET_SYSTEM = `
당신은 한국유나이티드제약 파나마 시장 전문 컨설턴트다.
출력은 반드시 generate_market_analysis 도구로만 생성한다.

[핵심 규칙]
1. 입력 데이터에 있는 수치만 사용. 없는 숫자 임의 생성 금지.
2. 파나마 의약품 시장 고정 참조 수치:
   - 인구: 4,351,267명 (2024, World Bank)
   - 1인당 GDP: USD 19,445 (2024, IMF)
   - 의약품 시장 규모: USD 496M (2024, Statista)
   - 수입 의존도: ~90%
3. EML 등재 현황(WHO/PAHO/MINSA)은 입력 데이터 그대로 반영.
4. 가격 데이터가 없으면 "데이터 미수집" 또는 "수집 대기 중" 명시.
5. 마크다운 헤더(##, **) 금지. 서브섹션은 반드시 "▸ 소제목:" 형식.
6. 각 블록은 독립 문단으로 완결.
7. block2, block4는 반드시 ▸ 3개 서브섹션으로 구성 (지정된 형식 준수).
`.trim();

function buildMarketPrompt(input: MarketLLMInput): string {
  const emlLine = `WHO EML: ${input.emlWho ? "등재" : "미등재"}, PAHO: ${input.emlPaho ? "등재" : "미등재"}, MINSA: ${input.emlMinsa ? "등재" : "미등재"}`;

  const priceSection =
    input.publicProcurementCount > 0 || input.privateRetailCount > 0
      ? [
          `PanamaCompra 공공조달: ${input.publicProcurementCount}건 (평균 ${input.pubAvg !== null ? `PAB ${input.pubAvg.toFixed(4)}` : "—"})`,
          `ACODECO/CABAMED 민간: ${input.privateRetailCount}건 (평균 ${input.privAvg !== null ? `PAB ${input.privAvg.toFixed(2)}` : "—"})`,
        ].join("\n")
      : "가격 데이터: 현재 미수집 상태 — 수집 대기 중";

  const competitorSection =
    input.competitorProducts.length > 0
      ? input.competitorProducts
          .slice(0, 5)
          .map(
            (p) =>
              `  - ${p.pa_product_name_local ?? p.pa_ingredient_inn}: PAB ${p.pa_price_local ?? "?"} (${p.pa_source}, ${p.market_segment})`,
          )
          .join("\n")
      : "  경쟁사 개별 제품 가격: 데이터 미수집";

  const therSection = input.therapeuticStats
    ? [
        input.therapeuticStats["prevalence_pct"] !== null
          ? `유병률: ${String(input.therapeuticStats["prevalence_pct"])}%`
          : null,
        input.therapeuticStats["market_size_usd"] !== null
          ? `치료영역 시장: USD ${String(input.therapeuticStats["market_size_usd"])}M`
          : null,
        input.therapeuticStats["summary_ko"]
          ? String(input.therapeuticStats["summary_ko"])
          : null,
      ]
        .filter(Boolean)
        .join(" | ")
    : "치료영역 통계: 별도 수집 필요";

  return `
[제품 정보]
- 제품명: ${input.productName} (${input.inn})
- 치료 영역: ${input.therapeuticArea}
- ATC 코드: ${input.atc4Code}

[EML 등재 현황]
${emlLine}

[가격 데이터]
${priceSection}

[경쟁사 제품]
${competitorSection}

[치료영역 통계]
${therSection}

[조달 현황]
- PanamaCompra 입찰 건수: ${input.publicProcurementCount}건
- 민간 소매가 표본 수: ${input.privateRetailCount}건
- 판정: Case ${input.caseGrade} — ${input.caseRationale}

위 데이터를 기반으로 파나마 시장 분석 보고서를 생성하라.
`.trim();
}

// ─── 입력 타입 ───────────────────────────────────────────────────────────────
export interface CompetitorProductRow {
  pa_source: string | null;
  pa_product_name_local: string | null;
  pa_ingredient_inn: string | null;
  pa_price_local: number | null;
  pa_currency_unit: string | null;
  pa_package_unit: string | null;
  pa_price_type: string | null;
  market_segment: string | null;
}

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
  competitorProducts: CompetitorProductRow[];
  therapeuticStats: Record<string, unknown> | null;
}

// ─── 페이로드 파싱 ───────────────────────────────────────────────────────────
function parseMarketPayload(raw: unknown): MarketAnalysisPayload | null {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const fields = [
    "block1_market_narrative",
    "block1_therapeutic_context",
    "block2_regulatory_path",
    "block3_price_narrative",
    "block4_risk_factors",
    "block5_action_recommendation",
  ] as const;
  for (const f of fields) {
    if (typeof r[f] !== "string" || (r[f] as string).length < 20) return null;
  }
  return {
    block1_market_narrative:     r["block1_market_narrative"] as string,
    block1_therapeutic_context:  r["block1_therapeutic_context"] as string,
    block2_regulatory_path:      r["block2_regulatory_path"] as string,
    block3_price_narrative:      r["block3_price_narrative"] as string,
    block4_risk_factors:         r["block4_risk_factors"] as string,
    block5_action_recommendation: r["block5_action_recommendation"] as string,
  };
}

// ─── 폴백 ───────────────────────────────────────────────────────────────────
function buildFallback(input: MarketLLMInput): MarketAnalysisPayload {
  const emlStatus = `WHO ${input.emlWho ? "등재" : "미등재"}, PAHO ${input.emlPaho ? "등재" : "미등재"}, MINSA ${input.emlMinsa ? "등재" : "미등재"}`;
  return {
    block1_market_narrative:
      `파나마는 인구 약 435만 명(World Bank 2024), 1인당 GDP USD 19,445로 중미 최고 소득 국가다. 의약품 시장 규모는 USD 496M(Statista 2024), 수입 의존도 약 90%로 한국산 수입의약품 진출에 유리한 환경이다. ${input.productName}(${input.inn})의 EML 등재 현황: ${emlStatus}.`,
    block1_therapeutic_context:
      `${input.therapeuticArea} 치료 영역은 파나마 내 만성질환 관리 수요 증가와 함께 지속적인 성장세를 보이고 있다. 의약품 수입 의존도가 높아 한국산 고품질 개량신약에 대한 수요가 기대된다.`,
    block2_regulatory_path:
      `▸ MINSA/DNFD 등록 현황: 신청서·GMP 증명서·CoA·SPC·원산지 증명 제출 → 이화학·미생물 시험 → 위원회 심의 → 등록번호(RN) 발급. 통상 12~18개월(WLA 인증 시 Law 419 패스트트랙 단축 가능). MAH는 현지 파트너 위임 등록 가능.\n▸ 진입 채널 권고: 공공채널(ALPS) — MINSA 등록 후 Formulario Nacional 등재 + CSS 포뮬러리 별도 신청 필요. 민간채널 — 도매상(Distribuidora) 경유 약국 체인(Arrocha, Rey, Metro) 납품.\n▸ 관세 및 무역: 한-파나마 FTA(2021.3 발효) HS 3004 관세 0%, ITBMS 의약품 면세. Balboa 항구 CIF 조건 통관.`,
    block3_price_narrative:
      `파나마 현지 ${input.therapeuticArea} 제품 공공조달 평균가는 ${input.pubAvg !== null ? `PAB ${input.pubAvg.toFixed(4)}` : "수집 대기 중"}(PanamaCompra ${input.publicProcurementCount}건), 민간 소매가는 ${input.privAvg !== null ? `PAB ${input.privAvg.toFixed(2)}` : "수집 대기 중"}(ACODECO/CABAMED ${input.privateRetailCount}건) 수준이다. 판정 Case ${input.caseGrade}: ${input.caseRationale}\n▸ 전략 제안: Tier 2 경쟁사 대비 10~15% 할인 포지셔닝으로 공공 채널 초기 진입 권고.`,
    block4_risk_factors:
      `▸ 규제 심사 소요 기간: MINSA 신규 등록 통상 12~18개월, 행정 지연 시 24개월 이상 가능. 사전 자문(Pre-submission) 통해 서류 보완 최소화 권장.\n▸ 경쟁 강도: 동일 INN 성분 다국적 제네릭(Bayer, Sandoz, Genfar 등) 기진입 시장으로 경쟁 강도 높음. 처방 기반 시장 내 신규 진입자의 처방 전환이 핵심 과제.\n▸ 포뮬러리 등재: CSS/MINSA 포뮬러리 등재 요건 충족 필요. EML 미등재 성분의 경우 공공 조달 입찰 자격 제한 가능성 있음.`,
    block5_action_recommendation:
      `단기: ALPS 공공 입찰 전 MINSA 등록 + Formulario Nacional 등재 신청 병행. 중기: 약국 체인 파트너(Arrocha, Rey, Metro)와 민간 유통 계약 체결. Case ${input.caseGrade} 판정 기준으로 가격 경쟁력 확보 전략 수립.`,
  };
}

// ─── 메인 export ─────────────────────────────────────────────────────────────
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
    const client = new Anthropic({ apiKey: apiKey.trim() });
    const response = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001",
      max_tokens: 2400,
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
