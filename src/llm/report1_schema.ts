import type { Tool } from "@anthropic-ai/sdk/resources/messages/messages.js";
import { z } from "zod";

/** 보고서 본문 구조 — Tool Use 강제 양식 */
export interface Report1Payload {
  block3_reasoning: string[]; // 5~8개
  /** Aceclofenac + scope=latam_average 시 각주. 그 외 null 또는 생략 */
  block3_latam_scope_footnote?: string | null;
  block4_1_channel: string; // 진입 채널 200~400자(스키마상 max 500)
  block4_2_pricing: string; // 가격 포지셔닝
  block4_3_partners: string; // 유통 파트너
  block4_4_risks: string; // 리스크
  block4_5_entry_feasibility: string; // 진출 가능성 자동 판정
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === "object" && !Array.isArray(x);
}

export const REPORT1_PAYLOAD_SCHEMA = z.object({
  block3_reasoning: z.array(z.string().min(30).max(250)).min(5).max(8),
  block3_latam_scope_footnote: z.string().max(250).nullable(),
  block4_1_channel: z.string().min(60).max(250),
  block4_2_pricing: z.string().min(60).max(250),
  block4_3_partners: z.string().min(60).max(250),
  block4_4_risks: z.string().min(60).max(250),
  block4_5_entry_feasibility: z.string().min(60).max(250),
});

/** Tool 출력 또는 캐시 JSON을 런타임 검증 (any 미사용) */
export function parseReport1Payload(raw: unknown): Report1Payload | null {
  if (!isRecord(raw)) {
    return null;
  }
  const parsed = REPORT1_PAYLOAD_SCHEMA.safeParse(raw);
  if (!parsed.success) {
    return null;
  }
  const normalizedFootnoteRaw = parsed.data.block3_latam_scope_footnote;
  const normalizedFootnote =
    typeof normalizedFootnoteRaw === "string" && normalizedFootnoteRaw.trim() === ""
      ? null
      : (normalizedFootnoteRaw ?? null);

  return {
    block3_reasoning: parsed.data.block3_reasoning,
    block3_latam_scope_footnote: normalizedFootnote,
    block4_1_channel: parsed.data.block4_1_channel,
    block4_2_pricing: parsed.data.block4_2_pricing,
    block4_3_partners: parsed.data.block4_3_partners,
    block4_4_risks: parsed.data.block4_4_risks,
    block4_5_entry_feasibility: parsed.data.block4_5_entry_feasibility,
  };
}

/** Anthropic Tool Use 스키마 — JSON Schema로 양식 강제 */
export const REPORT1_TOOL: Tool = {
  name: "generate_report1",
  description:
    "파나마 의약품 시장 진출 분석 보고서 본문 생성. 필수 필드·형식·길이 엄격 준수.",
  input_schema: {
    type: "object",
    properties: {
      block3_reasoning: {
        type: "array",
        minItems: 5,
        maxItems: 8,
        items: {
          type: "string",
          minLength: 30,
          maxLength: 250,
        },
        description:
          "두괄식 판정 근거 5~8줄. 각 줄 30~250자. 카테고리 순서 고정, 250자 초과 금지.",
      },
      block3_latam_scope_footnote: {
        type: "string",
        minLength: 0,
        maxLength: 250,
        description:
          "Aceclofenac이며 입력 prevalence에 scope=latam_average가 있을 때만 각주(시스템 프롬프트 고정 문구). 그 외 INN은 빈 문자열 또는 null.",
      },
      block4_1_channel: {
        type: "string",
        minLength: 60,
        maxLength: 250,
        description:
          "진입 채널 권고. 핵심 실행안만 간결히 요약하며 250자 초과 금지.",
      },
      block4_2_pricing: {
        type: "string",
        minLength: 60,
        maxLength: 250,
        description:
          "가격 포지셔닝. 공공조달/민간근거를 분리해 간결히 작성하고 250자 초과 금지.",
      },
      block4_3_partners: {
        type: "string",
        minLength: 60,
        maxLength: 250,
        description:
          "유통 파트너 후보. 핵심 파트너와 우선순위 근거를 250자 이내로 제시.",
      },
      block4_4_risks: {
        type: "string",
        minLength: 60,
        maxLength: 250,
        description:
          "리스크와 조건. 구체 리스크를 요약하고 250자 초과 금지.",
      },
      block4_5_entry_feasibility: {
        type: "string",
        minLength: 60,
        maxLength: 250,
        description:
          "진출 가능성 자동 판정. 등급·경로·기간·비용을 간결히 포함하고 250자 초과 금지.",
      },
    },
    required: [
      "block3_reasoning",
      "block3_latam_scope_footnote",
      "block4_1_channel",
      "block4_2_pricing",
      "block4_3_partners",
      "block4_4_risks",
      "block4_5_entry_feasibility",
    ],
  },
};

