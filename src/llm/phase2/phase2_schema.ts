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
  if (!isInRange(b1, 150)) {
    return null;
  }
  if (!isInRange(b2, 300)) {
    return null;
  }
  if (!isInRange(b3, 450)) {
    return null;
  }
  if (!isInRange(b4, 200)) {
    return null;
  }
  if (!isInRange(b5, 300)) {
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
        maxLength: 150,
        description: "입력 요약: 시장/INN/참조가를 한 문단으로 요약",
      },
      block2_fob_calculation: {
        type: "string",
        minLength: 30,
        maxLength: 300,
        description: "Logic A/B 분기와 FOB 역산 수식 설명",
      },
      block3_scenarios: {
        type: "string",
        minLength: 30,
        maxLength: 450,
        description: "공격/기준/보수 3시나리오 값과 각 시나리오의 산정 이유",
      },
      block4_incoterms: {
        type: "string",
        minLength: 30,
        maxLength: 200,
        description: "FOB→CFR→CIF→DDP 순산 결과 요약",
      },
      block5_risk_and_recommendation: {
        type: "string",
        minLength: 30,
        maxLength: 300,
        description: "리스크 요약 + 권고 수출가 최종 판정",
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
