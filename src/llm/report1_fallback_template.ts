import type { Report1Payload } from "./report1_schema";

import {
  BLOCK3_LINE_MAX,
  splitAceclofenacPrevalenceForBlock3,
} from "../logic/report1_block3_utils";
import type { MarketPriceStats } from "../logic/market_stats";
import { findProductByInn } from "../utils/product-dictionary";

/** 폴백용 입력 인터페이스 (느슨) */
export interface FallbackInput {
  innEn: string;
  brandName: string;
  caseGrade: "A" | "B" | "C";
  caseVerdict: string;
  emlWho: boolean;
  emlPaho: boolean;
  prevalenceMetric: string;
  pahoRegionalReference: string | null;
  distributorNames: string[]; // 4개 기대
  panamacompraCount: number;
  panamacompraStats: MarketPriceStats | null;
  cabamedStats: MarketPriceStats | null;
  /** PanamaCompra V3 데이터에서 가장 빈도 높은 (fabricante, proveedor) 페어 */
  panamacompraV3Top?: {
    totalCount: number;
    proveedorWins: number;
    fabricante: string;
    proveedor: string;
    paisOrigen: string;
    entidadCompradora: string;
    fechaOrden: string;
    representativePrice: number | null;
  } | null;
}

/** 블록3 한 줄 — 줄 인덱스별 maxLength (1번 200·5번 250·그 외 100) */
function fitBlock3Line(s: string, idx: number): string {
  const maxChars = BLOCK3_LINE_MAX[idx] ?? 100;
  let t = s.trim();
  if (t.length > maxChars) {
    t = t.slice(0, maxChars);
  }
  const pad = " 수집 데이터 범위 내 수치만 인용.";
  while (t.length < 30) {
    t += pad;
  }
  if (t.length > maxChars) {
    t = t.slice(0, maxChars);
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

function toTwoLineInsight(fact: string, insight: string): string {
  return `${fact}\n※ ${insight}`;
}

/** LLM 호출 실패 시 마지막 안전망. 규칙 기반 풀 본문 생성. */
export function buildFallbackReport(input: FallbackInput): Report1Payload {
  if (process.env.DEBUG_REPORT1_V3 === "1") {
    console.log(
      "[DEBUG] input.panamacompraV3Top:",
      JSON.stringify(input.panamacompraV3Top),
    );
    console.log(
      "[DEBUG] panamacompraStats null?:",
      input.panamacompraStats === null,
    );
    console.log(
      "[DEBUG] panamacompraV3Top null?:",
      input.panamacompraV3Top === null || input.panamacompraV3Top === undefined,
    );
  }
  const productMeta = findProductByInn(input.innEn);
  const atc4 = productMeta?.atc4_code ?? "UNKNOWN";
  const distList =
    input.distributorNames.length > 0
      ? input.distributorNames.join(", ")
      : "Feduro, Celmar, Haseth, Astur";

  const { displayForLine1, latamFootnote } = splitAceclofenacPrevalenceForBlock3(
    input.innEn,
    input.prevalenceMetric,
  );

  /** 거시(인구·보건·CSS)는 1회만; prevalence는 표시용 문자열( Aceclofenac 시 scope 괄호 제거 ) */
  const baseMarket =
    "시장·의료: 인구 451만, 1인당 보건지출 $1,557.81(World Bank/WHO GHED 2023), CSS 가입률 70%";
  const reasoning1 =
    displayForLine1.trim() !== ""
      ? `${baseMarket}; 표적 역학 ${displayForLine1.trim()}`
      : baseMarket;

  const reasoningRaw: string[] = [
    reasoning1,
    `규제: 한국 위생선진국 지정(2023.6.28)으로 MINSA 등록 $500·0.5~1개월 간소화 트랙 가능.`,
    `무역: 한-중미 FTA(2021.3 발효) 관세 0% + ITBMS 의약품 면세로 FOB 대비 최종가 경쟁력 확보.`,
    input.emlWho && input.emlPaho
      ? `조달: WHO EML 2023 + PAHO Strategic Fund 이중 등재로 국제 공공조달 트랙 활용 가능.`
      : `조달: WHO EML 미등재로 국제 공공조달 트랙 제한, 민간 약국 채널 우선 진입 필요.`,
    `유통: 파트너 ${String(input.distributorNames.length)}개사 발굴(${distList}) — 3공정 AHP 엔진⑥ PSI 점수화 예정.`,
  ];

  const reasoning = reasoningRaw.map((line, idx) => fitBlock3Line(line, idx));

  const channelFact =
    input.caseGrade === "A"
      ? `우선 채널: 공공조달과 민간 병행. 1단계(0~6개월) PanamaCompra OCDS API 주간 모니터링 + MINSA 직접 제안 루트 가동, ${input.brandName} 입찰 공고 추적. 2단계(6~18개월) 발굴 파트너 ${distList} 중 public 채널 보유사 우선 접촉, MAH 위임 협의 착수. 3단계(18개월+) 공공 낙찰 실적 기반 민간 약국(Arrocha·Metro Plus) 입점 확대. 선결: MINSA 등록 완료·파트너 LOI.`
      : `우선 채널: 민간 약국 단독. 1단계(0~6개월) ${distList} 중 both 채널 보유사 우선 컨택, MAH 위임 협의. 2단계(6~18개월) Arrocha·Metro Plus 입점 추진. 3단계(18개월+) 민간 실적 누적 후 공공조달 재진입 평가. 선결: 샘플 공급·가격 리스트 확보.`;
  const channelRaw = toTwoLineInsight(
    channelFact,
    "단계별 채널 실행안과 선결 조건 정의 완료",
  );

  const panamacompraLine =
    input.panamacompraStats === null
      ? `${input.innEn} 해당 ATC4(${atc4}) 파나마 공공조달 매칭 경쟁품 데이터 없음.`
      : input.panamacompraV3Top !== null && input.panamacompraV3Top !== undefined
        ? `${input.innEn} 동일 ATC4(${atc4}) 경쟁품 ${String(
            input.panamacompraStats.count,
          )}건 낙찰 확인, 평균 ${String(
            input.panamacompraStats.avgPrice,
          )} PAB / 최고 ${String(
            input.panamacompraStats.maxPrice,
          )} PAB. ${input.panamacompraV3Top.fabricante}(${input.panamacompraV3Top.paisOrigen}) 제조, ${input.panamacompraV3Top.proveedor} 유통 ${String(
            input.panamacompraV3Top.proveedorWins,
          )}건, 발주기관 ${input.panamacompraV3Top.entidadCompradora}, 발주일 ${input.panamacompraV3Top.fechaOrden}.`
        : `${input.innEn} 동일 ATC4(${atc4}) 경쟁품 ${String(
            input.panamacompraStats.count,
          )}건 낙찰 확인, 평균 ${String(
            input.panamacompraStats.avgPrice,
          )} PAB / 최고 ${String(input.panamacompraStats.maxPrice)} PAB.`;

  const cabamedLine =
    input.cabamedStats === null
      ? `${input.innEn} 동일 ATC4(${atc4}) CABAMED 경쟁품 데이터 없음.`
      : `${input.innEn} 동일 ATC4(${atc4}) CABAMED 경쟁품 ${String(
          input.cabamedStats.count,
        )}건 등재, 소비자 평균 ${String(
          input.cabamedStats.avgPrice,
        )} PAB / 최고 ${String(input.cabamedStats.maxPrice)} PAB.`;

  const pricingInsightLine =
    input.panamacompraStats === null && input.cabamedStats === null
      ? `WHO/World Bank 거시 지표 및 ${input.innEn} 처방 패턴 학술 논거 기반 진입 분석 수행 가능`
      : input.panamacompraV3Top !== null && input.panamacompraV3Top !== undefined
        ? "PanamaCompra V3 - DGCP (Ley 419 de 2024) 출처 직접 데이터로 핵심 유통 파트너 식별 + Phase 2 역산식 적용 가능"
        : "위 가격 정보를 Phase 2 역산식 적용으로 자사 출고가 산출 가능";

  const pricingRaw = toTwoLineInsight(
    `${panamacompraLine} ${cabamedLine}`,
    pricingInsightLine,
  );

  const partnersRaw = toTwoLineInsight(
    `발굴된 4개 파트너: Agencias Feduro(both), Agencias Celmar(both), C. G. de Haseth & Cia.(public), Compañía Astur(both).`,
    "Case 판정 기반 both 채널 3개사 우선 컨택 및 3공정 AHP PSI 적용 가능",
  );

  const risksRaw = toTwoLineInsight(
    "MINSA 등록 5년 갱신 의무와 현지 제조사 가격 경쟁 리스크가 동시 존재함.",
    "등록 일정 사전 관리와 CDMO 파트너화 전략으로 리스크 완화 가능",
  );

  return {
    block3_reasoning: reasoning,
    block3_latam_scope_footnote: latamFootnote,
    block4_1_channel: fitBlock4(channelRaw, 60, 500),
    block4_2_pricing: fitBlock4(pricingRaw, 60, 500),
    block4_3_partners: fitBlock4(partnersRaw, 60, 500),
    block4_4_risks: fitBlock4(risksRaw, 60, 400),
  };
}