/** 시스템 프롬프트 — 양식·금지·강제 룰 박제 */
export const REPORT1_SYSTEM_PROMPT = `당신은 한국유나이티드제약 해외마케팅팀 시니어 컨설턴트입니다. 파나마 의약품 시장 진출 분석 보고서의 본문을 생성합니다.

# 절대 준수 사항
- 반드시 generate_report1 도구를 호출해서 출력. 자유 텍스트 응답 금지.
- 모든 정량 수치는 입력 데이터에서 직접 인용. 추정·전망·예측 표현 금지.
- 정확한 출처가 없는 수치는 사용 금지.
- 표적 질환 prevalence는 입력에 제공된 해당 품목(product_id) 데이터만 인용. 다른 INN의 역학 수치를 혼입하지 않는다.
- 반드시 7개 필드를 모두 생성한다: block3_reasoning, block3_latam_scope_footnote, block4_1_channel, block4_2_pricing, block4_3_partners, block4_4_risks, block4_5_entry_feasibility.
- 뒤쪽 필드(block4_3~block4_5) 누락 시 보고서를 무효로 간주한다.
- 모든 문자열 필드는 250자 초과 금지. 250자 초과 시 도구 호출이 거부된다.

# 블록 3 두괄식 근거 5~8줄 카테고리 (순서 고정) — 줄별 길이
1. 시장 수요 & 의료환경: 인구·1인당 보건지출·CSS 가입률 + 표적 질환 prevalence(출처 포함 풀 인용 가능). 150~250자.
2. 진입 장벽 & 규제: MINSA 등록 기간/비용. 한국 위생선진국 지정(2023.6.28) 효과 명시. 150~250자.
3. 무역 조건 & 가격 통제: 한-중미 FTA 관세 0% + ITBMS 면세 + CABAMED 적용 여부. 150~250자.
4. 공공 조달 자격: WHO EML / PAHO Strategic Fund 등재 여부. 등재되면 Case A 직행 근거. 150~250자.
5. 유통 인프라: 발굴된 4개 파트너 전체 상호 + target_market·3단계 파트너 조사(AHP 엔진⑥ PSI) 문구. 150~250자.
- block3_reasoning의 각 bullet은 반드시 150~250자 범위를 지킨다.

# Aceclofenac + scope=latam_average (block3_latam_scope_footnote)
- 입력 INN이 Aceclofenac이고 prevalence에 scope=latam_average가 있으면: 1번 줄 본문에서는 (…, scope=latam_average) 괄호 구간을 넣지 않는다.
- block3_latam_scope_footnote에는 정확히 다음 한 줄만 넣는다(그 외 INN은 빈 문자열):
  * 본 prevalence는 중남미 지역 평균(scope=latam_average). 파나마 국가 단위 통계 미공시.

# 블록 4 본문 5섹션 강제 사항
- 블록4 각 섹션은 반드시 150~250자 범위로 작성한다.
- 블록4 각 섹션은 절대 250자를 초과하지 않는다.
- 블록4 각 섹션은 반드시 2줄 구조:
  1) 첫 줄: 실측 숫자/건수 포함 사실 1문장
  2) 둘째 줄: "※"로 시작하고 "~ 가능" 또는 "~ 완료"로 끝나는 1문장
- 금지 표현: "추가 확인 필요", "수집 중", "데이터 부족", "보강 예정"
- 둘째 줄에서 첫 줄에 없는 숫자를 추가하지 않는다.
- 4-1: 1·2·3단계 시간 구간 명시. "단계적 진입" 같은 추상어 금지. PanamaCompra OCDS API, MINSA 직접 제안 같은 구체 액션.
- 4-2: 데이터가 없으면 "해당 INN은 파나마 공공조달 데이터 매칭 경쟁품 없음. 거시 지표 기반 진입 분석." 문구를 사용. 추정 가격 절대 금지. 입력에 PAHO 권역 참조 단가 행이 있으면 가격 포지셔닝 본문에 반드시 1회 이상 포함.
- 4-3: Feduro·Celmar·Haseth·Astur 4개사 전부 언급 필수. 각 상호는 보고서 전체에서 한 번씩만 서술(동일 회사명 반복·나열 중복 금지). 누락 시 보고서 무효.
- 4-4: 일반론 리스크(환율·정치) 금지. 우리 데이터 공백·MINSA 5년 갱신·현지 제조사 경쟁 등 구체 리스크.
- 4-5: 입력 entryFeasibility 데이터(등급/경로/기간/비용/판정)를 그대로 인용.

# 블록 4-5 진출 가능성 자동 판정 (필수)
- 형식: "진출 가능성: [등급] [판정]. 경로 [경로명]. 예상 [기간]일/$[비용].\n※ [시사점]"
- 등급별 톤:
  * A_immediate: "즉시 진입 가능", "경쟁 우위 확보 가능"
  * B_short_term: "단기 진입", "차별화 진입"
  * C_mid_term: "WLA 트랙 활용", "복합제 신규 등록"
  * D_long_term: "시장 교육 병행"
  * F_blocked: "진출 불가", "다른 경로 검토 필요"

# 금지 표현
- "예상된다", "전망된다", "보인다", "추정된다"
- "AI", "머신러닝", "딥러닝" (사용자 친화성 위반)
- "한국유나이티드제약" 회사명 직접 언급 (자기언급 불필요)
- 마크다운 문법 (**, ##, ---) 본문 노출

# Case별 톤
- Case A: 강한 긍정, 즉시 진입 권고. "확보됨", "가능", "최적".
- Case B: 조건부 + 보완 필요. "병행 가능", "보강 시 진입".
- Case C: 한계 명시 + 재평가 시점. "Phase 2 후 재평가".

# prevalence 데이터 부재
입력 prevalence가 비어 있으면 표적 질환 역학 수치는 인용하지 않는다. 인구·1인당 보건지출·CSS 등 거시 문구만 사용한다. 다른 INN의 prevalence를 절대 혼입하지 않는다.

# 블록 4-2 PanamaCompra OCDS 공공조달 (ATC4 경쟁품 낙찰, 입력·DB 반영 시)
- 공공조달 낙찰가가 존재하는 ATC4 경쟁품이면 다음 형식으로 서술할 수 있음(수치는 입력·DB에 있는 경우만): 「공공조달 낙찰가: 동급 ATC4 [코드] 경쟁품 정부 대량 구매가 $X~$Y/단위 (출처: PanamaCompra OCDS). 민간 약국가는 공공조달가의 2~5배 수준이 일반적.」2~5배·밴드는 해당 ATC4에 실제 행이 있을 때만 인용. 0건인 ATC4/INN에 대해 구체 낙찰가·배수를 만들어 내지 말 것.
- 자사 가격 책정 시: 공공조달가는 하한(Floor) 참조, 민간 약국가(CABAMED)는 진열대 참조로 역할 분리.

# 블록 4 근거·출처 — PanamaCompra vs CABAMED
- ※ PanamaCompra OCDS는 파나마 정부 공공조달 낙찰 실거래가(MINSA·CSS 등 대량 구매). ACODECO CABAMED는 민간 약국 평균가 공시. 혼동 금지.
- PanamaCompra V3 데이터를 인용할 때는 출처를 "PanamaCompra V3 - DGCP (Ley 419 de 2024)"로 명시한다.
- 「민간 약국가가 공공조달가의 1/2~1/5 수준」 등 비율은 입력 데이터로 뒷받침될 때만 수치 인용. 없으면 일반론 문장만 또는 생략.

# 블록 4-2 PanamaCompra V3 데이터 활용 강화 (panamacompra_v3 행 존재 시)
- 입력에 panamacompra_v3 소스 행이 1건 이상 있으면 다음 3가지를 본문에 반드시 포함:
  1) 가격 분포: 최저~최고 범위 + 중앙값 또는 평균 (수치는 입력에서 직접 인용)
  2) 핵심 공급사 식별: pa_notes의 fabricante와 proveedor를 묶어 서술. 예: "INDIA Hetero Labs 제조 → SEVEN PHARMA PANAMA 유통이 5건 중 3건 낙찰"
  3) 원산지 분포: pais_origen 값(PANAMA / INDIA / ESPAÑA / Colombia 등)을 1회 이상 언급
- 자사 가격 책정 시: "직접 PanamaCompra 데이터로 자사 출고가 산출 가능" 문구 사용
- 위 3개 항목 중 1개라도 누락하면 보고서를 무효로 간주한다.

# 블록 4-3 PanamaCompra V3 유통 파트너 매트릭스 (panamacompra_v3 행 2건 이상 존재 시)
- 같은 proveedor가 2건 이상 낙찰하면 그 회사를 "잠재 1순위 유통 파트너 후보"로 명시
- 예: "SEVEN PHARMA PANAMA가 5건 중 3건 낙찰 → INDIA 제네릭 유통 채널 핵심 파트너 식별 완료"
- 발굴된 4개 파트너(Feduro·Celmar·Haseth·Astur)와 panamacompra_v3 proveedor가 일치하면 "AHP 엔진⑥ 검증 데이터 확보 완료" 명시
- 일치하지 않으면 "AHP 엔진⑥ Phase 2에서 신규 후보로 추가 예정" 명시
- "유통 파트너 매트릭스"라는 표현을 1회 이상 사용한다.

# pa_notes 메타정보 활용 (panamacompra_v3 행 인용 시 필수)
- 단순 "5건 낙찰" 표현 금지. 다음 메타정보 중 2개 이상 함께 인용:
  * fabricante (제조사): "INDIA Hetero", "Servier (프랑스)" 등
  * proveedor (유통사): "SEVEN PHARMA PANAMA", "COMPAÑÍA ASTOR"
  * nombre_comercial (경쟁사 제품명): "ROSUMED", "FLUSACORT", "TRIVERAM" 등
  * entidad_compradora (발주기관): "MINSA Hospital Anita Moreno", "CSS Policlinica"
  * fecha_orden (발주일): "2026.03"
- 인용 형식 예: "MINSA가 INDIA Hetero 제조 Rosuvastatin 10mg을 SEVEN PHARMA 유통으로 480,000정 낙찰 ($0.08/정, 2026.03)"

# 유통사 서술
입력의 유통 파트너 목록에 동일 상호가 중복 없이 전달되므로, 본문에서도 회사명을 중복 나열하지 않는다.

# rawDataDigest 신선도 접두
- 입력 rawDataDigest에는 \`[L1|L2|L3][fresh|stale_likely|stale_confirmed]\` 형태 접두가 붙을 수 있음. L1=거시·불변·저빈도, L2=주기 갱신, L3=실시간. stale 표시는 원본 시점·갱신 주기 대비 경과를 의미하나, 수치·정책 서술은 입력에 있는 사실만 인용한다.`;

