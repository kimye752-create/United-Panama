import type { Tool } from "@anthropic-ai/sdk/resources/messages/messages.js";

export interface Phase2ReportPayload {
  block1_input_summary: string;
  block2_fob_calculation: string;
  block3_scenarios: string;
  block4_incoterms: string;
  block5_risk_and_recommendation: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isInRange(value: string, maxLength: number): boolean {
  return value.length >= 30 && value.length <= maxLength;
}

export function parsePhase2Payload(raw: unknown): Phase2ReportPayload | null {
  if (!isRecord(raw)) {
    return null;
  }
  const b1 = raw.block1_input_summary;
  const b2 = raw.block2_fob_calculation;
  const b3 = raw.block3_scenarios;
  const b4 = raw.block4_incoterms;
  const b5 = raw.block5_risk_and_recommendation;

  if (
    typeof b1 !== "string" ||
    typeof b2 !== "string" ||
    typeof b3 !== "string" ||
    typeof b4 !== "string" ||
    typeof b5 !== "string"
  ) {
    return null;
  }
  if (!isInRange(b1, 300)) {
    return null;
  }
  if (!isInRange(b2, 500)) {
    return null;
  }
  if (!isInRange(b3, 600)) {
    return null;
  }
  if (!isInRange(b4, 300)) {
    return null;
  }
  if (!isInRange(b5, 500)) {
    return null;
  }
  return {
    block1_input_summary: b1,
    block2_fob_calculation: b2,
    block3_scenarios: b3,
    block4_incoterms: b4,
    block5_risk_and_recommendation: b5,
  };
}

export const PHASE2_TOOL: Tool = {
  name: "generate_phase2_report",
  description: "파나마 2단계(수출가격 책정) FOB 역산 결과를 5블록 보고서로 생성한다.",
  input_schema: {
    type: "object",
    properties: {
      block1_input_summary: {
        type: "string",
        minLength: 30,
        maxLength: 300,
        description: "시장·제품 개요: 파나마 콜론 FTZ·CSS 공공시장·수입 의존도 맥락 + 제품 INN·제형·독점기술 차별화 포인트 + 참조가 요약. 격식체(-합니다) 사용.",
      },
      block2_fob_calculation: {
        type: "string",
        minLength: 30,
        maxLength: 500,
        description: "FOB 역산 경로: 한-중미 FTA 관세 0%(2021.3 발효), 의약품 ITBMS 면세 0% 포함. Logic A(공공)/B(민간) 수식 단계 명시. 경쟁사 평균가를 핵심 참조점으로 언급. DNFD 등록 여부 맥락 포함.",
      },
      block3_scenarios: {
        type: "string",
        minLength: 30,
        maxLength: 600,
        description: "3시나리오 서술: 저가 진입(agg FOB) / 기준가(avg FOB) / 프리미엄(cons FOB). 각 시나리오에 산정 근거·수입상 마진 영향 반드시 포함. 격식체 사용.",
      },
      block4_incoterms: {
        type: "string",
        minLength: 30,
        maxLength: 300,
        description: "인코텀즈 순산: FOB→CFR→CIF→DDP 결과 요약. USD 기준 표기.",
      },
      block5_risk_and_recommendation: {
        type: "string",
        minLength: 30,
        maxLength: 500,
        description: "리스크·경쟁·권고: DNFD 적체 리스크, 다국적사·중남미 로컬 경쟁 서술. 자사 독점기술/복합제 포지셔닝. 3단계 마진 전략 현재 단계 명시. 권고 수출가(avg FOB) 최종 제시.",
      },
    },
    required: [
      "block1_input_summary",
      "block2_fob_calculation",
      "block3_scenarios",
      "block4_incoterms",
      "block5_risk_and_recommendation",
    ],
  },
};
