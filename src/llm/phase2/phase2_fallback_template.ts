import type { ScenarioRow } from "@/src/logic/phase2/price_scenario_generator";
import type { Phase2MarketSegment } from "@/src/logic/phase2/margin_policy_resolver";

import type { Phase2ReportPayload } from "./phase2_schema";

export interface Phase2FallbackInput {
  productName: string;
  inn: string;
  market: Phase2MarketSegment;
  referencePricePab: number;
  baselineFormula: string;
  scenarios: ScenarioRow[];
}

function fit(text: string, minLength: number, maxLength: number): string {
  let value = text.trim();
  if (value.length > maxLength) {
    value = value.slice(0, maxLength);
  }
  const pad = " 계산 입력 기준으로 작성.";
  while (value.length < minLength) {
    value += pad;
  }
  if (value.length > maxLength) {
    value = value.slice(0, maxLength);
  }
  return value;
}

export function buildPhase2FallbackReport(input: Phase2FallbackInput): Phase2ReportPayload {
  const baseline = input.scenarios.find((s) => s.scenario === "avg") ?? input.scenarios[0];
  const agg = input.scenarios.find((s) => s.scenario === "agg") ?? baseline;
  const cons = input.scenarios.find((s) => s.scenario === "cons") ?? baseline;
  const logicName = input.market === "public" ? "Logic A(공공)" : "Logic B(민간)";
  const marketLabel = input.market === "public" ? "공공 시장" : "민간 시장";
  const logicShort = input.market === "public" ? "A" : "B";
  const baseFob = baseline.fob.fobUsd.toFixed(2);
  const consFob = cons.fob.fobUsd.toFixed(2);
  const aggFob = agg.fob.fobUsd.toFixed(2);

  return {
    block1_input_summary: fit(
      `입력 요약: ${marketLabel}, 제품 ${input.productName}(${input.inn}), 참조가 ${input.referencePricePab.toFixed(2)} PAB.`,
      30,
      150,
    ),
    block2_fob_calculation: fit(
      `FOB 계산은 Logic ${logicShort}(${input.market === "public" ? "공공" : "민간"})를 적용했습니다. 수식: FOB = ${input.market === "public" ? "공공낙찰가" : "민간소매가"} / (1+약국마진) / (1+도매마진) / (1+관세+ITBMS). 박제 마진: 약국 33%(기준), 도매 23~25%(기준). 한-중미 FTA 관세 0% (2021.3 발효) + 의약품 ITBMS 0% 적용하여 세율 항은 실질 0. 기준 시나리오 FOB는 ${baseFob} USD입니다.`,
      80,
      300,
    ),
    block3_scenarios: fit(
      `공격 시나리오 FOB ${agg.fob.fobUsd.toFixed(2)} USD(CFR ${agg.incoterms.cfrUsd.toFixed(2)}), 기준 시나리오 FOB ${baseline.fob.fobUsd.toFixed(2)} USD(CFR ${baseline.incoterms.cfrUsd.toFixed(2)}), 보수 시나리오 FOB ${cons.fob.fobUsd.toFixed(2)} USD(CFR ${cons.incoterms.cfrUsd.toFixed(2)}). 공격은 협상 상단가, 기준은 일반 계약가, 보수는 마지노선 방어가로 사용합니다.`,
      30,
      450,
    ),
    block4_incoterms: fit(
      `Incoterms 순산: FOB ${baseline.incoterms.fobUsd.toFixed(2)} → CFR ${baseline.incoterms.cfrUsd.toFixed(2)} → CIF ${baseline.incoterms.cifUsd.toFixed(2)} → DDP ${baseline.incoterms.ddpUsd.toFixed(2)} USD.`,
      30,
      200,
    ),
    block5_risk_and_recommendation: fit(
      `리스크: 마진 가정치가 내부 실거래와 다를 수 있어 최종 협상 직전 재검증이 필요합니다. 3단계 마진 전략 현재 단계: 2단계(추정 버퍼) 진입 중. 기업 내부 실거래 데이터 수령 시 3단계(내부 실거래) 전환 예정. 권고 수출가는 기준 시나리오 FOB ${baseFob} USD를 우선 제시하고, 협상 범위는 ${consFob}~${aggFob} USD로 운용합니다.`,
      80,
      300,
    ),
  };
}