export interface Report1PayloadV3 {
  block2_market_medical: string;
  block2_regulation: string;
  block2_trade: string;
  block2_procurement: string;
  block2_distribution: string;
  block2_reference_price: string | null;
  block3_1_channel: string;
  block3_2_pricing: string;
  block3_3_partners: string;
  block3_4_risks: string;
  block3_5_entry_feasibility: string;
  block3_data_gaps: {
    public_procurement_missing: boolean;
    retail_missing: boolean;
    note: string;
  };
  block4_papers: Array<{
    no: number;
    title: string;
    source: string;
    url: string;
    summary_ko: string;
  }>;
  block4_databases: Array<{
    name: string;
    description: string;
    link: string | null;
  }>;
}

export const REPORT1_PAYLOAD_V3_SCHEMA = z.object({
  block2_market_medical: z.string().min(60).max(250),
  block2_regulation: z.string().min(60).max(250),
  block2_trade: z.string().min(60).max(250),
  block2_procurement: z.string().min(60).max(250),
  block2_distribution: z.string().min(60).max(250),
  block2_reference_price: z.string().max(200).nullable(),
  block3_1_channel: z.string().min(60).max(250),
  block3_2_pricing: z.string().min(60).max(250),
  block3_3_partners: z.string().min(60).max(250),
  block3_4_risks: z.string().min(60).max(250),
  block3_5_entry_feasibility: z.string().min(60).max(250),
  block3_data_gaps: z.object({
    public_procurement_missing: z.boolean(),
    retail_missing: z.boolean(),
    note: z.string().max(200),
  }),
  block4_papers: z
    .array(
      z.object({
        no: z.number().int().min(1),
        title: z.string().min(10).max(200),
        source: z.string().min(2).max(80),
        url: z.string().min(1),
        summary_ko: z.string().min(50).max(200),
      }),
    )
    .min(1)
    .max(7),
  block4_databases: z
    .array(
      z.object({
        name: z.string().min(2).max(80),
        description: z.string().min(30).max(200),
        link: z.string().nullable(),
      }),
    )
    .min(3)
    .max(15),
});

