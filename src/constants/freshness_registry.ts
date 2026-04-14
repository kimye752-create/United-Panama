/**
 * pa_source별 권장 갱신 주기·원본 시점 힌트 (FRESHNESS_REGISTRY)
 */
import type { RefreshCycle } from "../types/freshness";

export type FreshnessCategory =
  | "immutable"
  | "slow-changing"
  | "periodic"
  | "real-time"
  | "unknown";

export interface FreshnessMetadata {
  refreshCycle: RefreshCycle;
  category: FreshnessCategory;
  notes: string;
  /** 원본 시점 추출 가이드(상수일·키워드·JSON 필드명) */
  itemCollectedAtHint: string;
}

export const FRESHNESS_REGISTRY: Record<string, FreshnessMetadata> = {
  exchange_rate_exim: {
    refreshCycle: "immediate",
    category: "real-time",
    notes: "분석 버튼 시마다 갱신, deal_bas_r 호출",
    itemCollectedAtHint: "API 응답 search_date",
  },
  panamacompra_recent: {
    refreshCycle: "immediate",
    category: "real-time",
    notes: "분석 버튼 시마다 OCDS 최근 7일",
    itemCollectedAtHint: "release.date JSON",
  },
  panamacompra: {
    refreshCycle: "immediate",
    category: "real-time",
    notes: "OCDS 자사 직접 매칭(최근 구간)",
    itemCollectedAtHint: "release.date JSON",
  },
  acodeco_cabamed_competitor: {
    refreshCycle: "1m",
    category: "periodic",
    notes: "GitHub Actions cron 매월 1일 자동",
    itemCollectedAtHint: "publication_month YYYY-MM-01",
  },
  acodeco_cabamed_self: {
    refreshCycle: "1m",
    category: "periodic",
    notes: "경쟁품과 동일 XLSX",
    itemCollectedAtHint: "publication_month",
  },
  kotra: {
    refreshCycle: "3m",
    category: "periodic",
    notes: "산발적 KOTRA 뉴스, 분기 모니터링",
    itemCollectedAtHint: "뉴스 발행일",
  },
  worldbank: {
    refreshCycle: "1y",
    category: "slow-changing",
    notes: "다음해 4~7월 발표, 1년 시차 정상",
    itemCollectedAtHint: "데이터 연도 12-31",
  },
  worldbank_who_ghed: {
    refreshCycle: "1y",
    category: "slow-changing",
    notes: "보건지출, 1.5~2년 시차 정상",
    itemCollectedAtHint: "데이터 연도 12-31",
  },
  who_paho: {
    refreshCycle: "1y",
    category: "slow-changing",
    notes: "조달 메타데이터",
    itemCollectedAtHint: "보고서 발행일",
  },
  ita: {
    refreshCycle: "1y",
    category: "slow-changing",
    notes: "미국 상무부 국가 가이드 연간",
    itemCollectedAtHint: "가이드 발행일",
  },
  kotra_2026: {
    refreshCycle: "1y",
    category: "slow-changing",
    notes: "연례 수출전략 보고서",
    itemCollectedAtHint: "2026-01-01",
  },
  iqvia_sandoz_2024: {
    refreshCycle: "1y",
    category: "slow-changing",
    notes: "연 1회 제3자 리포트",
    itemCollectedAtHint: "2024-12-31",
  },
  acodeco: {
    refreshCycle: "1y",
    category: "slow-changing",
    notes: "기관 메타, 법령 개정 시 변경",
    itemCollectedAtHint: "제도 시행일",
  },
  pubmed: {
    refreshCycle: "1y",
    category: "slow-changing",
    notes: "논문 근거는 시장 분석에 연 1회 갱신으로 충분",
    itemCollectedAtHint: "논문 발행일",
  },
  gemini_prevalence: {
    refreshCycle: "1y",
    category: "slow-changing",
    notes: "의료 통계 1~2년 시차",
    itemCollectedAtHint: "논문 발행일 중앙값",
  },
  currency_peg_meta: {
    refreshCycle: "immutable",
    category: "immutable",
    notes: "USD/PAB 1:1 페그 (1904년 이래)",
    itemCollectedAtHint: "1904-01-01",
  },
  dnfd_procedure_meta: {
    refreshCycle: "immutable",
    category: "immutable",
    notes: "WLA 패스트트랙 5단계 절차",
    itemCollectedAtHint: "2023-06-28",
  },
  minsa_official: {
    refreshCycle: "immutable",
    category: "immutable",
    notes: "한국 위생선진국 지정 (2023-06-28)",
    itemCollectedAtHint: "2023-06-28",
  },
  motie: {
    refreshCycle: "immutable",
    category: "immutable",
    notes: "한-중미 FTA 발효 사실 불변 (2021-03-01)",
    itemCollectedAtHint: "2021-03-01",
  },
  panamacompra_atc4_competitor: {
    refreshCycle: "immutable",
    category: "immutable",
    notes: "과거 낙찰 이력은 체결 후 불변",
    itemCollectedAtHint: "contract_date JSON",
  },
  gemini_seed: {
    refreshCycle: "unknown",
    category: "unknown",
    notes: "폴백 시드, 실데이터 적재 완료 시 폐기 대상",
    itemCollectedAtHint: "crawled_at 폴백",
  },
  dnfd_consulta: {
    refreshCycle: "3m",
    category: "periodic",
    notes: "DNFD 조회 스냅샷",
    itemCollectedAtHint: "crawled_at 폴백",
  },
  arrocha_shopify_api: {
    refreshCycle: "7d",
    category: "periodic",
    notes: "민간 소매 API",
    itemCollectedAtHint: "crawled_at 폴백",
  },
  arrocha: {
    refreshCycle: "7d",
    category: "periodic",
    notes: "레거시 Arrocha 소스",
    itemCollectedAtHint: "crawled_at 폴백",
  },
  metroplus: {
    refreshCycle: "7d",
    category: "periodic",
    notes: "Metro Plus 스켈레톤/소매",
    itemCollectedAtHint: "crawled_at 폴백",
  },
  css: {
    refreshCycle: "1y",
    category: "slow-changing",
    notes: "CSS PDF·가격표",
    itemCollectedAtHint: "crawled_at 폴백",
  },
  minsa: {
    refreshCycle: "1y",
    category: "slow-changing",
    notes: "MINSA 공개 페이지",
    itemCollectedAtHint: "crawled_at 폴백",
  },
};

const SOURCE_ALIASES: Readonly<Record<string, string>> = {
  panamacompra: "panamacompra_recent",
};

export function getFreshnessMetadata(paSource: string): FreshnessMetadata {
  const key = SOURCE_ALIASES[paSource] ?? paSource;
  const hit = FRESHNESS_REGISTRY[key];
  if (hit !== undefined) {
    return hit;
  }
  return {
    refreshCycle: "unknown",
    category: "unknown",
    notes: "미등록 소스",
    itemCollectedAtHint: "crawled_at 폴백",
  };
}
