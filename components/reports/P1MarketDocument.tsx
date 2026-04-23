import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

import "@/lib/pdf/pdf-fonts";
import { pdfStyles, NAVY, GRAY_TEXT, GRAY_BORDER, GRAY_LABEL_BG } from "@/lib/pdf/pdf-styles";
import type { Report } from "@/src/types/report_session";

// ─── helpers ────────────────────────────────────────────────────────────────

function str(v: unknown, fallback = "-"): string {
  if (v === null || v === undefined || v === "") return fallback;
  if (typeof v === "string") return v.trim() === "" ? fallback : v.trim();
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "예" : "아니오";
  return fallback;
}

function arr(v: unknown): unknown[] {
  if (Array.isArray(v)) return v;
  return [];
}

function rec(v: unknown): Record<string, unknown> | null {
  if (v !== null && typeof v === "object" && !Array.isArray(v)) {
    return v as Record<string, unknown>;
  }
  return null;
}

// ─── local styles ────────────────────────────────────────────────────────────

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
  bodyText: {
    fontSize: 9,
    color: GRAY_TEXT,
    lineHeight: 1.55,
  },
  // two-column table
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
    flex: 1,
  },
  td: {
    padding: 5,
    fontSize: 8,
    color: GRAY_TEXT,
    flex: 1,
  },
  labelCell: {
    width: "28%",
    backgroundColor: GRAY_LABEL_BG,
    padding: 5,
    fontWeight: "bold",
    color: NAVY,
    fontSize: 8,
    borderRightWidth: 0.5,
    borderRightColor: GRAY_BORDER,
  },
  valueCell: {
    flex: 1,
    padding: 5,
    fontSize: 8,
    color: GRAY_TEXT,
  },
  // risk
  riskBox: {
    borderWidth: 1,
    borderColor: "#fbbf24",
    borderRadius: 3,
    backgroundColor: "#fffbeb",
    padding: 8,
    marginTop: 6,
    marginBottom: 8,
  },
  riskText: {
    fontSize: 8,
    color: "#92400e",
    lineHeight: 1.5,
  },
  // sources
  sourceItem: {
    flexDirection: "row",
    marginBottom: 3,
  },
  sourceBullet: {
    width: 10,
    fontSize: 8,
    color: NAVY,
    fontWeight: "bold",
  },
  sourceText: {
    flex: 1,
    fontSize: 8,
    color: GRAY_TEXT,
    lineHeight: 1.4,
  },
  // footer
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
  // tag badges
  badge: {
    borderWidth: 0.5,
    borderColor: NAVY,
    borderRadius: 2,
    paddingHorizontal: 5,
    paddingVertical: 2,
    marginRight: 4,
    marginBottom: 3,
  },
  badgeText: {
    fontSize: 7,
    color: NAVY,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 3,
  },
  // price table for section 3
  priceHeaderRow: {
    flexDirection: "row",
    backgroundColor: NAVY,
  },
  priceTh: {
    padding: 5,
    fontSize: 8,
    fontWeight: "bold",
    color: "#fff",
  },
  priceTd: {
    padding: 5,
    fontSize: 8,
    color: GRAY_TEXT,
  },
  priceColProduct: { width: "35%" },
  priceColVal: { width: "22%" },
  priceColSrc: { width: "21%" },
});

// ─── sub-components ───────────────────────────────────────────────────────────

function PageHeader({ product, country }: { product: string; country: string }) {
  return (
    <View style={S.pageHeader}>
      <Text style={S.pageHeaderTitle}>P1 시장보고서</Text>
      <Text style={S.pageHeaderSub}>
        {product} · {country.toUpperCase()}
      </Text>
    </View>
  );
}

function PageFooter({ page, total }: { page: number; total: number }) {
  return (
    <View style={S.footer}>
      <Text style={S.footerText}>한국유나이티드제약(주) · UPharma Export AI</Text>
      <Text style={S.footerText}>
        P1 시장보고서 {page}/{total}
      </Text>
    </View>
  );
}

