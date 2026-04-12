/**
 * World Bank `pa_notes` 텍스트에서 거시 수치 추출 (순수 함수)
 */

/** (current US$) (2024) 19,161.2 형태 우선, 없으면 (US$) (2024) … 폴백 */
const RE_GDP_PRIMARY =
  /\(current US\$\)\s*\((\d{4})\)\s*([\d,\.]+)/i;
const RE_GDP_FALLBACK = /\(US\$\)\s*\((\d{4})\)\s*([\d,\.]+)/;

/** Most recent value (2024) 4,515,577 형태 */
const RE_POP = /value\s*\((\d{4})\)\s*([\d,]+)/i;

/**
 * GDP per capita 숫자(USD) — 매칭 실패 시 null
 */
export function parseGdpPerCapita(notes: string): number | null {
  const m = notes.match(RE_GDP_PRIMARY) ?? notes.match(RE_GDP_FALLBACK);
  if (m === null || m[2] === undefined) {
    return null;
  }
  const raw = m[2].replace(/,/g, "");
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : null;
}

/**
 * 인구 총계 — 매칭 실패 시 null
 */
export function parsePopulation(notes: string): number | null {
  const m = notes.match(RE_POP);
  if (m === null || m[2] === undefined) {
    return null;
  }
  const raw = m[2].replace(/,/g, "");
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}
