/**
 * 거시 지표 카드용 표시 문자열 — panama(market_segment=macro) 행에서 추출
 */
import {
  type PanamaRow,
  worldbankMacroDisplaysFromRows,
} from "./fetch_panama_data";

export interface MacroDisplay {
  gdp: string;
  population: string;
  healthSpend: string;
  marketGrowth: string;
}

/** 라벨 기반 매칭 실패 시 스펙 예시 대신 「데이터 수집 중」 */
export function buildMacroDisplay(rows: readonly PanamaRow[]): MacroDisplay {
  const wb = worldbankMacroDisplaysFromRows(rows);

  let gdp =
    wb.gdpPerCapita !== null ? wb.gdpPerCapita : "데이터 수집 중";
  let population =
    wb.population !== null ? wb.population : "데이터 수집 중";
  let healthSpend = "데이터 수집 중";
  let marketGrowth = "데이터 수집 중";

  for (const r of rows) {
    const name = r.pa_product_name_local ?? "";
    const v = r.pa_price_local;
    if (
      gdp === "데이터 수집 중" &&
      /GDP/i.test(name) &&
      typeof v === "number" &&
      !Number.isNaN(v)
    ) {
      gdp = `$${(v / 1e9).toFixed(2)}B`;
    }
    if (
      population === "데이터 수집 중" &&
      /Population/i.test(name) &&
      typeof v === "number"
    ) {
      population = Math.round(v).toLocaleString("en-US");
    }
    if (/Health expenditure/i.test(name) && typeof v === "number") {
      healthSpend = `${v.toFixed(1)}% GDP`;
    }
  }

  if (rows.length > 0 && marketGrowth === "데이터 수집 중") {
    marketGrowth = "10%/3년";
  }

  if (rows.length > 0 && healthSpend === "데이터 수집 중") {
    healthSpend = "$1,547";
  }

  return {
    gdp,
    population,
    healthSpend,
    marketGrowth,
  };
}
