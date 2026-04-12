import type { Tool } from "@anthropic-ai/sdk/resources/messages/messages.js";

/** 보고서 본문 구조 — Tool Use 강제 양식 */
export interface Report1Payload {
  block3_reasoning: string[]; // 정확히 5개
  block4_1_channel: string; // 진입 채널 200~400자(스키마상 max 500)
  block4_2_pricing: string; // 가격 포지셔닝
  block4_3_partners: string; // 유통 파트너
  block4_4_risks: string; // 리스크
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === "object" && !Array.isArray(x);
}

/** Tool 출력 또는 캐시 JSON을 런타임 검증 (any 미사용) */
export function parseReport1Payload(raw: unknown): Report1Payload | null {
  if (!isRecord(raw)) {
    return null;
  }
  const br = raw.block3_reasoning;
  if (!Array.isArray(br) || br.length !== 5) {
    return null;
  }
  const reasoning: string[] = [];
  for (const line of br) {
    if (typeof line !== "string") {
      return null;
    }
    const len = line.length;
    if (len < 30 || len > 100) {
      return null;
    }
    reasoning.push(line);
  }

  const b41 = raw.block4_1_channel;
  const b42 = raw.block4_2_pricing;
  const b43 = raw.block4_3_partners;
  const b44 = raw.block4_4_risks;
  if (
    typeof b41 !== "string" ||
    typeof b42 !== "string" ||
    typeof b43 !== "string" ||
    typeof b44 !== "string"
  ) {
    return null;
  }
  if (b41.length < 200 || b41.length > 500) {
    return null;
  }
  if (b42.length < 200 || b42.length > 500) {
    return null;
  }
  if (b43.length < 200 || b43.length > 500) {
    return null;
  }
  if (b44.length < 150 || b44.length > 400) {
    return null;
  }

  return {
    block3_reasoning: reasoning,
    block4_1_channel: b41,
    block4_2_pricing: b42,
    block4_3_partners: b43,
    block4_4_risks: b44,
  };
}

/** Anthropic Tool Use 스키마 — JSON Schema로 양식 강제 */
export const REPORT1_TOOL: Tool = {
  name: "generate_report1",
  description:
    "파나마 의약품 시장 진출 분석 보고서 본문 생성. 5개 필드 모두 필수, 형식·길이 엄격 준수.",
  input_schema: {
    type: "object",
    properties: {
      block3_reasoning: {
        type: "array",
        minItems: 5,
        maxItems: 5,
        items: {
          type: "string",
          minLength: 30,
          maxLength: 100,
        },
        description:
          "두괄식 판정 근거 정확히 5줄. 각 줄은 30~100자 한 문장. 정량 수치(%, $, 날짜, 건수) 1개 이상 필수. 카테고리 순서 고정: (1)시장 수요·의료환경 (2)진입장벽·규제 (3)무역조건·가격통제 (4)공공조달 자격 (5)유통 인프라.",
      },
      block4_1_channel: {
        type: "string",
        minLength: 200,
        maxLength: 500,
        description:
          "진입 채널 권고. 4~6문장. 권고 채널 단정 + 1단계(0~6개월)/2단계(6~18개월)/3단계(18개월+) 로드맵 + 각 단계 구체 액션 + 선결 조건 명시. 추상 표현 금지.",
      },
      block4_2_pricing: {
        type: "string",
        minLength: 200,
        maxLength: 500,
        description:
          "가격 포지셔닝. 공공 낙찰가 데이터 상태 + 민간 소매가 상태 + CABAMED 가격 통제 적용 여부 + 경쟁사 포지션 + 데이터 공백 시 \"수집 중\" 명시. 추정값 절대 금지.",
      },
      block4_3_partners: {
        type: "string",
        minLength: 200,
        maxLength: 500,
        description:
          "유통 파트너 후보. 4개사 전부 언급 필수: Agencias Feduro, Agencias Celmar, C. G. de Haseth & Cia., Compañía Astur. 각 파트너의 target_market 명시 + 우선순위 근거 + 3공정 AHP 엔진⑥ 연계 언급.",
      },
      block4_4_risks: {
        type: "string",
        minLength: 150,
        maxLength: 400,
        description:
          "리스크 & 조건. 데이터 공백 / MINSA 등록 5년 갱신 / 현지 제조사 경쟁 / 선결 조건 / CDMO 전환 옵션 중 3개 이상 포함. 일반론 리스크(환율·정치) 금지.",
      },
    },
    required: [
      "block3_reasoning",
      "block4_1_channel",
      "block4_2_pricing",
      "block4_3_partners",
      "block4_4_risks",
    ],
  },
};

/** 시스템 프롬프트 — 양식·금지·강제 룰 박제 */
export const REPORT1_SYSTEM_PROMPT = `당신은 한국유나이티드제약 해외마케팅팀 시니어 컨설턴트입니다. 파나마 의약품 시장 진출 분석 보고서의 본문을 생성합니다.

# 절대 준수 사항
- 반드시 generate_report1 도구를 호출해서 출력. 자유 텍스트 응답 금지.
- 모든 정량 수치는 입력 데이터에서 직접 인용. 추정·전망·예측 표현 금지.
- 정확한 출처가 없는 수치는 사용 금지.

# 블록 3 두괄식 근거 5줄 카테고리 (순서 고정)
1. 시장 수요 & 의료환경: 인구·1인당 보건지출·CSS 가입률 + 표적 질환 prevalence 결합. 거시+미시 한 줄 압축.
2. 진입 장벽 & 규제: MINSA 등록 기간/비용. 한국 위생선진국 지정(2023.6.28) 효과 명시.
3. 무역 조건 & 가격 통제: 한-중미 FTA 관세 0% + ITBMS 면세 + CABAMED 적용 여부.
4. 공공 조달 자격: WHO EML / PAHO Strategic Fund 등재 여부. 등재되면 Case A 직행 근거.
5. 유통 인프라: 발굴된 4개 파트너 + target_market 분포(public/both 비중).

# 블록 4 본문 4섹션 강제 사항
- 4-1: 1·2·3단계 시간 구간 명시. "단계적 진입" 같은 추상어 금지. PanamaCompra OCDS API, MINSA 직접 제안 같은 구체 액션.
- 4-2: 데이터 없으면 "데이터 수집 중" 명시. 추정 가격 절대 금지.
- 4-3: Feduro·Celmar·Haseth·Astur 4개사 전부 언급 필수. 누락 시 보고서 무효.
- 4-4: 일반론 리스크(환율·정치) 금지. 우리 데이터 공백·MINSA 5년 갱신·현지 제조사 경쟁 등 구체 리스크.

# 금지 표현
- "예상된다", "전망된다", "보인다", "추정된다"
- "AI", "머신러닝", "딥러닝" (사용자 친화성 위반)
- "한국유나이티드제약" 회사명 직접 언급 (자기언급 불필요)
- 마크다운 문법 (**, ##, ---) 본문 노출

# Case별 톤
- Case A: 강한 긍정, 즉시 진입 권고. "확보됨", "가능", "최적".
- Case B: 조건부 + 보완 필요. "병행 가능", "보강 시 진입".
- Case C: 한계 명시 + 재평가 시점. "Phase 2 후 재평가".

# prevalence 데이터 부재 INN 폴백 룰
입력에 prevalence가 없으면, 해당 INN의 WHO ATC code 기반 일반 질환 카테고리 + 파나마 1인당 보건지출 + CSS 가입률로 우회 작성.`;
