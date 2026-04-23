// 글로벌 MNC 제외 필터 — 파나마 로컬 + LATAM 중견만 추천 대상으로 유지
// 사용자 지시: 글로벌 MNC(유럽·북미·아시아 Big Pharma)는 파트너 추천에서 제외한다.

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
 * 단일 기업명이 글로벌 MNC인지 판정한다.
 * @example isGlobalMnc("Productos Roche (Panama), S.A.") → true
 * @example isGlobalMnc("Laboratorios Medipan S.A") → false
 */
export function isGlobalMnc(companyName: string): boolean {
  const lower = companyName.toLowerCase();
  return GLOBAL_MNC_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * 후보 배열에서 글로벌 MNC를 제외한다.
 */
export function filterOutGlobalMnc<T extends { company_name: string }>(
  candidates: readonly T[],
): T[] {
  return candidates.filter((c) => !isGlobalMnc(c.company_name));
}