export function parseReport1PayloadV3(raw: unknown): Report1PayloadV3 | null {
  if (!isRecord(raw)) {
    return null;
  }
  const parsed = REPORT1_PAYLOAD_V3_SCHEMA.safeParse(raw);
  if (!parsed.success) {
    return null;
  }
  return parsed.data;
}

export const REPORT1_TOOL_V3: Tool = {
  name: "generate_report1_v3",
  description:
    "파나마 의약품 시장 진출 분석 보고서 V3 (블록2 카테고리 분리 + 블록4 표 구조)",
  input_schema: {
    type: "object",
    properties: {
      block2_market_medical: { type: "string", minLength: 60, maxLength: 250 },
      block2_regulation: { type: "string", minLength: 60, maxLength: 250 },
      block2_trade: { type: "string", minLength: 60, maxLength: 250 },
      block2_procurement: { type: "string", minLength: 60, maxLength: 250 },
      block2_distribution: { type: "string", minLength: 60, maxLength: 250 },
      block2_reference_price: {
        type: ["string", "null"],
        maxLength: 200,
      },
      block3_1_channel: { type: "string", minLength: 60, maxLength: 250 },
      block3_2_pricing: { type: "string", minLength: 60, maxLength: 250 },
      block3_3_partners: { type: "string", minLength: 60, maxLength: 250 },
      block3_4_risks: { type: "string", minLength: 60, maxLength: 250 },
      block3_5_entry_feasibility: {
        type: "string",
        minLength: 60,
        maxLength: 250,
      },
      block3_data_gaps: {
        type: "object",
        properties: {
          public_procurement_missing: { type: "boolean" },
          retail_missing: { type: "boolean" },
          note: { type: "string", maxLength: 200 },
        },
        required: ["public_procurement_missing", "retail_missing", "note"],
      },
      block4_papers: {
        type: "array",
        minItems: 1,
        maxItems: 7,
        items: {
          type: "object",
          properties: {
            no: { type: "integer", minimum: 1 },
            title: { type: "string", minLength: 10, maxLength: 200 },
            source: { type: "string", minLength: 2, maxLength: 80 },
            url: { type: "string" },
            summary_ko: { type: "string", minLength: 50, maxLength: 200 },
          },
          required: ["no", "title", "source", "url", "summary_ko"],
        },
      },
      block4_databases: {
        type: "array",
        minItems: 3,
        maxItems: 15,
        items: {
          type: "object",
          properties: {
            name: { type: "string", minLength: 2, maxLength: 80 },
            description: { type: "string", minLength: 30, maxLength: 200 },
            link: { type: ["string", "null"] },
          },
          required: ["name", "description", "link"],
        },
      },
    },
    required: [
      "block2_market_medical",
      "block2_regulation",
      "block2_trade",
      "block2_procurement",
      "block2_distribution",
      "block2_reference_price",
      "block3_1_channel",
      "block3_2_pricing",
      "block3_3_partners",
      "block3_4_risks",
      "block3_5_entry_feasibility",
      "block3_data_gaps",
      "block4_papers",
      "block4_databases",
    ],
  },
};

