import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

import "@/lib/pdf/pdf-fonts";
import { NAVY, GRAY_TEXT, GRAY_BORDER, GRAY_LABEL_BG } from "@/lib/pdf/pdf-styles";
import type { Report } from "@/src/types/report_session";

const KRW_PER_USD = 1473.1;

// ─── helpers ─────────────────────────────────────────────────────────────────

function str(v: unknown, fallback = "-"): string {
  if (v === null || v === undefined) return fallback;
  if (typeof v === "string") return v.trim() === "" ? fallback : v.trim();
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : fallback;
  if (typeof v === "boolean") return v ? "예" : "아니오";
  return fallback;
}

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return null;
}

function rec(v: unknown): Record<string, unknown> | null {
  if (v !== null && typeof v === "object" && !Array.isArray(v)) {
    return v as Record<string, unknown>;
  }
  return null;
}

function arr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function fmtPab(v: number): string {
  return `B/. ${v.toFixed(2)}`;
}

function fmtUsd(v: number): string {
  return `$ ${v.toFixed(2)}`;
}

function fmtKrw(usd: number): string {
  return new Intl.NumberFormat("ko-KR").format(Math.round(usd * KRW_PER_USD)) + " 원";
}

function fmtPct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

// ─── local styles ─────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 36,
    paddingVertical: 32,
    fontFamily: "NotoSansKR",
    fontSize: 9,
    color: GRAY_TEXT,
  },
  pageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: NAVY,
    paddingBottom: 6,
    marginBottom: 14,
  },
  pageHeaderTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: NAVY,
  },
  pageHeaderSub: {
    fontSize: 8,
    color: GRAY_TEXT,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: NAVY,
    marginTop: 14,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: GRAY_BORDER,
  },
  subSectionTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: NAVY,
    marginTop: 10,
    marginBottom: 5,
  },
  bodyText: {
    fontSize: 9,
    color: GRAY_TEXT,
    lineHeight: 1.55,
  },
  table: {
    borderWidth: 1,
    borderColor: GRAY_BORDER,
    marginBottom: 8,
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: NAVY,
  },
  tableRow: {
    flexDirection: "row",
    borderTopWidth: 0.5,
    borderTopColor: GRAY_BORDER,
  },
  tableRowAlt: {
    backgroundColor: "#f7fafc",
  },
  th: {
    padding: 5,
    fontSize: 8,
    fontWeight: "bold",
    color: "#fff",
  },
  td: {
    padding: 5,
    fontSize: 8,
    color: GRAY_TEXT,
  },
  // scenario card
  scenarioCard: {
    borderWidth: 1,
    borderColor: GRAY_BORDER,
    borderRadius: 3,
    marginBottom: 8,
    overflow: "hidden",
  },
  scenarioCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: NAVY,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  scenarioCardHeaderText: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#fff",
  },
  scenarioCardBody: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  scenarioRow: {
    flexDirection: "row",
    marginBottom: 3,
  },
  scenarioLabel: {
    width: "28%",
    fontSize: 8,
    fontWeight: "bold",
    color: NAVY,
  },
  scenarioValue: {
    flex: 1,
    fontSize: 8,
    color: GRAY_TEXT,
  },
  disclaimer: {
    marginTop: 10,
    padding: 8,
    backgroundColor: "#fffbeb",
    borderWidth: 0.5,
    borderColor: "#fbbf24",
    borderRadius: 3,
    fontSize: 8,
    lineHeight: 1.5,
    color: "#92400e",
  },
  footer: {
    marginTop: "auto",
    paddingTop: 6,
    borderTopWidth: 0.5,
    borderTopColor: GRAY_BORDER,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: {
    fontSize: 7,
    color: GRAY_TEXT,
  },
  summaryBox: {
    backgroundColor: "#f0f4f8",
    borderRadius: 3,
    padding: 8,
    marginBottom: 10,
  },
  summaryText: {
    fontSize: 9,
    color: GRAY_TEXT,
    lineHeight: 1.5,
  },
});

// ─── sub-components ───────────────────────────────────────────────────────────

function PageHeader({ product, country, segment }: { product: string; country: string; segment: string }) {
  return (
    <View style={S.pageHeader}>
      <Text style={S.pageHeaderTitle}>P2 수출가격전략 보고서</Text>
      <Text style={S.pageHeaderSub}>
        {product} · {country.toUpperCase()} · {segment}
      </Text>
    </View>
  );
}

function PageFooter({ page, total }: { page: number; total: number }) {
  return (
    <View style={S.footer}>
      <Text style={S.footerText}>한국유나이티드제약(주) · UPharma Export AI</Text>
      <Text style={S.footerText}>P2 수출가격전략 {page}/{total}</Text>
    </View>
  );
}

