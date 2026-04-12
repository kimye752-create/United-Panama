/**
 * 거시 지표 카드용 표시 문자열 — panama(market_segment=macro) 행에서 추출
 */
import {
  type PanamaRow,
  healthMacroDisplayFromRows,
  pharmaGrowthDisplayFromRows,
  worldbankMacroDisplaysFromRows,
} from "./fetch_panama_data";

export interface MacroDisplay {
  gdp: string;
  population: string;
  healthSpend: string;
  marketGrowth: string;
  footerGdp: string;
  footerPopulation: string;
  footerHealth: string;
  /** 성장률: 출처 한 줄(IQVIA) */
  footerMarket: string;
  /** 성장률: 스코프·정확성 보조 한 줄(제약 vs 보건의료 전체 구분) */
  footerMarketScopeNote: string;
}

const WB_RELEASE = "World Bank 2025 릴리즈";
/** IQVIA Sandoz YoY 단일 표기 — 보건의료 전체(KOTRA 등)와 구분 */
const FOOTER_MARKET_IQVIA =
  "출처: IQVIA Sandoz 2024 · 파나마 소매 의약품 YoY 실측";
const FOOTER_MARKET_SCOPE_NOTE =
  "※ 제약 특화 보수적 실측치 (보건의료 전체 시장과 구분)";

function footerWbWithObsYear(obsYear: string | null): string {
  const base = `출처: ${WB_RELEASE}`;
  if (obsYear === null || obsYear === "") {
    return base;
  }
  return `${base} · ${obsYear}`;
}

function footerHealthGhed(obsYear: string | null): string {
  const base = "출처: World Bank / WHO GHED";
  if (obsYear === null || obsYear === "") {
    return base;
  }
  return `${base} · ${obsYear}`;
}

/** 라벨 기반 매칭 실패 시 스펙 예시 대신 「데이터 수집 중」 */
export function buildMacroDisplay(rows: readonly PanamaRow[]): MacroDisplay {
  const wb = worldbankMacroDisplaysFromRows(rows);
  const health = healthMacroDisplayFromRows(rows);
  const growth = pharmaGrowthDisplayFromRows(rows);

  let gdp = wb.gdpPerCapita !== null ? wb.gdpPerCapita : "데이터 수집 중";
  let population =
    wb.population !== null ? wb.population : "데이터 수집 중";
  let healthSpend =
    health.display !== null ? health.display : "데이터 수집 중";
  const marketGrowth =
    growth.display !== null && growth.display !== ""
      ? growth.display
      : "데이터 수집 중";
  const hasGrowth = growth.display !== null && growth.display !== "";

  const footerMarket = hasGrowth ? FOOTER_MARKET_IQVIA : "";
  const footerMarketScopeNote = hasGrowth ? FOOTER_MARKET_SCOPE_NOTE : "";

  return {
    gdp,
    population,
    healthSpend,
    marketGrowth,
    footerGdp: footerWbWithObsYear(wb.gdpObservationYear),
    footerPopulation: footerWbWithObsYear(wb.populationObservationYear),
    footerHealth: footerHealthGhed(health.observationYear),
    footerMarket,
    footerMarketScopeNote,
  };
}