/** 거시지표 테이블 */
function MacroTable({ data }: { data: Record<string, unknown> | null }) {
  const rows: Array<[string, string]> = [
    ["판단 등급", str(rec(data?.["judgment"])?.["grade"])],
    ["판단 근거", str(rec(data?.["judgment"])?.["reason"])],
    ["PanamaCompra 건수", str(data?.["panamacompraCount"])],
    ["민간소매 표본", str(data?.["privateRetailCount"])],
    ["WHO EML 등재", str(data?.["emlWho"])],
    ["PAHO EML 등재", str(data?.["emlPaho"])],
    ["MINSA EML 등재", str(data?.["emlMinsa"])],
    ["분석 유통사 수", str(data?.["distributorCount"])],
    ["매칭 유통사 수", str(data?.["matchedDistributorCount"])],
    ["거시지표 행 수", str(data?.["macroRowsCount"])],
    ["가격 데이터 행 수", str(data?.["priceRowsCount"])],
  ];

  return (
    <View style={S.table}>
      <View style={S.tableHeaderRow}>
        <Text style={[S.th, { width: "30%" }]}>지표</Text>
        <Text style={[S.th, { flex: 1 }]}>값</Text>
      </View>
      {rows.map(([label, value], i) => (
        <View
          key={label}
          style={[S.tableRow, i % 2 === 1 ? S.tableRowAlt : {}]}
        >
          <Text style={[S.td, { width: "30%", fontWeight: "bold", color: NAVY }]}>{label}</Text>
          <Text style={[S.td, { flex: 1 }]}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

/** 소스 집계 리스트 */
function SourceAggregation({ sourceAgg }: { sourceAgg: unknown[] }) {
  if (sourceAgg.length === 0) {
    return <Text style={S.bodyText}>출처 데이터 없음</Text>;
  }
  return (
    <View style={S.table}>
      <View style={S.tableHeaderRow}>
        <Text style={[S.th, { width: "40%" }]}>출처 (source)</Text>
        <Text style={[S.th, { width: "20%" }]}>건수</Text>
        <Text style={[S.th, { flex: 1 }]}>비고</Text>
      </View>
      {sourceAgg.map((row, i) => {
        const r = rec(row);
        return (
          <View key={i} style={[S.tableRow, i % 2 === 1 ? S.tableRowAlt : {}]}>
            <Text style={[S.td, { width: "40%" }]}>{str(r?.["pa_source"])}</Text>
            <Text style={[S.td, { width: "20%" }]}>{str(r?.["count"])}</Text>
            <Text style={[S.td, { flex: 1 }]}>{str(r?.["note"])}</Text>
          </View>
        );
      })}
    </View>
  );
}

// ─── main component ──────────────────────────────────────────────────────────

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
  const d = marketReport.report_data;
  const sourceAgg = arr(d?.["sourceAggregation"]);
  const when = generatedAt.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const judgmentRec = rec(d?.["judgment"]);
  const productRec = rec(d?.["product"]);

  return (
    <Document title={`P1 시장보고서 — ${product.name}`} language="ko">
      {/* ── Page 1 : 거시환경 + 무역/규제 ── */}
      <Page size="A4" style={S.page}>
        <PageHeader product={product.name} country={country} />

        {/* 1. 의료 거시환경 파악 */}
        <Text style={S.sectionTitle}>1. 의료 거시환경 파악</Text>

        <MacroTable data={d} />

        {judgmentRec && (
          <View style={{ marginTop: 6 }}>
            <Text style={[S.bodyText, { fontWeight: "bold", color: NAVY, marginBottom: 2 }]}>
              종합 판단
            </Text>
            <Text style={S.bodyText}>{str(judgmentRec["reason"])}</Text>
          </View>
        )}

        {productRec && (
          <View style={{ marginTop: 10 }}>
            <Text style={[S.bodyText, { fontWeight: "bold", color: NAVY, marginBottom: 4 }]}>
              제품 정보
            </Text>
            <View style={S.table}>
              {[
                ["제품명 (한글)", str(productRec["kr_brand_name"])],
                ["WHO INN", str(productRec["who_inn_en"])],
                ["ATC4 코드", str(productRec["atc4_code"])],
                ["제형", str(productRec["dosage_form"])],
                ["함량", str(productRec["strength"])],
              ].map(([lbl, val], i) => (
                <View key={lbl} style={[S.tableRow, i === 0 ? { borderTopWidth: 0 } : {}, i % 2 === 1 ? S.tableRowAlt : {}]}>
                  <Text style={[S.td, { width: "30%", fontWeight: "bold", color: NAVY }]}>{lbl}</Text>
                  <Text style={[S.td, { flex: 1 }]}>{val}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 2. 무역/규제 환경 */}
        <Text style={S.sectionTitle}>2. 무역/규제 환경</Text>
        <View style={S.table}>
          {[
            ["WHO EML 등재", str(d?.["emlWho"])],
            ["PAHO EML 등재", str(d?.["emlPaho"])],
            ["MINSA EML 등재", str(d?.["emlMinsa"])],
            ["PanamaCompra 등록 건수", str(d?.["panamacompraCount"])],
            ["민간 소매가 표본 수", str(d?.["privateRetailCount"])],
            ["공공·유통 채널 분류 수", str(d?.["distributorCount"])],
            ["매칭 유통사 수", str(d?.["matchedDistributorCount"])],
          ].map(([lbl, val], i) => (
            <View key={lbl} style={[S.tableRow, i === 0 ? { borderTopWidth: 0 } : {}, i % 2 === 1 ? S.tableRowAlt : {}]}>
              <Text style={[S.td, { width: "38%", fontWeight: "bold", color: NAVY }]}>{lbl}</Text>
              <Text style={[S.td, { flex: 1 }]}>{val}</Text>
            </View>
          ))}
        </View>

        <PageFooter page={1} total={2} />
      </Page>

      {/* ── Page 2 : 참고 가격 + 리스크 + 근거 출처 ── */}
      <Page size="A4" style={S.page}>
        <PageHeader product={product.name} country={country} />

        {/* 3. 참고 가격 */}
        <Text style={S.sectionTitle}>3. 참고 가격</Text>
        <View style={S.table}>
          <View style={S.tableHeaderRow}>
            <Text style={[S.th, { width: "35%" }]}>채널</Text>
            <Text style={[S.th, { width: "20%" }]}>건수</Text>
            <Text style={[S.th, { flex: 1 }]}>비고</Text>
          </View>
          <View style={S.tableRow}>
            <Text style={[S.td, { width: "35%" }]}>PanamaCompra (공공조달)</Text>
            <Text style={[S.td, { width: "20%" }]}>{str(d?.["panamacompraCount"])}</Text>
            <Text style={[S.td, { flex: 1 }]}>DGCP Ley 419 de 2024</Text>
          </View>
          <View style={[S.tableRow, S.tableRowAlt]}>
            <Text style={[S.td, { width: "35%" }]}>ACODECO CABAMED (민간)</Text>
            <Text style={[S.td, { width: "20%" }]}>{str(d?.["privateRetailCount"])}</Text>
            <Text style={[S.td, { flex: 1 }]}>소매 약국 규제가</Text>
          </View>
        </View>

        {/* 4. 리스크/조건 */}
        <Text style={S.sectionTitle}>4. 리스크/조건</Text>
        <View style={S.riskBox}>
          <Text style={S.riskText}>
            {str(
              judgmentRec?.["risk"] ?? judgmentRec?.["condition"] ?? judgmentRec?.["note"],
              "※ 파나마 공공조달 낙찰가는 제품별·연도별 편차가 크며, 현지 파트너 확보 여부가 진입 핵심 조건입니다. " +
              "EML 등재 여부, 관세(일반 0~10%), ITBMS 부가세(7%) 적용 조건을 반드시 사전 확인하십시오.",
            )}
          </Text>
        </View>

        {/* 5. 근거 및 출처 */}
        <Text style={S.sectionTitle}>5. 근거 및 출처</Text>

        <Text style={[S.bodyText, { fontWeight: "bold", color: NAVY, marginBottom: 4 }]}>
          DB/기관 데이터 출처
        </Text>
        {sourceAgg.length > 0 ? (
          <SourceAggregation sourceAgg={sourceAgg} />
        ) : (
          <View style={S.table}>
            {[
              ["PanamaCompra V3", "파나마 조달청 (DGCP) 공공입찰 낙찰 데이터"],
              ["ACODECO CABAMED", "파나마 소비자보호청 민간 소매 규제가"],
              ["WHO EML", "WHO 필수의약품 목록"],
              ["PAHO EML", "PAHO 중남미 필수의약품 목록"],
              ["MINSA EML", "파나마 보건부 필수의약품 목록"],
            ].map(([src, desc], i) => (
              <View key={src} style={[S.tableRow, i === 0 ? { borderTopWidth: 0 } : {}, i % 2 === 1 ? S.tableRowAlt : {}]}>
                <Text style={[S.td, { width: "32%", fontWeight: "bold", color: NAVY }]}>{src}</Text>
                <Text style={[S.td, { flex: 1 }]}>{desc}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={[S.bodyText, { fontWeight: "bold", color: NAVY, marginTop: 8, marginBottom: 4 }]}>
          생성 정보
        </Text>
        <View style={S.table}>
          {[
            ["보고서 생성일", when],
            ["세션 ID", marketReport.session_id],
            ["보고서 ID", marketReport.id],
          ].map(([lbl, val], i) => (
            <View key={lbl} style={[S.tableRow, i === 0 ? { borderTopWidth: 0 } : {}, i % 2 === 1 ? S.tableRowAlt : {}]}>
              <Text style={[S.td, { width: "30%", fontWeight: "bold", color: NAVY }]}>{lbl}</Text>
              <Text style={[S.td, { flex: 1 }]}>{val}</Text>
            </View>
          ))}
        </View>

        <PageFooter page={2} total={2} />
      </Page>
    </Document>
  );
}
