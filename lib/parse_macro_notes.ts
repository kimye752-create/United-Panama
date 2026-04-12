/**
 * World Bank `pa_notes` 텍스트에서 거시 수치 추출 (순수 함수)
 */

/** (current US$) (2024) 19,161.2 형태 우선, 없으면 (US$) (2024) … 폴백 */
const RE_GDP_PRIMARY =
  /\(current US\$\)\s*\((\d{4})\)\s*([\d,\.]+)/i;
const RE_GDP_FALLBACK = /\(US\$\)\s*\((\d{4})\)\s*([\d,\.]+)/;

/** Most recent value. (2024) 4,515,577 또는 (2023) 1,557.81 — value 뒤 마침표 허용 */
const RE_POP = /value\.?\s*\((\d{4})\)\s*([\d,\.]+)/i;

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
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? Math.round(n) : null;
}

/**
 * 1인당 보건지출(USD) — 동일 `Most recent value. (연도) 수치` 패턴, 소수 유지
 */
export function parseHealthPerCapitaUsd(notes: string): number | null {
  const m = notes.match(RE_POP);
  if (m === null || m[2] === undefined) {
    return null;
  }
  const raw = m[2].replace(/,/g, "");
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : null;
}

/**
 * IQVIA YoY 시드 문구에서 % 수치만 추출 (예: "실측 3.4%", "3.4% (2023")
 */
export function parsePharmaYoYPercentFromNotes(notes: string): number | null {
  const m1 = notes.match(/실측\s*([\d.]+)\s*%/i);
  if (m1 !== null && m1[1] !== undefined) {
    const n = Number.parseFloat(m1[1]);
    return Number.isFinite(n) ? n : null;
  }
  const m2 = notes.match(/YoY\s*([\d.]+)\s*%/i);
  if (m2 !== null && m2[1] !== undefined) {
    const n = Number.parseFloat(m2[1]);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}
