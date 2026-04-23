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

// ─── 파나마 현지 기업 판정 ────────────────────────────────────────────
// 주소/웹사이트/source_primary 중 하나라도 파나마를 가리키면 "현지"로 분류.
// enrichment 비용은 파나마 현지 기업에만 지출한다.

/** 파나마 현지를 가리키는 텍스트 키워드 (대소문자 무시) */
const PANAMA_LOCAL_KEYWORDS: readonly string[] = [
  "panama",
  "panamá",
  "panama city",
  "ciudad de panamá",
  "colón",
  "colon free zone",
  "zona libre",
  "zlc",
  "david, chiriquí",
  "chiriquí",
];

/** source_primary 필드가 파나마 전용 소스인 경우 */
const PANAMA_LOCAL_SOURCES: readonly string[] = [
  "pharmchoices",
  "dnb_panama",
  "dnfd",
  "minsa",
  "acodeco",
  "cabamed",
  "panamacompra",
];

/** 명백한 타국 LATAM 키워드 — 주소에 포함되면 "현지 아님"으로 강제 제외 */
const NON_PANAMA_LATAM_KEYWORDS: readonly string[] = [
  "bogotá", "bogota", "medellín", "medellin", "colombia",
  "méxico", "mexico city", "guadalajara",
  "buenos aires", "argentina",
  "são paulo", "sao paulo", "rio de janeiro", "brasil", "brazil",
  "santiago, chile", "chile,",
  "lima, peru", "lima, perú",
  "quito", "ecuador",
  "caracas", "venezuela",
  "san josé, costa rica", "costa rica,",
  "guatemala city", "guatemala,",
  "tegucigalpa", "honduras",
  "managua", "nicaragua",
  "san salvador", "el salvador",
];

/**
 * 주어진 후보가 파나마 현지 기업인지 판정한다.
 * - 주소에 타국 LATAM 키워드가 있으면 즉시 false
 * - 주소에 파나마 키워드가 있으면 true
 * - 주소 없으면 source_primary가 파나마 소스인지로 판정
 */
export function isPanamaLocal<
  T extends {
    company_name?: string;
    address?: string | null;
    website?: string | null;
    source_primary?: string | null;
  },
>(c: T): boolean {
  const addr = (c.address ?? "").toLowerCase();
  const site = (c.website ?? "").toLowerCase();
  const src  = (c.source_primary ?? "").toLowerCase();
  const name = (c.company_name ?? "").toLowerCase();

  // 타국 LATAM 주소는 즉시 제외
  if (addr !== "" && NON_PANAMA_LATAM_KEYWORDS.some((kw) => addr.includes(kw))) {
    return false;
  }

  // 주소에 파나마 표기 존재
  if (addr !== "" && PANAMA_LOCAL_KEYWORDS.some((kw) => addr.includes(kw))) {
    return true;
  }

  // 도메인이 .pa
  if (site.endsWith(".pa") || site.includes(".pa/") || site.includes(".com.pa")) {
    return true;
  }

  // 회사명 자체에 Panama 포함
  if (name.includes("panama") || name.includes("panamá")) {
    return true;
  }

  // 주소 없으면 source로 판정
  if (addr === "" && PANAMA_LOCAL_SOURCES.some((kw) => src.includes(kw))) {
    return true;
  }

  return false;
}

/** 후보 배열에서 파나마 현지 기업만 반환 */
export function filterPanamaLocal<
  T extends {
    company_name?: string;
    address?: string | null;
    website?: string | null;
    source_primary?: string | null;
  },
>(candidates: readonly T[]): T[] {
  return candidates.filter(isPanamaLocal);
}
