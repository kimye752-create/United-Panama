/**
 * P1MarketDocument — 시장조사 보고서 PDF
 * SG_01_시장보고서_Sereterol.docx 양식 기준
 *
 * 섹션 구조:
 *   1. 의료 거시환경 파악  (매크로 지표 + 치료영역 서술)
 *   2. 무역/규제 환경      (▸ 3개 서브섹션)
 *   3. 참고 가격           (경쟁제품 목록 + 분석 서술)
 *   4. 리스크 / 조건       (▸ 3개 서브섹션 + 진출 권고)
 *   5. 근거 및 출처        (논문 No.1~3 + 사용 DB 목록)
 */
import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

import "@/lib/pdf/pdf-fonts";
import type { Report } from "@/src/types/report_session";

// ─── 색상 (docx 기준) ───────────────────────────────────────────────────────
const NAVY   = "#1B3A6B";
const BLACK  = "#1A1A1A";
const GRAY   = "#888888";
const BORDER = "#CCCCCC";

// ─── 공통 스타일 ────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  page: {
    backgroundColor: "#FFFFFF",
    paddingTop: 45,
    paddingBottom: 50,
    paddingHorizontal: 45,
    fontFamily: "NanumGothic",
    fontSize: 9.5,
    color: BLACK,
    lineHeight: 1.55,
  },
  // 최상단 제목
  docTitle: {
    fontWeight: "bold",
    fontSize: 14,
    color: NAVY,
    borderBottomWidth: 2,
    borderBottomColor: NAVY,
    paddingBottom: 3,
    marginBottom: 5,
  },
  // 부제목 (INN | HS | 국가 | 날짜)
  docSubtitle: {
    fontSize: 8.5,
    color: GRAY,
    marginBottom: 16,
  },
  // 섹션 헤더 (1. 의료 거시환경 파악)
  sectionHeader: {
    fontWeight: "bold",
    fontSize: 11.5,
    color: NAVY,
    borderBottomWidth: 0.8,
    borderBottomColor: BORDER,
    paddingBottom: 4,
    marginTop: 18,
    marginBottom: 8,
  },
  // 서브섹션 헤더 (▸ HSA 등록 현황)
  subHeader: {
    fontWeight: "bold",
    fontSize: 10.5,
    color: NAVY,
    marginTop: 10,
    marginBottom: 4,
  },
  // 키-값 라인 컨테이너 (인구 / GDP / ...)
  kvRow: {
    flexDirection: "row",
    marginBottom: 4,
    paddingLeft: 12,
  },
  kvLabel: {
    fontWeight: "bold",
    fontSize: 9.5,
    color: BLACK,
    width: 110,
  },
  kvValue: {
    fontSize: 9.5,
    color: BLACK,
    flex: 1,
  },
  // 본문 단락
  bodyParagraph: {
    fontSize: 9.5,
    color: BLACK,
    lineHeight: 1.65,
    textAlign: "justify",
    marginTop: 6,
    marginBottom: 4,
  },
  // 서브섹션 본문
  subBodyText: {
    fontSize: 9.5,
    color: BLACK,
    lineHeight: 1.65,
    textAlign: "justify",
    marginBottom: 4,
    paddingLeft: 2,
  },
  // 논문 인용 번호
  citationNo: {
    fontWeight: "bold",
    fontSize: 9.5,
    color: NAVY,
    marginTop: 8,
    marginBottom: 2,
  },
  // 논문 제목
  citationTitle: {
    fontWeight: "bold",
    fontSize: 9,
    color: BLACK,
    marginBottom: 2,
  },
  // 논문 본문
  citationBody: {
    fontSize: 9,
    color: BLACK,
    lineHeight: 1.55,
    marginBottom: 2,
  },
  // 출처 URL
  citationUrl: {
    fontSize: 8,
    color: GRAY,
    marginBottom: 6,
  },
  // DB 목록 아이템
  dbItem: {
    fontSize: 9,
    color: BLACK,
    marginBottom: 3,
    paddingLeft: 16,
  },
  // 페이지 하단 푸터
  footer: {
    position: "absolute",
    bottom: 20,
    left: 45,
    right: 45,
    height: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 0.5,
    borderTopColor: BORDER,
    paddingTop: 4,
  },
  footerLeft: {
    fontSize: 7.5,
    color: GRAY,
  },
  footerRight: {
    fontSize: 7.5,
    color: GRAY,
  },
});

// ─── helpers ─────────────────────────────────────────────────────────────────
function str(v: unknown, fallback = "-"): string {
  if (v === null || v === undefined) return fallback;
  if (typeof v === "string") return v.trim() === "" ? fallback : v.trim();
  if (typeof v === "number") return String(v);
  return fallback;
}

