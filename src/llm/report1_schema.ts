import type { Tool } from "@anthropic-ai/sdk/resources/messages/messages.js";

import { BLOCK3_LINE_MAX } from "../logic/report1_block3_utils";

/** 보고서 본문 구조 — Tool Use 강제 양식 */
export interface Report1Payload {
  block3_reasoning: string[]; // 정확히 5개
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
  for (let i = 0; i < 5; i++) {
    const line = br[i];
    if (typeof line !== "string") {
      return null;
    }
    const len = line.length;
    const minLen = 30;
    const maxLen = BLOCK3_LINE_MAX[i] ?? 100;
    if (len < minLen || len > maxLen) {
      return null;
    }
    reasoning.push(line);
  }

  let block3_latam_scope_footnote: string | null = null;
  if ("block3_latam_scope_footnote" in raw) {
    const f = raw.block3_latam_scope_footnote;
    if (f === null || f === undefined) {
      block3_latam_scope_footnote = null;
    } else if (typeof f === "string") {
      const trimmed = f.trim();
      if (trimmed === "") {
        block3_latam_scope_footnote = null;
      } else if (f.length > 220) {
        return null;
      } else {
        block3_latam_scope_footnote = f;
      }
    } else {
      return null;
    }
  }

  const b41 = raw.block4_1_channel;
  const b42 = raw.block4_2_pricing;
  const b43 = raw.block4_3_partners;
  const b44 = raw.block4_4_risks;
  const b45 = raw.block4_5_entry_feasibility;
  if (
    typeof b41 !== "string" ||
    typeof b42 !== "string" ||
    typeof b43 !== "string" ||
    typeof b44 !== "string" ||
    typeof b45 !== "string"
  ) {
    return null;
  }
  if (b41.length < 60 || b41.length > 500) {
    return null;
  }
  if (b42.length < 60 || b42.length > 500) {
    return null;
  }
  if (b43.length < 60 || b43.length > 500) {
    return null;
  }
  if (b44.length < 60 || b44.length > 400) {
    return null;
  }
  if (b45.length < 60 || b45.length > 400) {
    return null;
  }

  return {
    block3_reasoning: reasoning,
    block3_latam_scope_footnote,
    block4_1_channel: b41,
    block4_2_pricing: b42,
    block4_3_partners: b43,
    block4_4_risks: b44,
    block4_5_entry_feasibility: b45,
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
        maxItems: 5,
        items: {
          type: "string",
          minLength: 30,
          maxLength: 250,
        },
        description:
          "두괄식 판정 근거 5줄. 줄별 최대 길이: 1번 200자·2~4번 100자·5번 250자. 카테고리 순서 고정.",
      },
      block3_latam_scope_footnote: {
        type: "string",
        minLength: 0,
        maxLength: 220,
        description:
          "Aceclofenac이며 입력 prevalence에 scope=latam_average가 있을 때만 각주(시스템 프롬프트 고정 문구). 그 외 INN은 빈 문자열.",
      },
      block4_1_channel: {
        type: "string",
        minLength: 60,
        maxLength: 500,
        description:
          "진입 채널 권고. 4~6문장. 권고 채널 단정 + 1단계(0~6개월)/2단계(6~18개월)/3단계(18개월+) 로드맵 + 각 단계 구체 액션 + 선결 조건 명시. 추상 표현 금지.",
      },
      block4_2_pricing: {
        type: "string",
        minLength: 60,
        maxLength: 500,
        description:
          "가격 포지셔닝(블록4-2). 시스템 프롬프트「PanamaCompra OCDS」「ACODECO CABAMED」절 준수. 공공조달 낙찰가(PanamaCompra OCDS, ATC4 경쟁품)가 입력·DB에 있으면 동급 ATC4 정부 대량 구매가 $X~$Y/단위로 인용 가능. 민간 약국가(CABAMED)와 구분. 1/2~1/5·2~5배 등 비율 서술은 입력·근거에 수치가 있을 때만. 해당 INN·ATC4 데이터 0건이면 비율·평균 낙찰가 수치 인용 금지(일반론만). 추정·합성 금지.",
      },
      block4_3_partners: {
        type: "string",
        minLength: 60,
        maxLength: 500,
        description:
          "유통 파트너 후보. 4개사 전부 언급 필수: Agencias Feduro, Agencias Celmar, C. G. de Haseth & Cia., Compañía Astur. 각 파트너의 target_market 명시 + 우선순위 근거 + 3공정 AHP 엔진⑥ 연계 언급.",
      },
      block4_4_risks: {
        type: "string",
        minLength: 60,
        maxLength: 400,
        description:
          "리스크 & 조건. 데이터 공백 / MINSA 등록 5년 갱신 / 현지 제조사 경쟁 / 선결 조건 / CDMO 전환 옵션 중 3개 이상 포함. 일반론 리스크(환율·정치) 금지.",
      },
      block4_5_entry_feasibility: {
        type: "string",
        minLength: 60,
        maxLength: 400,
        description:
          "진출 가능성 자동 판정. 등급(A~F) + 판정 + 경로 + 예상 기간/비용 + 근거 시사점. 입력 데이터에서 직접 인용. 추정 금지.",
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

# 블록 3 두괄식 근거 5줄 카테고리 (순서 고정) — 줄별 길이
1. 시장 수요 & 의료환경: 인구·1인당 보건지출·CSS 가입률 + 표적 질환 prevalence(출처 포함 풀 인용 가능). 30~200자 한 줄. 1인당 보건지출·CSS는 이 줄에서 한 번만 서술.
2. 진입 장벽 & 규제: MINSA 등록 기간/비용. 한국 위생선진국 지정(2023.6.28) 효과 명시. 30~100자.
3. 무역 조건 & 가격 통제: 한-중미 FTA 관세 0% + ITBMS 면세 + CABAMED 적용 여부. 30~100자.
4. 공공 조달 자격: WHO EML / PAHO Strategic Fund 등재 여부. 등재되면 Case A 직행 근거. 30~100자.
5. 유통 인프라: 발굴된 4개 파트너 전체 상호 + target_market·3공정 AHP 엔진⑥ PSI 문구. 30~250자.

# Aceclofenac + scope=latam_average (block3_latam_scope_footnote)
- 입력 INN이 Aceclofenac이고 prevalence에 scope=latam_average가 있으면: 1번 줄 본문에서는 (…, scope=latam_average) 괄호 구간을 넣지 않는다.
- block3_latam_scope_footnote에는 정확히 다음 한 줄만 넣는다(그 외 INN은 빈 문자열):
  * 본 prevalence는 중남미 지역 평균(scope=latam_average). 파나마 국가 단위 통계 미공시.

# 블록 4 본문 5섹션 강제 사항
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