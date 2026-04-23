/**
 * 파나마 랜딩 거시 카드 전용 조회.
 * regulatory_milestones(getRegulatoryMilestones)는 원래 이 파일에 없었고 page에서만 호출됐음 —
 * 2026-04-15 랜딩 단순화로 호재 섹션 제거 시에도 여기서 milestones 조회를 추가하지 않음.
 */
import { unstable_noStore as noStore } from "next/cache";

import { createSupabaseServer } from "../../lib/supabase-server";
import { MACRO_PRODUCT_ID } from "../utils/product-dictionary";
import {
  parseGdpPerCapita,
  parsePharmaYoYPercentFromNotes,
  parsePopulation,
} from "../../lib/parse_macro_notes";

interface PanamaMacroRow {
  pa_source: string | null;
  pa_price_local: number | null;
  pa_collected_at: string | null;
  crawled_at: string | null;
  pa_notes: string | null;
}

const STATISTA_PHARMA_MARKET_USD_2024 = 496_000_000;

export interface PanamaLandingMetricCard {
  label: string;
  value: string;
  footer: string;
  yoy?: string;
  detailLines?: readonly string[];
  sourceNote?: string;
  hasData: boolean;
}

function formatUsd(value: number): string {
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

function formatUsdMillions(value: number): string {
  const n = value / 1_000_000;
  const s = n.toFixed(1);
  // 소수점 첫째 자리가 0이면 정수로만 표기
  return `$${s.endsWith(".0") ? String(Math.round(n)) : s}M`;
}

function formatPopulation(value: number): string {
  return `${Math.round(value).toLocaleString("en-US")}명`;
}

function formatPercent(value: number): string {
  return `${value}%`;
}

function sourceLabel(source: string | null): string {
  if (source === "worldbank") {
    return "World Bank";
  }
  if (source === "kotra") {
    return "KOTRA";
  }
  if (source === "ita") {
    return "ITA";
  }
  if (source === "motie") {
    return "MOTIE";
  }
  if (source === "iqvia_sandoz_2024") {
    return "IQVIA";
  }
  return source ?? "출처 미상";
}

function extractNotesText(notes: string | null): string {
  if (notes === null || notes.trim() === "") {
    return "";
  }
  try {
    const parsed = JSON.parse(notes) as Record<string, unknown>;
    const plain = parsed["notes_plain"];
    if (typeof plain === "string" && plain.trim() !== "") {
      return plain;
    }
  } catch {
    return notes;
  }
  return notes;
}

function readYoYFromNotes(notes: string | null): string | undefined {
  const text = extractNotesText(notes);
  if (text === "") {
    return undefined;
  }
  const match = text.match(/([+-]?\d+(?:\.\d+)?)\s*%/);
  if (match === null) {
    return undefined;
  }
  return `전년비 ${match[1]}%`;
}

function readYear(row: PanamaMacroRow): string {
  const text = extractNotesText(row.pa_notes);
  const m = text.match(/\((\d{4})\)/);
  if (m !== null) {
    return m[1];
  }

  const base = row.pa_collected_at ?? row.crawled_at;
  if (base === null || base === "") {
    return "—";
  }
  const year = new Date(base).getUTCFullYear();
  return Number.isFinite(year) ? String(year) : "—";
}

function firstBySource(
  rows: readonly PanamaMacroRow[],
  sources: readonly string[],
): PanamaMacroRow | null {
  for (const source of sources) {
    const found = rows.find((row) => row.pa_source === source);
    if (found !== undefined) {
      return found;
    }
  }
  return null;
}

function pickGrowthRow(rows: readonly PanamaMacroRow[]): {
  row: PanamaMacroRow;
  value: number;
} | null {
  const order = ["motie", "kotra", "iqvia_sandoz_2024"] as const;
  for (const source of order) {
    const candidates = rows.filter((row) => row.pa_source === source);
    for (const row of candidates) {
      const byNotes = parsePharmaYoYPercentFromNotes(extractNotesText(row.pa_notes));
      if (byNotes !== null) {
        return { row, value: byNotes };
      }
      if (typeof row.pa_price_local === "number") {
        return { row, value: row.pa_price_local };
      }
    }
  }
  return null;
}

function parseMarketSizeUsd(text: string): number | null {
  // "$5.2억", "US$ 530 million" 같은 형태를 단순 파싱합니다.
  const hundredMillionMatch = text.match(/\$?\s*([\d.,]+)\s*억/);
  if (hundredMillionMatch !== null) {
    const n = Number.parseFloat(hundredMillionMatch[1].replace(/,/g, ""));
    if (Number.isFinite(n)) {
      return n * 100_000_000;
    }
  }

  const millionMatch = text.match(/([\d.,]+)\s*(million|mn)/i);
  if (millionMatch !== null) {
    const n = Number.parseFloat(millionMatch[1].replace(/,/g, ""));
    if (Number.isFinite(n)) {
      return n * 1_000_000;
    }
  }

  return null;
}

function buildFallbackCard(label: string): PanamaLandingMetricCard {
  return {
    label,
    value: "데이터 준비 중",
    footer: "—",
    hasData: false,
  };
}

function buildImfGdpCard(): PanamaLandingMetricCard {
  // 사용자 요청 — 4개 메인 카드 중 GDP는 "1인당 GDP"만 표기
  // 기존 값 참고: 국가 GDP "US$ 87.6 Billion" · 국가/1인당 병기 "US$ 87.6 Billion / $19,445"
  return {
    label: "1인당 GDP",
    value: "US$ 19,445",
    footer: "출처: IMF (2024)",
    hasData: true,
  };
}

function buildStatistaMarketCard(): PanamaLandingMetricCard {
  return {
    label: "의약품 시장 규모",
    value: formatUsdMillions(STATISTA_PHARMA_MARKET_USD_2024),
    footer: "2024 · Statista",
    yoy: "US$ 496M",
    hasData: true,
  };
}

function buildImportDependencyCard(): PanamaLandingMetricCard {
  return {
    label: "의약품 국가 수입 의존도",
    value: "~90%",
    footer: "KOTRA / ITA (2024)",
    hasData: true,
  };
}

export async function getPanamaLandingMetricCards(): Promise<
  readonly PanamaLandingMetricCard[]
> {
  // Next.js Data Cache를 완전히 우회 — 매 요청마다 Supabase에서 신선한 데이터 조회
  noStore();

  try {
    const sb = createSupabaseServer();

    const [worldbankRes, marketRes, growthRes] = await Promise.all([
      sb
        .from("panama")
        .select("pa_source, pa_price_local, pa_collected_at, crawled_at, pa_notes")
        .eq("product_id", MACRO_PRODUCT_ID)
        .eq("pa_source", "worldbank")
        .order("crawled_at", { ascending: false })
        .limit(10),
      sb
        .from("panama")
        .select("pa_source, pa_price_local, pa_collected_at, crawled_at, pa_notes")
        .eq("product_id", MACRO_PRODUCT_ID)
        .in("pa_source", ["kotra", "ita"])
        .order("crawled_at", { ascending: false })
        .limit(10),
      sb
        .from("panama")
        .select("pa_source, pa_price_local, pa_collected_at, crawled_at, pa_notes")
        .eq("product_id", MACRO_PRODUCT_ID)
        .in("pa_source", ["motie", "kotra", "iqvia_sandoz_2024"])
        .order("crawled_at", { ascending: false })
        .limit(20),
    ]);

    const worldbankRows = (worldbankRes.data ?? []) as PanamaMacroRow[];
    const gdpCard = buildImfGdpCard();

    const populationCard =
      worldbankRes.error === null
        ? {
            ...(() => {
              const row = worldbankRows.find((item) =>
                extractNotesText(item.pa_notes).includes("Population"),
              );
              const value =
                row === undefined
                  ? null
                  : parsePopulation(extractNotesText(row.pa_notes));
              if (row === undefined || value === null) {
                return buildFallbackCard("인구");
              }
              return {
                label: "인구",
                value: formatPopulation(value),
                footer: `${readYear(row)} · ${sourceLabel(row.pa_source)}`,
                hasData: true,
              };
            })(),
          }
        : buildFallbackCard("인구");

    const marketRows = (marketRes.data ?? []) as PanamaMacroRow[];
    const marketRow = firstBySource(marketRows, ["kotra", "ita"]);
    const marketValue =
      marketRow === null
        ? null
        : parseMarketSizeUsd(extractNotesText(marketRow.pa_notes));
    const marketCard = buildStatistaMarketCard();

    const growthRows = (growthRes.data ?? []) as PanamaMacroRow[];
    const growthPicked = pickGrowthRow(growthRows);
    const cagrCard =
      growthRes.error === null && growthPicked !== null
        ? {
            label: "실질 성장률",
            value: formatPercent(growthPicked.value),
            footer: `${readYear(growthPicked.row)} · ${sourceLabel(growthPicked.row.pa_source)}`,
            hasData: true,
          }
        : buildFallbackCard("실질 성장률");

    if (marketRes.error === null && marketRow !== null && marketValue !== null) {
      // 기존 DB 값은 참고 로그만 유지하고, UI 표시는 Statista 대표 수치로 고정합니다.
      void readYoYFromNotes(marketRow.pa_notes);
    }
    return [gdpCard, populationCard, marketCard, buildImportDependencyCard()] as const;
  } catch {
    // 외부 DB 연결 실패 시에도 레이아웃이 깨지지 않도록 기본 카드로 반환합니다.
    return [
      buildImfGdpCard(),
      buildFallbackCard("인구"),
      buildStatistaMarketCard(),
      buildImportDependencyCard(),
    ] as const;
  }
}
