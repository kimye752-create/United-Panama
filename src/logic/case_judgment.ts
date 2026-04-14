/**
 * Case 판정 엔진 — REPORT1_SPEC.md 「Case 판정 엔진 명세」 규칙 기반( LLM 없음 )
 */
/// <reference types="node" />

export interface JudgmentInput {
  productId: string;
  emlWho: boolean;
  emlPaho: boolean;
  emlMinsa: boolean;
  panamacompraCount: number;
  privateRetailCount: number;
  cabamedRegulated: boolean;
  distributorCount: number;
}

export interface JudgmentResult {
  case: "A" | "B" | "C";
  verdict: "가능" | "조건부" | "불가";
  confidence: number;
  reasoning: string[];
  risks: string[];
}

const MAX_LINE = 30;

function clip(s: string): string {
  const t = s.trim();
  return t.length <= MAX_LINE ? t : `${t.slice(0, MAX_LINE - 1)}…`;
}

/**
 * 단위 테스트(수동 검증용 주석):
 * // Hydroxyurea (emlWho=true, emlPaho=true, distributor=4) → Case A
 * // Cilostazol (emlWho=false, emlPaho=false, distributor=4) → Case B
 * // 가상 fallthrough → Case C
 */
export function judgeCase(input: JudgmentInput): JudgmentResult {
  const {
    emlWho,
    emlPaho,
    panamacompraCount,
    privateRetailCount,
    distributorCount,
  } = input;

  if (emlWho && emlPaho && distributorCount >= 2) {
    const reasoning: string[] = [
      clip("WHO EML + PAHO Strategic Fund 이중 등재"),
      clip("한-중미 FTA 관세 0% + ITBMS 면세"),
      clip(`유통 파트너 ${distributorCount}개 확보`),
    ];
    const risks: string[] = [];
    if (panamacompraCount === 0) {
      risks.push(
        clip(
          "PanamaCompra 최근 낙찰 0건 → MINSA 직접 제안 루트 필요",
        ),
      );
    }
    return {
      case: "A",
      verdict: "가능",
      confidence: 0.9,
      reasoning,
      risks,
    };
  }

  if (privateRetailCount > 0 || distributorCount >= 1) {
    const channelLine =
      privateRetailCount > 0
        ? `민간 약국 채널 실데이터 확보 ${privateRetailCount}건`
        : "민간 약국 채널 데이터 없음, 거시 지표 기반 판단";
    return {
      case: "B",
      verdict: "조건부",
      confidence: 0.75,
      reasoning: [
        clip(channelLine),
        clip("한국 위생선진국 지정으로 등록 $500/0.5~1개월"),
        clip("파나마 국민 70% CSS 가입, 1인당 의료비 $1,557.81(World Bank/WHO GHED 2023)"),
      ],
      risks: [clip("공공조달 트랙 미확보 → 민간 유통사 의존 리스크")],
    };
  }

  return {
    case: "C",
    verdict: "불가",
    confidence: 0.65,
    reasoning: [
      clip("EML 등재 없음 + 민간 채널 가격 데이터 없음"),
      clip("공공조달 매칭 데이터 없음"),
      clip("유통 파트너 매칭 실패"),
    ],
    risks: [
      clip(
        "세션 8+에서 Arrocha/Metro Plus 크롤링 완료 후 재평가 필요",
      ),
    ],
  };
}
