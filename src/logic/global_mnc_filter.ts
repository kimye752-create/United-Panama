// 글로벌 MNC · 원료의약품(API) · 오리지널 제약사 제외 필터
// 유지 대상: 파나마 로컬 + LATAM 중견 완제품 유통·제조사

/**
 * 글로벌 MNC로 분류할 브랜드명 키워드 (대소문자 무시, 부분 일치).
 * 기업명이 이 키워드 중 하나라도 포함하면 "글로벌"로 분류한다.
 * LATAM/중미/파나마 로컬 기업은 본 리스트에 포함하지 않는다.
 */
const GLOBAL_MNC_KEYWORDS: readonly string[] = [
  // 유럽 Big Pharma
  "bayer",
  "roche",
  "novartis",
  "sandoz",
  "menarini",
  "menafar",
  "glaxo",
  "smithkline",
  "gsk",
  "astrazeneca",
  "mundipharm",
  "acino",
  "bial",
  "gruenenthal",
  "grünenthal",
  "ferring",
  "servier",
  "lundbeck",
  "sanofi",
  "aventis",
  "boehringer",
  "novo nordisk",
  "leo pharma",
  // 북미 Big Pharma
  "pfizer",
  "merck sharp",
  "msd",
  "abbvie",
  "abbott",
  "eli lilly",
  "bristol",
  "johnson",
  "organon",
  "baxter",
  "apotex",
  "amgen",
  "biogen",
  "gilead",
  "regeneron",
  "moderna",
  // 호주·아시아 Big Pharma
  "csl behring",
  "takeda",
  "daiichi",
  "astellas",
  "eisai",
  "otsuka",
  "hetero",
  "cipla",
  "dr. reddy",
  "sun pharma",
  // 기타 글로벌
  "guerbet",
];

/**
 * 원료의약품(API) / CRO / 기기·시약 제조사 키워드
 * — 완제품 유통이 아니라 원료·서비스 공급사이므로 바이어 후보에서 제외
 */
const API_COMPANY_KEYWORDS: readonly string[] = [
  "active pharmaceutical ingredient",
  " api ",
  "raw material",
  "chemical",
  "excipient",
  "contract research",
  " cro ",
  "radiofarmacia",   // 방사성의약품 — 완제품 유통 아님
  "radiofarma",
  "medical device",
  "diagnostics",
  "in vitro",
  "reagent",
];

/**
 * 단일 기업명/CPHI 카테고리가 글로벌 MNC인지 판정한다.
 */
export function isGlobalMnc(companyName: string): boolean {
  const lower = companyName.toLowerCase();
  return GLOBAL_MNC_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * 원료의약품·기기 전문 기업인지 판정한다 (이름 + 카테고리 모두 확인).
 */
export function isApiOrDeviceCompany(
  companyName: string,
  cphi_category?: string | null,
): boolean {
  const lower = (companyName + " " + (cphi_category ?? "")).toLowerCase();
  return API_COMPANY_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * 후보 배열에서 글로벌 MNC + 원료의약품/기기 기업을 제외한다.
 */
export function filterOutGlobalMnc<T extends { company_name: string; cphi_category?: string | null }>(
  candidates: readonly T[],
): T[] {
  return candidates.filter(
    (c) => !isGlobalMnc(c.company_name) && !isApiOrDeviceCompany(c.company_name, c.cphi_category),
  );
}
