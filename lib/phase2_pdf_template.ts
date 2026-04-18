import type { Phase2ResultPayload } from "@/components/main-preview/Phase2ResultTabs";

interface BuildPhase2ReportTextInput {
  productName: string;
  caseGrade: string;
  generatedAt: string;
  result: Phase2ResultPayload;
}

function fmtDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toISOString().slice(0, 10);
}

function blockForMarket(
  title: string,
  logic: string,
  formula: string,
  market: Phase2ResultPayload["public_market"],
): string {
  const rows = [market.scenarios.aggressive, market.scenarios.average, market.scenarios.conservative];
  const lines = rows.map(
    (row) =>
      `- [${row.label} ${row.rank}위] PAB ${row.price_pab.toFixed(2)} (USD ${row.price_usd.toFixed(2)} / KRW ${row.price_krw.toLocaleString("ko-KR")})
  근거: ${row.basis}
  계산식: ${row.calculation}`,
  );
  return [
    `${title}`,
    `로직: ${logic}`,
    `공식: ${formula}`,
    ...lines,
  ].join("\n");
}

export function buildPhase2ReportText(input: BuildPhase2ReportTextInput): string {
  const date = fmtDate(input.generatedAt);
  return [
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "파나마 수출 가격 전략 보고서 (2공정)",
    `${date} · ${input.productName} · 판정: ${input.caseGrade}`,
    "시장: 공공+민간 이원 분석",
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "",
    "1. 원 가격 (기준 가격)",
    `- 기준 가격: PAB ${input.result.finalPricePab.toFixed(2)}`,
    "- 산정 방식: AI 분석 (Claude Haiku)",
    "- 시장 구분: 공공+민간 이원 분석",
    "",
    "2. 적용된 계산 공식",
    "- Logic A (공공): FOB = 낙찰가 × (1 - 마진 - 관세 - VAT)",
    "- Logic B (민간): FOB = 소매가 × (1 - 약국마진 - 도매마진 - VAT)",
    "",
    "3. 공공 시장 시나리오 (Logic A)",
    blockForMarket(
      "",
      input.result.public_market.logic,
      input.result.public_market.formula,
      input.result.public_market,
    ).trim(),
    "",
    "4. 민간 시장 시나리오 (Logic B)",
    blockForMarket(
      "",
      input.result.private_market.logic,
      input.result.private_market.formula,
      input.result.private_market,
    ).trim(),
    "",
    "5. AI 분석 근거",
    "- 공공·민간의 마진 구조 차이를 동시에 반영해 3단계 전략(공격·평균·보수)을 산출했습니다.",
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
  ].join("\n");
}