/** 단가(시장 기준가) 테이블 */
function UnitPriceTable({ marketResult }: { marketResult: Record<string, unknown> | null }) {
  if (marketResult === null) {
    return <Text style={S.bodyText}>가격 데이터 없음</Text>;
  }

  const scenarios = rec(marketResult["scenarios"]);
  if (scenarios === null) {
    return <Text style={S.bodyText}>시나리오 데이터 없음</Text>;
  }

  const rows = [
    { key: "agg",  label: "저가진입", desc: "시장 점유율 확보 인하 전략" },
    { key: "avg",  label: "기준가",   desc: "시장 허용 FOB 균형 전략" },
    { key: "cons", label: "프리미엄", desc: "기술 프리미엄 반영 전략" },
  ] as const;

  return (
    <View style={S.table}>
      <View style={S.tableHeaderRow}>
        <Text style={[S.th, { width: "18%" }]}>구분</Text>
        <Text style={[S.th, { width: "22%" }]}>기준가격 (PAB)</Text>
        <Text style={[S.th, { width: "20%" }]}>USD</Text>
        <Text style={[S.th, { width: "22%" }]}>KRW</Text>
        <Text style={[S.th, { flex: 1 }]}>산정방식</Text>
      </View>
      {rows.map(({ key, label, desc }, i) => {
        const sc = rec(scenarios[key]);
        const pab = num(sc?.["price_pab"]);
        const usd = num(sc?.["price_usd"]);
        const mk  = num(sc?.["markdown_rate"]);
        return (
          <View key={key} style={[S.tableRow, i % 2 === 1 ? S.tableRowAlt : {}]}>
            <Text style={[S.td, { width: "18%", fontWeight: "bold", color: NAVY }]}>{label}</Text>
            <Text style={[S.td, { width: "22%" }]}>{pab !== null ? fmtPab(pab) : "-"}</Text>
            <Text style={[S.td, { width: "20%" }]}>{usd !== null ? fmtUsd(usd) : "-"}</Text>
            <Text style={[S.td, { width: "22%" }]}>{usd !== null ? fmtKrw(usd) : "-"}</Text>
            <Text style={[S.td, { flex: 1 }]}>
              {desc}{mk !== null ? ` (천장가 ${fmtPct(mk)})` : ""}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/** 거래처 참고 가격 테이블 (competitorPrices) */
function CompetitorPriceTable({ competitorPrices }: { competitorPrices: Record<string, unknown> | null }) {
  if (competitorPrices === null) {
    return <Text style={S.bodyText}>경쟁사 가격 데이터 없음</Text>;
  }

  const pub = rec(competitorPrices["publicProcurement"]);
  const priv = rec(competitorPrices["privateRetail"]);
  const retail = rec(competitorPrices["retailChain"]);

  const rows = [
    { label: "공공조달 (PanamaCompra)", data: pub },
    { label: "ACODECO 소비자 모니터링", data: priv },
    { label: "SuperXtra 약국 체인 소매가", data: retail },
  ];

  return (
    <View style={S.table}>
      <View style={S.tableHeaderRow}>
        <Text style={[S.th, { width: "35%" }]}>채널</Text>
        <Text style={[S.th, { width: "15%" }]}>평균 (PAB)</Text>
        <Text style={[S.th, { width: "15%" }]}>최저 (PAB)</Text>
        <Text style={[S.th, { width: "15%" }]}>최고 (PAB)</Text>
        <Text style={[S.th, { width: "10%" }]}>건수</Text>
        <Text style={[S.th, { flex: 1 }]}>출처</Text>
      </View>
      {rows.map(({ label, data }, i) => {
        const avg = num(data?.["avg"]);
        const min = num(data?.["min"]);
        const max = num(data?.["max"]);
        const cnt = num(data?.["count"]);
        return (
          <View key={label} style={[S.tableRow, i % 2 === 1 ? S.tableRowAlt : {}]}>
            <Text style={[S.td, { width: "35%" }]}>{label}</Text>
            <Text style={[S.td, { width: "15%" }]}>{avg !== null ? avg.toFixed(2) : "-"}</Text>
            <Text style={[S.td, { width: "15%" }]}>{min !== null ? min.toFixed(2) : "-"}</Text>
            <Text style={[S.td, { width: "15%" }]}>{max !== null ? max.toFixed(2) : "-"}</Text>
            <Text style={[S.td, { width: "10%" }]}>{cnt !== null ? String(cnt) : "-"}</Text>
            <Text style={[S.td, { flex: 1 }]}>{str(data?.["source"])}</Text>
          </View>
        );
      })}
    </View>
  );
}

/** 가격 시나리오 카드 — 공공/민간 각각 표시 */
function ScenarioCards({
  marketResult,
  segment,
}: {
  marketResult: Record<string, unknown> | null;
  segment: "public" | "private";
}) {
  if (marketResult === null) {
    return <Text style={S.bodyText}>시나리오 데이터 없음</Text>;
  }

  const scenarios = rec(marketResult["scenarios"]);
  const logic = str(marketResult["logic"]);
  const formula = str(marketResult["formula"]);

  const scenarioDefs = [
    { key: "agg",  label: "저가진입",  color: "#16a34a" },
    { key: "avg",  label: "기준가",    color: NAVY },
    { key: "cons", label: "프리미엄",  color: "#9333ea" },
  ] as const;

  return (
    <View>
      <View style={[S.summaryBox, { marginBottom: 8 }]}>
        <Text style={[S.bodyText, { fontWeight: "bold", color: NAVY, marginBottom: 2 }]}>
          {segment === "public" ? "공공시장" : "민간시장"} FOB 역산 공식
        </Text>
        <Text style={S.summaryText}>{formula}</Text>
        <Text style={[S.summaryText, { marginTop: 2 }]}>{logic}</Text>
      </View>

      {scenarioDefs.map(({ key, label }) => {
        const sc = rec(scenarios?.[key]);
        const pab = num(sc?.["price_pab"]);
        const usd = num(sc?.["price_usd"]);
        const mk  = num(sc?.["markdown_rate"]);
        const basis = str(sc?.["basis"]);
        const calc  = str(sc?.["calculation"]);

        return (
          <View key={key} style={S.scenarioCard}>
            <View style={S.scenarioCardHeader}>
              <Text style={S.scenarioCardHeaderText}>
                {segment === "public" ? "공공시장" : "민간시장"} — {label}
              </Text>
              <Text style={S.scenarioCardHeaderText}>
                {pab !== null ? fmtPab(pab) : "-"} / {usd !== null ? fmtUsd(usd) : "-"}
              </Text>
            </View>
            <View style={S.scenarioCardBody}>
              <View style={S.scenarioRow}>
                <Text style={S.scenarioLabel}>KRW 환산</Text>
                <Text style={S.scenarioValue}>{usd !== null ? fmtKrw(usd) : "-"}</Text>
              </View>
              <View style={S.scenarioRow}>
                <Text style={S.scenarioLabel}>천장가 대비</Text>
                <Text style={S.scenarioValue}>{mk !== null ? fmtPct(mk) : "-"}</Text>
              </View>
              <View style={S.scenarioRow}>
                <Text style={S.scenarioLabel}>근거</Text>
                <Text style={S.scenarioValue}>{basis}</Text>
              </View>
              <View style={S.scenarioRow}>
                <Text style={S.scenarioLabel}>FOB 역산식</Text>
                <Text style={S.scenarioValue}>{calc}</Text>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export interface P2PricingDocumentProps {
  product: { id: string; name: string; ingredient: string };
  country: string;
  generatedAt: Date;
  publicPricingReport: Report;
  privatePricingReport: Report;
}

export function P2PricingDocument({
  product,
  country,
  generatedAt,
  publicPricingReport,
  privatePricingReport,
}: P2PricingDocumentProps) {
  const pubData = publicPricingReport.report_data;
  const privData = privatePricingReport.report_data;

  const pubMarket = rec(pubData?.["marketResult"]);
  const privMarket = rec(privData?.["marketResult"]);
  const pubCompetitor = rec(pubData?.["competitorPrices"]);
  const privCompetitor = rec(privData?.["competitorPrices"]);
  const pubPhase2 = rec(pubData?.["phase2Report"]);
  const privPhase2 = rec(privData?.["phase2Report"]);

  const when = generatedAt.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Document title={`P2 수출가격전략 — ${product.name}`} language="ko">
      {/* ── Page 1 : 거시 시장 요약 + 단가 테이블 ── */}
      <Page size="A4" style={S.page}>
        <PageHeader product={product.name} country={country} segment="공공+민간" />

        {/* 1. 거시 시장 요약 */}
        <Text style={S.sectionTitle}>1. 거시 시장 요약</Text>
        <View style={S.summaryBox}>
          <Text style={S.summaryText}>
            {str(
              pubPhase2?.["block1_input_summary"] ??
              privPhase2?.["block1_input_summary"],
              `${product.name}(${product.ingredient}) 파나마 ${country.toUpperCase()} 시장 수출가격 전략 보고서입니다. ` +
              "공공조달(ALPS/PanamaCompra) 및 민간소매(ACODECO CABAMED) 채널의 FOB 역산 시나리오를 분석합니다.",
            )}
          </Text>
        </View>

        {/* 2. 단가(시장 기준가) 테이블 */}
        <Text style={S.sectionTitle}>2. 단가(시장 기준가) 테이블</Text>
        <Text style={S.subSectionTitle}>공공시장 (ALPS/PanamaCompra 기준)</Text>
        <UnitPriceTable marketResult={pubMarket} />

        <Text style={S.subSectionTitle}>민간시장 (ACODECO CABAMED 기준)</Text>
        <UnitPriceTable marketResult={privMarket} />

        {/* 3. 거래처 참고 가격 테이블 */}
        <Text style={S.sectionTitle}>3. 거래처 참고 가격 테이블</Text>
        <CompetitorPriceTable competitorPrices={pubCompetitor ?? privCompetitor} />

        <PageFooter page={1} total={3} />
      </Page>

      {/* ── Page 2 : 공공시장 가격 시나리오 ── */}
      <Page size="A4" style={S.page}>
        <PageHeader product={product.name} country={country} segment="공공시장" />

        {/* 4-1. 공공시장 가격 시나리오 */}
        <Text style={S.sectionTitle}>4. 가격 시나리오 — 공공시장</Text>
        <ScenarioCards marketResult={pubMarket} segment="public" />

        {pubPhase2 !== null && (
          <View style={{ marginTop: 10 }}>
            <Text style={[S.bodyText, { fontWeight: "bold", color: NAVY, marginBottom: 4 }]}>
              FOB 역산 계산 근거
            </Text>
            <Text style={S.bodyText}>{str(pubPhase2["block2_fob_calculation"])}</Text>
            {pubPhase2["block4_incoterms"] != null && (
              <View style={{ marginTop: 6 }}>
                <Text style={[S.bodyText, { fontWeight: "bold", color: NAVY, marginBottom: 2 }]}>
                  Incoterms 순산 (FOB → CFR → CIF → DDP)
                </Text>
                <Text style={S.bodyText}>{str(pubPhase2["block4_incoterms"])}</Text>
              </View>
            )}
            {pubPhase2["block5_risk_and_recommendation"] != null && (
              <View style={{ marginTop: 6 }}>
                <Text style={[S.bodyText, { fontWeight: "bold", color: NAVY, marginBottom: 2 }]}>
                  리스크 및 권고
                </Text>
                <Text style={S.bodyText}>{str(pubPhase2["block5_risk_and_recommendation"])}</Text>
              </View>
            )}
          </View>
        )}

        <PageFooter page={2} total={3} />
      </Page>

      {/* ── Page 3 : 민간시장 가격 시나리오 + 면책 ── */}
      <Page size="A4" style={S.page}>
        <PageHeader product={product.name} country={country} segment="민간시장" />

        {/* 4-2. 민간시장 가격 시나리오 */}
        <Text style={S.sectionTitle}>4. 가격 시나리오 — 민간시장</Text>
        <ScenarioCards marketResult={privMarket} segment="private" />

        {privPhase2 !== null && (
          <View style={{ marginTop: 10 }}>
            <Text style={[S.bodyText, { fontWeight: "bold", color: NAVY, marginBottom: 4 }]}>
              FOB 역산 계산 근거
            </Text>
            <Text style={S.bodyText}>{str(privPhase2["block2_fob_calculation"])}</Text>
            {privPhase2["block4_incoterms"] != null && (
              <View style={{ marginTop: 6 }}>
                <Text style={[S.bodyText, { fontWeight: "bold", color: NAVY, marginBottom: 2 }]}>
                  Incoterms 순산
                </Text>
                <Text style={S.bodyText}>{str(privPhase2["block4_incoterms"])}</Text>
              </View>
            )}
            {privPhase2["block5_risk_and_recommendation"] != null && (
              <View style={{ marginTop: 6 }}>
                <Text style={[S.bodyText, { fontWeight: "bold", color: NAVY, marginBottom: 2 }]}>
                  리스크 및 권고
                </Text>
                <Text style={S.bodyText}>{str(privPhase2["block5_risk_and_recommendation"])}</Text>
              </View>
            )}
          </View>
        )}

        {/* 5. 면책 문구 */}
        <Text style={S.sectionTitle}>5. 면책 문구</Text>
        <View style={S.disclaimer}>
          <Text>
            ※ 본 보고서의 수출가격 시나리오는 공공·민간 유통채널의 FOB 역산 시뮬레이션 결과입니다.
            실제 계약가·낙찰가와 다를 수 있으며, 현지 규제·환율·물류비 변동에 따라 수정이 필요할 수 있습니다.
          </Text>
          <Text style={{ marginTop: 4 }}>
            KRW 환산 기준: 1 USD = {KRW_PER_USD.toFixed(1)} 원 (보고서 생성 기준 환율)
          </Text>
          <Text style={{ marginTop: 4 }}>
            ※ 최종 수출가 결정 전 현지 파트너 및 규제 당국과 반드시 검토하십시오.
          </Text>
          <Text style={{ marginTop: 4 }}>
            보고서 생성일: {when} | 세션: {publicPricingReport.session_id}
          </Text>
        </View>

        <PageFooter page={3} total={3} />
      </Page>
    </Document>
  );
}
