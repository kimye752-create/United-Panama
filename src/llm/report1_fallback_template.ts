import type { Report1Payload, Report1PayloadV3 } from "./report1_schema";

import {
  BLOCK3_LINE_MAX,
  splitAceclofenacPrevalenceForBlock3,
} from "../logic/report1_block3_utils";
import type { MarketPriceStats } from "../logic/market_stats";
import type { PerplexityPaper } from "../logic/perplexity_insights";
import { findProductByInn } from "../utils/product-dictionary";
import type { EntryFeasibility } from "./logic/panama_entry_feasibility";

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
    count: number;
    proveedorWins: number;
    fabricante: string;
    proveedor: string;
    paisOrigen: string;
    nombreComercial?: string;
    entidadCompradora: string;
    fechaOrden: string;
    representativePrice: number | null;
  } | null;
  entryFeasibility: EntryFeasibility;
  entryFeasibilityText: string;
  perplexityPapers?: PerplexityPaper[];
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
    "시장·의료: 인구 451만, 의약품 시장규모 $0.50B(US$496.00m, Statista 2024), 1인당 보건지출 $1,557.81(World Bank/WHO GHED 2023), CSS 가입률 70%";
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
    `유통: 파트너 ${String(input.distributorNames.length)}개사 발굴(${distList}) — 3단계 파트너 조사(AHP 엔진⑥ PSI 점수화) 예정.`,
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
          )} PAB. ${input.panamacompraV3Top.fabricante}(${input.panamacompraV3Top.paisOrigen}) 제조 '${input.panamacompraV3Top.nombreComercial ?? "?"}' ${String(
            input.panamacompraV3Top.count,
          )}건 → ${input.panamacompraV3Top.proveedor} 유통.`
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
    "Case 판정 기반 both 채널 3개사 우선 컨택 및 3단계 파트너 조사(AHP·PSI) 적용 가능",
  );

  const risksRaw = toTwoLineInsight(
    "MINSA 등록 5년 갱신 의무와 현지 제조사 가격 경쟁 리스크가 동시 존재함.",
    "등록 일정 사전 관리와 CDMO 파트너화 전략으로 리스크 완화 가능",
  );
  const entryFeasibilityRaw = toTwoLineInsight(
    input.entryFeasibilityText,
    "한국유나이티드제약 WLA 트랙 활용으로 일반 제네릭 대비 시장 선점 가능",
  );

  return {
    block3_reasoning: reasoning,
    block3_latam_scope_footnote: latamFootnote,
    block4_1_channel: fitBlock4(channelRaw, 60, 250),
    block4_2_pricing: fitBlock4(pricingRaw, 60, 250),
    block4_3_partners: fitBlock4(partnersRaw, 60, 250),
    block4_4_risks: fitBlock4(risksRaw, 60, 250),
    block4_5_entry_feasibility: fitBlock4(entryFeasibilityRaw, 60, 250),
  };
}

function fitV3(text: string, minLen: number, maxLen: number): string {
  let out = text.trim();
  if (out.length > maxLen) {
    out = out.slice(0, maxLen);
  }
  const pad = " 데이터 수집 범위 내 팩트만 인용.";
  while (out.length < minLen) {
    out += pad;
    if (out.length > maxLen) {
      out = out.slice(0, maxLen);
      break;
    }
  }
  return out;
}

function detectDataGapsV3(input: FallbackInput): Report1PayloadV3["block3_data_gaps"] {
  const publicMissing = input.panamacompraStats === null;
  const retailMissing = input.cabamedStats === null;
  let note = "";
  if (publicMissing && retailMissing) {
    note =
      "공공조달 낙찰 이력 및 민간 소매가 모두 해당 정보 미수집됨. WHO/World Bank 거시 지표 및 학술 논거 기반 진입 분석 수행.";
  } else if (publicMissing) {
    note = "공공조달 낙찰 이력: 해당 정보 미수집됨. 민간 소매 데이터로 대체 분석 수행.";
  } else if (retailMissing) {
    note = "민간 소매가: 해당 정보 미수집됨. 공공조달 낙찰가로 대체 분석 수행.";
  } else {
    note = "공공조달 및 민간 소매 이중 데이터 교차 확보.";
  }

  return {
    public_procurement_missing: publicMissing,
    retail_missing: retailMissing,
    note: fitV3(note, 0, 200),
  };
}

function buildV3PaperRows(input: FallbackInput): Report1PayloadV3["block4_papers"] {
  const fromPerplexity = (input.perplexityPapers ?? [])
    .slice(0, 7)
    .map((paper, index) => ({
      no: index + 1,
      title: fitV3(paper.title, 10, 200),
      source: fitV3(paper.source, 2, 80),
      url: paper.url.trim() !== "" ? paper.url.trim() : "https://pubmed.ncbi.nlm.nih.gov/",
      summary_ko: fitV3(
        paper.summary,
        50,
        200,
      ),
    }));
  if (fromPerplexity.length > 0) {
    return fromPerplexity;
  }
  return [
    {
      no: 1,
      title: fitV3(`${input.innEn} 파나마·중남미 권역 임상 근거`, 10, 200),
      source: "PubMed",
      url: "https://pubmed.ncbi.nlm.nih.gov/",
      summary_ko: fitV3(
        "파나마와 중남미 권역에서 해당 성분의 임상 근거와 표준 치료 지침을 확인할 수 있는 참고 논문군으로, 진입 전략 수립 시 적응증 일치성과 처방 패턴의 지역 차이를 비교하는 기반 자료로 활용 가능.",
        50,
        200,
      ),
    },
  ];
}

function buildV3DatabaseRows(): Report1PayloadV3["block4_databases"] {
  return [
    {
      name: "PanamaCompra V3 - DGCP (Ley 419 de 2024)",
      description: fitV3(
        "파나마 정부 공공조달 낙찰 실거래가 데이터베이스로 MINSA·CSS 대량 구매 이력과 공급사 분포를 확인할 수 있어 공공 채널 가격 하한 산정에 사용된다.",
        30,
        200,
      ),
      link: "https://www.panamacompra.gob.pa/",
    },
    {
      name: "ACODECO CABAMED",
      description: fitV3(
        "파나마 소비자보호청이 제공하는 민간 약국 평균가 공시 시스템으로 민간 소매 채널 진입 시 소비자가격 기준점 및 경쟁 제품 진열대 가격 비교에 활용된다.",
        30,
        200,
      ),
      link: null,
    },
    {
      name: "World Bank / WHO GHED",
      description: fitV3(
        "인구와 1인당 보건지출 등 거시 의료 지표를 제공하는 국제 공공 데이터 소스로 파나마 시장 수요와 의료 재정 여력을 정량 비교할 때 기준값으로 사용된다.",
        30,
        200,
      ),
      link: "https://apps.who.int/nha/database",
    },
    {
      name: "Statista Market Insights",
      description: fitV3(
        "국가별 의약품 시장 규모와 카테고리별 성장 데이터를 제공하는 조사 기관으로 파나마 제약 시장 총량을 확인해 제품군 우선순위와 초기 진입 타당성을 보조 판단한다.",
        30,
        200,
      ),
      link: "https://www.statista.com/markets/413/pharmaceuticals/",
    },
  ];
}

export function buildFallbackReportV3(input: FallbackInput): Report1PayloadV3 {
  const productMeta = findProductByInn(input.innEn);
  const atc4 = productMeta?.atc4_code ?? "UNKNOWN";
  const distList =
    input.distributorNames.length > 0
      ? input.distributorNames.slice(0, 4).join(", ")
      : "Feduro, Celmar, Haseth, Astur";
  const prevalenceText =
    input.prevalenceMetric.trim() !== ""
      ? input.prevalenceMetric.trim()
      : "역학 데이터는 현재 수집 범위 내 보조 지표로 처리";

  const block2_market_medical = fitV3(
    `파나마 총인구 451만명, 의약품 시장 $496M(Statista 2024), 1인당 보건지출 $1,557.81(World Bank/WHO GHED 2023), CSS 가입률 70%. ${input.innEn} 역학 지표는 ${prevalenceText}를 근거로 수요 신호를 확인했다.`,
    60,
    250,
  );
  const block2_regulation = fitV3(
    "MINSA 신약 등록은 통상 12~18개월, 비용은 $2,000~$5,000 구간으로 확인된다. 2023.6.28 한국 위생선진국 지정(WLA)으로 심사 문서 정합성 확보 시 등록 절차 단축 여지가 있다.",
    60,
    250,
  );
  const block2_trade = fitV3(
    "한-중미 FTA(2021.3.1 파나마 발효)로 관세 0%가 적용되고 ITBMS 의약품 면세가 유지된다. 수입 원가 부담이 낮아 공공조달과 민간 소매를 병행 검토할 수 있는 가격 구조를 확보한다.",
    60,
    250,
  );
  const block2_procurement = fitV3(
    input.emlWho && input.emlPaho
      ? "WHO EML 및 PAHO Strategic Fund 등재가 모두 확인되어 국제 공공조달 트랙 활용 가능성이 높다. MINSA·CSS 조달 채널과 연계해 입찰 대응 일정을 앞당기는 전략이 유효하다."
      : "WHO EML 또는 PAHO Strategic Fund 등재가 충분하지 않아 공공조달 직행에는 제약이 있다. 초기에는 민간 채널 중심으로 진입하고 공공 트랙은 단계적으로 보강하는 접근이 필요하다.",
    60,
    250,
  );
  const block2_distribution = fitV3(
    `발굴 파트너 ${String(input.distributorNames.length)}개사(${distList})를 기준으로 유통망 후보군을 확보했다. 3단계 파트너 조사(AHP 엔진⑥ PSI 점수화)와 PanamaCompra 낙찰 이력 대조를 통해 우선 협상 파트너를 좁힐 수 있다.`,
    60,
    250,
  );

  let block2_reference_price: string | null = null;
  if (input.panamacompraStats !== null || input.cabamedStats !== null) {
    const parts: string[] = [];
    if (input.panamacompraStats !== null) {
      parts.push(`공공조달 평균 $${String(input.panamacompraStats.avgPrice)}/정 (PanamaCompra V3)`);
    }
    if (input.cabamedStats !== null) {
      parts.push(`민간 소매 평균 $${String(input.cabamedStats.avgPrice)}/정 (ACODECO CABAMED)`);
    }
    block2_reference_price = fitV3(parts.join(" / "), 0, 200);
  }

  const block3_1_channel = fitV3(
    input.caseGrade === "A"
      ? "1단계(0~6개월) MINSA 등록 접수와 PanamaCompra 모니터링을 동시에 수행한다. 2단계(6~18개월) 공공·민간 파트너와 LOI 협의를 진행한다. 3단계(18개월+) 낙찰 실적을 기반으로 약국 체인 확장을 추진한다."
      : "1단계(0~6개월) 민간 약국 채널 파트너 협의를 우선한다. 2단계(6~18개월) Arrocha·Metro Plus 입점을 추진한다. 3단계(18개월+) 민간 판매 데이터로 공공조달 재진입 가능성을 재평가한다.",
    60,
    250,
  );
  const block3_2_pricing = fitV3(
    input.panamacompraStats !== null && input.cabamedStats !== null
      ? `공공조달 평균 $${String(input.panamacompraStats.avgPrice)}/정, 민간 소매 평균 $${String(input.cabamedStats.avgPrice)}/정으로 확인된다. 공공조달가는 하한 기준, 민간 소매가는 진열대 기준으로 분리해 출고가 밴드를 설계한다.`
      : `해당 INN(${atc4})의 공공 또는 민간 가격 데이터 일부가 미수집 상태다. 확보된 채널 가격만 인용해 초기 범위를 설정하고 누락 채널은 Phase 2에서 파트너 실거래 데이터로 보완한다.`,
    60,
    250,
  );
  const block3_3_partners = fitV3(
    "Feduro·Celmar·Haseth·Astur 4개사를 기준 파트너군으로 설정한다. 각 회사의 채널 적합성은 3단계 파트너 조사(AHP 엔진⑥ PSI 점수)와 공공조달 낙찰 이력 교차 검증 결과를 반영해 우선순위를 결정한다.",
    60,
    250,
  );
  const block3_4_risks = fitV3(
    "MINSA 등록 후 5년 갱신 의무, 현지 제네릭 가격 경쟁, 일부 채널 데이터 공백이 핵심 리스크다. 초기 계약 단계에서 제출 문서 표준화와 채널별 가격 검증 루틴을 병행해 진입 속도 저하를 완화해야 한다.",
    60,
    250,
  );
  const entryFallback = `${input.entryFeasibility.grade} 등급. 경로 ${input.entryFeasibility.path}. 예상 기간 ${
    input.entryFeasibility.duration_days !== null ? String(input.entryFeasibility.duration_days) : "N/A"
  }일, 비용 $${ 
    input.entryFeasibility.cost_usd !== null ? String(input.entryFeasibility.cost_usd) : "N/A"
  }.`;
  const block3_5_entry_feasibility = fitV3(
    input.entryFeasibilityText.trim() !== "" ? input.entryFeasibilityText : entryFallback,
    60,
    250,
  );

  return {
    block2_market_medical,
    block2_regulation,
    block2_trade,
    block2_procurement,
    block2_distribution,
    block2_reference_price,
    block3_1_channel,
    block3_2_pricing,
    block3_3_partners,
    block3_4_risks,
    block3_5_entry_feasibility,
    block3_data_gaps: detectDataGapsV3(input),
    block4_papers: buildV3PaperRows(input),
    block4_databases: buildV3DatabaseRows(),
  };
}