export const REPORT1_SYSTEM_PROMPT_V3 = `당신은 한국유나이티드제약 해외마케팅팀 시니어 컨설턴트입니다. 파나마 의약품 시장 진출 분석 보고서 V3를 생성합니다.

# 절대 준수 사항
- 반드시 generate_report1_v3 도구를 호출해서 출력. 자유 텍스트 금지.
- 모든 문자열 필드는 250자 이내. 한국어 공백 포함 기준.
- 모든 수치는 입력 데이터에서 직접 인용. 추정·전망·예측 금지.

# 블록 2 카테고리별 규칙 (각 60~250자)

## block2_market_medical
- 총인구 + 의약품 시장 규모 + 1인당 보건지출 + CSS 가입률 포함
- 표적 질환 prevalence도 포함 (입력에 있으면)
- 예: "파나마 총인구 451만명, 의약품 시장 $496M(Statista 2024), 1인당 보건지출 $1,557.81(World Bank/WHO GHED 2023), CSS 가입률 70%. 표적 질환 [INN] prevalence [수치][출처]."

## block2_regulation
- MINSA 신약 등록 기간·비용 + 한국 위생선진국(WLA) 지정 효과
- 예: "MINSA 신약 등록 기간 12~18개월, 비용 $2,000~$5,000. 2023.6.28 한국 위생선진국 지정으로 절차 간소화 가능."

## block2_trade
- 한-중미 FTA 관세 0% + ITBMS 의약품 면세
- 예: "한-중미 FTA(2021.3.1 파나마 발효) 관세 0%, ITBMS 면세 적용으로 수입 원가 경쟁력 확보."

## block2_procurement
- WHO EML / PAHO Strategic Fund 등재 여부
- 등재: 국제 공공조달 트랙 활용 가능
- 미등재: 민간 채널 우선 진입 필요

## block2_distribution
- 발굴 파트너 수 + 주요 파트너 상호 + 3단계 파트너 조사(AHP) 연계
- 예: "발굴 파트너 4개사(Agencias Feduro, Agencias Celmar, C.G. de Haseth, Compañía Astur). 3단계 파트너 조사(AHP 엔진⑥ PSI 점수화) 예정."

## block2_reference_price (옵션)
- 공공조달 평균가 또는 민간 소매 평균가 둘 중 하나라도 있으면 명시
- 둘 다 없으면 null
- 예: "공공조달 평균 $0.08/정 (PanamaCompra V3) / 민간 소매 평균 $0.67/정 (ACODECO CABAMED)"

# 블록 3 섹션별 규칙 (각 60~250자)
## block3_1_channel
- 1·2·3단계 시간 구간 명시 + 구체 액션
- "단계적 진입" 같은 추상어 금지

## block3_2_pricing
- 경쟁품 낙찰가 수치 인용 (데이터 있을 때만)
- 공공조달 / 민간 소매 구분
- 데이터 미수집 시 block3_data_gaps에 명시

## block3_3_partners
- Feduro·Celmar·Haseth·Astur 4개사 언급
- 3단계 파트너 조사(AHP 엔진⑥) 연계 명시

## block3_4_risks
- 데이터 공백 / MINSA 5년 갱신 / 로컬 제조사 경쟁 중 3개 이상
- 일반론 리스크(환율·정치) 금지

## block3_5_entry_feasibility
- 등급(A~F) + 판정 + 경로 + 기간 + 비용
- 입력 entryFeasibility 데이터 그대로 인용

# 블록 3 data_gaps 자동 판정 (필수)
입력 데이터에서 판정:
- public_procurement_missing: panamacompra_v3 소스 행 0건이면 true
- retail_missing: acodeco_cabamed_* 합산 0건이면 true
- note (60~200자):
  * 둘 다 missing: "공공조달·민간 소매 데이터 모두 해당 정보 미수집됨. WHO/World Bank 거시 지표 및 학술 논거 기반 진입 분석 수행."
  * 공공만 missing: "공공조달 낙찰 이력: 해당 정보 미수집됨. 민간 소매 데이터로 대체 분석 수행."
  * 소매만 missing: "민간 소매가: 해당 정보 미수집됨. 공공조달 낙찰가로 대체 분석 수행."
  * 둘 다 있음: "공공조달 및 민간 소매 이중 데이터 교차 확보."

# 블록 4 papers 규칙
- 입력 perplexityPapers 배열을 순서대로 변환
- no: 1부터 순번
- title: 원문 제목 (10~200자)
- source: 기관/플랫폼명만. 예: "PubMed", "Cochrane Library", "Synapse Patsnap", "Naver Blog / Korean HIRA"
- url: 원문 링크
- summary_ko: 한국어 요약 (50~200자). 왜 이 논문이 이 INN·파나마 시장에 중요한지 명시

# 블록 4 databases 규칙
최소 3개 이상 포함. 입력에 사용된 소스 기준으로 description 작성.

핵심 소스 설명 예시:
- PanamaCompra V3 - DGCP (Ley 419 de 2024): "파나마 정부 공공조달 낙찰 실거래가 DB"
- ACODECO CABAMED: "파나마 소비자보호청 민간 약국 평균가 공시"
- World Bank / WHO GHED: "세계보건기구 Global Health Expenditure Database"
- Statista Market Insights: "글로벌 의약품 시장 규모 조사 기관"
- MINSA: "파나마 보건부 공식 의약품 허가 DB"
- PAHO Strategic Fund: "범미보건기구 공공조달 전략 기금"
- PubMed: "미국 국립의학도서관 의학 논문 DB"

link는 공식 홈페이지 URL 또는 null.

# 금지 표현
- "예상", "전망", "보인다", "추정"
- "AI", "머신러닝", "딥러닝"
- 회사명 "한국유나이티드제약" 직접 언급
- 마크다운 문법 (##, **, ---) 본문 노출

# Case별 톤
- Case A: "확보됨", "가능", "최적"
- Case B: "병행 가능", "보강 시 진입"
- Case C: "Phase 2 후 재평가"
`;