function num(v: unknown): number | null {
  if (typeof v === "number" && isFinite(v)) return v;
  return null;
}

function arr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function rec(v: unknown): Record<string, unknown> | null {
  if (v !== null && typeof v === "object" && !Array.isArray(v))
    return v as Record<string, unknown>;
  return null;
}

/** ▸ 서브섹션 텍스트 분리 */
function parseSubsections(text: string): { header: string; body: string }[] {
  const parts = text.split(/(?=▸\s)/);
  return parts
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const colonIdx = part.indexOf(":");
      if (colonIdx === -1) return { header: part, body: "" };
      const header = part.slice(0, colonIdx + 1).replace(/^▸\s*/, "▸ ");
      const body   = part.slice(colonIdx + 1).trim();
      return { header, body };
    });
}

/** 숫자 포맷 */
function fmtNum(n: number | null, decimals = 2): string {
  if (n === null) return "-";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// ─── 섹션 1: 의료 거시환경 파악 ──────────────────────────────────────────────
function Section1({
  macroStats,
  therStats,
  analysis,
  product,
}: {
  macroStats: Record<string, unknown> | null;
  therStats:  Record<string, unknown> | null;
  analysis:   Record<string, unknown> | null;
  product:    { therapeuticArea: string };
}) {
  const narrative    = str(rec(analysis?.["marketAnalysis"])?.["block1_market_narrative"]);
  const therContext  = str(rec(analysis?.["marketAnalysis"])?.["block1_therapeutic_context"]);

  // 거시 지표 (DB 우선, 없으면 고정값)
  const population   = str(macroStats?.["population_text"],   "") || "4,351,267명 (World Bank, 2024)";
  const gdpPerCapita = str(macroStats?.["gdp_per_capita_text"], "") || "USD 19,445 (IMF, 2024)";
  const marketSize   = str(macroStats?.["pharma_market_text"], "") || "USD 496M (Statista, 2024)";
  const healthExp    = str(macroStats?.["health_exp_text"],    "") || "GDP 대비 약 7.8% (World Bank, 2022)";
  const importDep    = str(macroStats?.["import_dep_text"],    "") || "~90% (KOTRA / ITA, 2024)";

  // 치료영역 특이 지표
  const prevalence   = num(therStats?.["prevalence_pct"]);
  const therMarket   = num(therStats?.["market_size_usd"]);

  const kvData: { label: string; value: string }[] = [
    { label: "인구",          value: population },
    { label: "1인당 GDP",     value: gdpPerCapita },
    { label: "의약품 시장 규모", value: marketSize },
    { label: "보건 지출",     value: healthExp },
    { label: "의약품 수입 의존도", value: importDep },
    ...(prevalence !== null
      ? [{ label: `${product.therapeuticArea} 유병률`, value: `성인 인구의 약 ${prevalence}%` }]
      : []),
    ...(therMarket !== null
      ? [{ label: `${product.therapeuticArea} 시장 규모`, value: `약 USD ${fmtNum(therMarket, 0)}M (추산)` }]
      : []),
  ];

  return (
    <View>
      <Text style={S.sectionHeader}>1. 의료 거시환경 파악</Text>
      {kvData.map(({ label, value }) => (
        <View key={label} style={S.kvRow}>
          <Text style={S.kvLabel}>{label}  </Text>
          <Text style={S.kvValue}>{value}</Text>
        </View>
      ))}
      {narrative !== "-" && (
        <Text style={S.bodyParagraph}>{narrative}</Text>
      )}
      {therContext !== "-" && therContext !== narrative && (
        <Text style={S.bodyParagraph}>{therContext}</Text>
      )}
    </View>
  );
}

// ─── 섹션 2: 무역/규제 환경 ──────────────────────────────────────────────────
function Section2({ analysis }: { analysis: Record<string, unknown> | null }) {
  const raw = str(rec(analysis?.["marketAnalysis"])?.["block2_regulatory_path"]);
  if (raw === "-") return null;
  const subs = parseSubsections(raw);

  return (
    <View>
      <Text style={S.sectionHeader}>2. 무역/규제 환경</Text>
      {subs.length > 0
        ? subs.map(({ header, body }, i) => (
            <View key={i}>
              <Text style={S.subHeader}>{header}</Text>
              {body !== "" && <Text style={S.subBodyText}>{body}</Text>}
            </View>
          ))
        : <Text style={S.subBodyText}>{raw}</Text>
      }
    </View>
  );
}

// ─── 섹션 3: 참고 가격 ───────────────────────────────────────────────────────
function Section3({
  competitorPrices,
  competitorProducts,
  analysis,
}: {
  competitorPrices:  Record<string, unknown> | null;
  competitorProducts: unknown[];
  analysis:           Record<string, unknown> | null;
}) {
  const narrative = str(rec(analysis?.["marketAnalysis"])?.["block3_price_narrative"]);
  const pubData   = rec(competitorPrices?.["publicProcurement"]);
  const privData  = rec(competitorPrices?.["privateRetail"]);
  const pubAvg    = num(pubData?.["avg"]);
  const privAvg   = num(privData?.["avg"]);
  const pubCnt    = num(pubData?.["count"]) ?? 0;
  const privCnt   = num(privData?.["count"]) ?? 0;

  const priceRows: { label: string; value: string }[] = [];
  if (pubAvg !== null && pubCnt > 0)
    priceRows.push({ label: "공공조달 평균가 (PanamaCompra)", value: `PAB ${fmtNum(pubAvg, 4)}  (${pubCnt}건)` });
  if (privAvg !== null && privCnt > 0)
    priceRows.push({ label: "민간 소매 평균가 (ACODECO)", value: `PAB ${fmtNum(privAvg, 2)}  (${privCnt}건)` });

  // 경쟁 제품 개별 가격
  const competitorRows = competitorProducts
    .slice(0, 5)
    .map((p) => {
      const row = rec(p);
      if (!row) return null;
      const name   = str(row["pa_product_name_local"]) !== "-" ? str(row["pa_product_name_local"]) : str(row["pa_ingredient_inn"]);
      const price  = num(row["pa_price_local"]);
      const unit   = str(row["pa_currency_unit"]) !== "-" ? str(row["pa_currency_unit"]) : "PAB";
      const pkg    = str(row["pa_package_unit"]) !== "-" ? ` / ${str(row["pa_package_unit"])}` : "";
      const src    = str(row["pa_source"]);
      const seg    = str(row["pa_market_segment"]) !== "-" ? str(row["pa_market_segment"]) : str(row["market_segment"]);
      return {
        label: name,
        value: price !== null ? `${unit} ${fmtNum(price, 2)}${pkg}  (${src}${seg !== "-" ? `, ${seg}` : ""})` : "가격 미공개",
      };
    })
    .filter((r): r is { label: string; value: string } => r !== null);

  const allRows = [...priceRows, ...competitorRows];

  return (
    <View>
      <Text style={S.sectionHeader}>3. 참고 가격</Text>
      {allRows.length > 0
        ? allRows.map(({ label, value }) => (
            <View key={label} style={S.kvRow}>
              <Text style={S.kvLabel}>{label}  </Text>
              <Text style={S.kvValue}>{value}</Text>
            </View>
          ))
        : (
          <View style={S.kvRow}>
            <Text style={S.kvValue}>가격 데이터 수집 대기 중</Text>
          </View>
        )
      }
      {narrative !== "-" && (
        <Text style={S.bodyParagraph}>{narrative}</Text>
      )}
    </View>
  );
}

// ─── 섹션 4: 리스크 / 조건 ───────────────────────────────────────────────────
function Section4({ analysis }: { analysis: Record<string, unknown> | null }) {
  const rawRisk = str(rec(analysis?.["marketAnalysis"])?.["block4_risk_factors"]);
  const rawRec  = str(rec(analysis?.["marketAnalysis"])?.["block5_action_recommendation"]);
  const subs    = parseSubsections(rawRisk);

  return (
    <View>
      <Text style={S.sectionHeader}>4. 리스크 / 조건</Text>
      {subs.length > 0
        ? subs.map(({ header, body }, i) => (
            <View key={i}>
              <Text style={S.subHeader}>{header}</Text>
              {body !== "" && <Text style={S.subBodyText}>{body}</Text>}
            </View>
          ))
        : <Text style={S.subBodyText}>{rawRisk}</Text>
      }
      {rawRec !== "-" && (
        <>
          <Text style={[S.subHeader, { marginTop: 12 }]}>▸ 진출 전략 권고</Text>
          <Text style={S.subBodyText}>{rawRec}</Text>
        </>
      )}
    </View>
  );
}

// ─── 섹션 5: 근거 및 출처 ────────────────────────────────────────────────────
function Section5({
  citations,
  competitorProducts,
}: {
  citations:          unknown[];
  competitorProducts: unknown[];
}) {
  // 논문 인용 sources for 5-2
  const dbSources = [
    "PanamaCompra — 파나마 공공조달 입찰 DB",
    "ACODECO / CABAMED — 파나마 소비자보호청 의약품 소매가 DB",
    "MINSA DNFD — 파나마 의약품 등록 공식 데이터",
    "WHO EML / PAHO EML — 필수의약품 등재 현황",
    "Statista — Pharmaceutical Market Data 2024",
    "IMF World Economic Outlook 2024 — GDP 지표",
    "World Bank — 파나마 인구·보건 통계",
  ];

  // 경쟁사 출처 추가
  const extraSources = Array.from(
    new Set(
      competitorProducts
        .map((p) => str(rec(p)?.["pa_source"]))
        .filter((s) => s !== "-"),
    ),
  ).map((s) => `${s} — 경쟁사 가격 데이터`);

  const allSources = [...dbSources, ...extraSources];

  return (
    <View>
      <Text style={S.sectionHeader}>5. 근거 및 출처</Text>

      {/* 5-1. 논문 인용 */}
      <Text style={S.subHeader}>▸ 5-1. 참고 논문 / 규제 문서</Text>
      {citations.length > 0
        ? citations.map((c, idx) => {
            const row = rec(c);
            if (!row) return null;
            const no      = num(row["citation_no"]) ?? idx + 1;
            const title   = str(row["paper_title"] ?? row["title"]);
            const summary = str(row["summary_ko"]);
            const url     = str(row["source_url"] ?? row["url"]);
            return (
              <View key={idx}>
                <Text style={S.citationNo}>No.{no}  <Text style={S.citationTitle}>{title}</Text></Text>
                {summary !== "-" && <Text style={S.citationBody}>{summary}</Text>}
                {url !== "-" && <Text style={S.citationUrl}>출처: {url}</Text>}
              </View>
            );
          })
        : <Text style={S.citationBody}>논문 데이터 수집 대기 중</Text>
      }

      {/* 5-2. 사용 DB/기관 */}
      <Text style={[S.subHeader, { marginTop: 12 }]}>▸ 5-2. 사용된 DB/기관</Text>
      {allSources.map((s) => (
        <Text key={s} style={S.dbItem}>•  {s}</Text>
      ))}
    </View>
  );
}

// ─── 메인 컴포넌트 ───────────────────────────────────────────────────────────
export interface P1MarketDocumentProps {
  product: { id: string; name: string; ingredient: string };
  country: string;
  generatedAt: Date;
  marketReport: Report;
}

export function P1MarketDocument({
  product,
  country,
  generatedAt,
  marketReport,
}: P1MarketDocumentProps) {
  const data              = marketReport.report_data ?? {};
  const macroStats        = rec(data["macroStats"]);
  const therStats         = rec(data["therapeuticStats"]);
  const competitorPrices  = rec(data["competitorPrices"]);
  const competitorProducts = arr(data["competitorProducts"]);
  const citations          = arr(data["paperCitations"]);

  // 분석 데이터 (report_data 자체가 analysis 포함)
  const analysis = data;

  const dateStr = generatedAt.toLocaleDateString("ko-KR", {
    year: "numeric", month: "long", day: "numeric",
  });

  // HS 코드: therapeuticStats 또는 고정값
  const hsCode = str(therStats?.["hs_code"]) !== "-"
    ? str(therStats?.["hs_code"])
    : "3004.90";

  const therapeuticArea = str(
    rec(data["product"])?.["therapeutic_area"] ??
    therStats?.["therapeutic_area"]
  ) !== "-"
    ? str(rec(data["product"])?.["therapeutic_area"] ?? therStats?.["therapeutic_area"])
    : "Respiratory";

  return (
    <Document>
      <Page size="A4" style={S.page}>
        {/* ── 제목 헤더 ── */}
        <Text style={S.docTitle}>
          {country} 시장보고서 — {product.name}
        </Text>
        <Text style={S.docSubtitle}>
          {product.name} ({product.ingredient})  |  HS CODE: {hsCode}  |  {country}  |  {dateStr}
        </Text>

        {/* ── 섹션 1 ── */}
        <Section1
          macroStats={macroStats}
          therStats={therStats}
          analysis={analysis}
          product={{ therapeuticArea }}
        />

        {/* ── 섹션 2 ── */}
        <Section2 analysis={analysis} />

        {/* ── 섹션 3 ── */}
        <Section3
          competitorPrices={competitorPrices}
          competitorProducts={competitorProducts}
          analysis={analysis}
        />

        {/* ── 섹션 4 ── */}
        <Section4 analysis={analysis} />

        {/* ── 섹션 5 ── */}
        <Section5
          citations={citations}
          competitorProducts={competitorProducts}
        />

        {/* ── 푸터 ── */}
        <View style={S.footer} fixed>
          <Text style={S.footerLeft}>
            한국유나이티드제약(주) 해외 영업·마케팅 — {country} 시장조사 보고서
          </Text>
          <Text style={S.footerRight}>{dateStr}</Text>
        </View>
      </Page>
    </Document>
  );
}
