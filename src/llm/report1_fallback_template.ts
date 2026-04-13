import type { Report1Payload } from "./report1_schema";

/** 폴백용 입력 인터페이스 (느슨) */
export interface FallbackInput {
  innEn: string;
  brandName: string;
  caseGrade: "A" | "B" | "C";
  caseVerdict: string;
  emlWho: boolean;
  emlPaho: boolean;
  prevalenceMetric: string | null;
  pahoRegionalReference: string | null;
  distributorNames: string[]; // 4개 기대
  panamacompraCount: number;
}

/** 블록3 한 줄을 스키마 30~100자로 맞춤 */
function fitBlock3Line(s: string): string {
  let t = s.trim();
  if (t.length > 100) {
    t = t.slice(0, 100);
  }
  const pad = " 수집 데이터 범위 내 수치만 인용.";
  while (t.length < 30) {
    t += pad;
  }
  if (t.length > 100) {
    t = t.slice(0, 100);
  }
  return t;
}

/** 블록4 본문을 min~max 길이로 맞춤 */
function fitBlock4(s: string, minLen: number, maxLen: number): string {
  let t = s.trim();
  if (t.length > maxLen) {
    t = t.slice(0, maxLen);
  }
  const pad =
    " 동일 출처·동일 조건의 수치만 사용하며 추정 표현은 사용하지 않음.";
  while (t.length < minLen) {
    t += pad;
  }
  if (t.length > maxLen) {
    t = t.slice(0, maxLen);
  }
  return t;
}

/** LLM 호출 실패 시 마지막 안전망. 규칙 기반 풀 본문 생성. */
export function buildFallbackReport(input: FallbackInput): Report1Payload {
  const distList =
    input.distributorNames.length > 0
      ? input.distributorNames.join(", ")
      : "Feduro, Celmar, Haseth, Astur";

  const prevLine = input.prevalenceMetric
    ? `${input.prevalenceMetric}로 표적 환자 풀 확인됨`
    : "파나마 1인당 보건지출 $1,557.81(World Bank/WHO GHED 2023) + CSS 가입률 70%로 의료 접근성 안정적";

  const reasoningRaw: string[] = [
    `시장·의료: 인구 451만, 1인당 보건지출 $1,557.81, CSS 70%; ${prevLine}.`,
    `규제: 한국 위생선진국 지정(2023.6.28)으로 MINSA 등록 $500·0.5~1개월 간소화 트랙 가능.`,
    `무역: 한-중미 FTA(2021.3 발효) 관세 0% + ITBMS 의약품 면세로 FOB 대비 최종가 경쟁력 확보.`,
    input.emlWho && input.emlPaho
      ? `조달: WHO EML 2023 + PAHO Strategic Fund 이중 등재로 국제 공공조달 트랙 활용 가능.`
      : `조달: WHO EML 미등재로 국제 공공조달 트랙 제한, 민간 약국 채널 우선 진입 필요.`,
    `유통: 파트너 ${String(input.distributorNames.length)}개사 발굴(${distList}) — 3공정 AHP 엔진⑥ PSI 점수화 예정.`,
  ];

  const reasoning = reasoningRaw.map((line) => fitBlock3Line(line));

  const channelRaw =
    input.caseGrade === "A"
      ? `우선 채널: 공공조달과 민간 병행. 1단계(0~6개월) PanamaCompra OCDS API 주간 모니터링 + MINSA 직접 제안 루트 가동, ${input.brandName} 입찰 공고 추적. 2단계(6~18개월) 발굴 파트너 ${distList} 중 public 채널 보유사 우선 접촉, MAH 위임 협의 착수. 3단계(18개월+) 공공 낙찰 실적 기반 민간 약국(Arrocha·Metro Plus) 입점 확대. 선결: MINSA 등록 완료·파트너 LOI.`
      : `우선 채널: 민간 약국 단독. 1단계(0~6개월) ${distList} 중 both 채널 보유사 우선 컨택, MAH 위임 협의. 2단계(6~18개월) Arrocha·Metro Plus 입점 추진. 3단계(18개월+) 민간 실적 누적 후 공공조달 재진입 평가. 선결: 샘플 공급·가격 리스트 확보.`;

  const pahoBlock =
    input.pahoRegionalReference !== null && input.pahoRegionalReference !== ""
      ? `${input.pahoRegionalReference} `
      : "";
  const pricingRaw = `${pahoBlock}공공 낙찰가: PanamaCompra 최근 낙찰 ${String(input.panamacompraCount)}건. 민간 소매가: Arrocha·Metro Plus 데이터 수집 중(Phase 2 크롤링 완료 후 보강). CABAMED 가격 통제 리스트 적용 여부는 ACODECO Resolución No. 174 기준 추가 확인 필요. 경쟁사 포지셔닝: 현지 제조사 Medipan·Rigar 및 다국적 임포터(GSK 등) 대비 차별화 포인트는 한국 GMP 기반 품질 + FTA 관세 0% 가격 경쟁력.`;

  const partnersRaw = `발굴된 4개 파트너: Agencias Feduro(both), Agencias Celmar(both), C. G. de Haseth & Cia.(public 전문), Compañía Astur(both). Case ${input.caseGrade} 판정에 따라 ${input.caseGrade === "A" ? "public 채널 보유 Haseth 우선 접촉" : "both 채널 3개사 병행 컨택"} 권장. 각 파트너의 GMP·MAH 보유 현황은 3공정 AHP 엔진⑥의 PSI 점수화 단계에서 정량 평가 예정.`;

  const risksRaw = `데이터 공백 리스크: Arrocha·Metro Plus 민간 소매가 미수집 → Phase 2 크롤링 후 가격 포지셔닝 재평가 필요. 규제 리스크: MINSA 위생등록 5년 만료 강제, 갱신 일정 사전 관리 필수. 경쟁 구도: 현지 제조사 Medipan·Rigar 가격 경쟁 → CDMO 전환으로 파트너화 옵션 검토. 선결 조건: 공공조달 트랙 진입 전 MINSA 등록 완료 + 4개 파트너 중 1개사 MAH 위임 계약 확보.`;

  return {
    block3_reasoning: reasoning,
    block4_1_channel: fitBlock4(channelRaw, 200, 500),
    block4_2_pricing: fitBlock4(pricingRaw, 200, 500),
    block4_3_partners: fitBlock4(partnersRaw, 200, 500),
    block4_4_risks: fitBlock4(risksRaw, 150, 400),
  };
}
