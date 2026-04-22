import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

import "@/lib/pdf/pdf-fonts";
import { pdfStyles } from "@/lib/pdf/pdf-styles";
import type { Report } from "@/src/types/report_session";

const KRW_PER_USD = 1473.1;

const local = StyleSheet.create({
  sectionTitle: { fontSize: 14, fontWeight: 700, marginBottom: 8 },
  subTitle: { fontSize: 11, fontWeight: 600, marginTop: 10, marginBottom: 4 },
  body: { fontSize: 9, lineHeight: 1.4 },
  // 가격 테이블
  tableWrap: { marginTop: 10 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#273f60",
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 3,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: "#d9e2ef",
  },
  tableRowAlt: { backgroundColor: "#f7fafc" },
  colLabel: { width: "22%", fontSize: 8, fontWeight: 600 },
  colPab: { width: "20%", fontSize: 8, textAlign: "right" },
  colUsd: { width: "20%", fontSize: 8, textAlign: "right" },
  colKrw: { width: "23%", fontSize: 8, textAlign: "right" },
  colMk: { width: "15%", fontSize: 8, textAlign: "right" },
  headerText: { color: "#fff", fontSize: 8, fontWeight: 700 },
  disclaimer: {
    marginTop: 10,
    padding: 6,
    backgroundColor: "#fffbeb",
    borderWidth: 0.5,
    borderColor: "#fbbf24",
    borderRadius: 3,
    fontSize: 8,
    lineHeight: 1.4,
    color: "#92400e",
  },
});

export interface CombinedReportDocumentProps {
  product: { id: string; name: string; ingredient: string };
  country: string;
  generatedAt: Date;
  marketReport: Report;
  publicPricingReport: Report;
  privatePricingReport: Report;
  partnerReport: Report;
}

function previewJson(label: string, data: Record<string, unknown> | null): string {
  if (data === null) {
    return `${label}: (데이터 없음)`;
  }
  try {
    const s = JSON.stringify(data);
    return `${label}: ${s.length > 1200 ? `${s.slice(0, 1200)}…` : s}`;
  } catch {
    return `${label}: [직렬화 불가]`;
  }
}

function fmtKrw(usd: number): string {
  return new Intl.NumberFormat("ko-KR").format(Math.round(usd * KRW_PER_USD)) + " 원";
}

/** report_data에서 시나리오 행 추출 */
function extractScenarios(
  data: Record<string, unknown> | null,
): { label: string; pab: number; usd: number; mkRate: number }[] {
  if (data === null) return [];
  try {
    const mr = (data["marketResult"] as Record<string, unknown> | null) ?? null;
    if (mr === null) return [];
    const sc = (mr["scenarios"] as Record<string, Record<string, unknown>> | null) ?? null;
    if (sc === null) return [];

    return [
      { key: "aggressive", label: "저가(공격)" },
      { key: "average",    label: "기준(평균)" },
      { key: "conservative", label: "프리미엄(보수)" },
    ]
      .map(({ key, label }) => {
        const row = sc[key] ?? {};
        const usd = typeof row["price_usd"] === "number" ? row["price_usd"] : null;
        const pab = typeof row["price_pab"] === "number" ? row["price_pab"] : null;
        const mk  = typeof row["markdown_rate"] === "number" ? row["markdown_rate"] : 0;
        if (usd === null || pab === null) return null;
        return { label, pab, usd, mkRate: mk };
      })
      .filter((x): x is { label: string; pab: number; usd: number; mkRate: number } => x !== null);
  } catch {
    return [];
  }
}

/** USD/KRW 병기 가격 테이블 (Phase 1) */
function PriceTable({
  segment,
  data,
}: {
  segment: string;
  data: Record<string, unknown> | null;
}) {
  const rows = extractScenarios(data);
  if (rows.length === 0) {
    return (
      <Text style={local.body}>{segment}: 가격 데이터 없음</Text>
    );
  }

  return (
    <View style={local.tableWrap}>
      {/* 헤더 */}
      <View style={local.tableHeader}>
        <Text style={{ ...local.colLabel, ...local.headerText }}>{segment}</Text>
        <Text style={{ ...local.colPab, ...local.headerText }}>PAB</Text>
        <Text style={{ ...local.colUsd, ...local.headerText }}>USD</Text>
        <Text style={{ ...local.colKrw, ...local.headerText }}>KRW (원)</Text>
        <Text style={{ ...local.colMk, ...local.headerText }}>천장가%</Text>
      </View>

      {rows.map((r, i) => (
        <View
          key={r.label}
          style={[local.tableRow, i % 2 === 1 ? local.tableRowAlt : {}]}
        >
          <Text style={local.colLabel}>{r.label}</Text>
          <Text style={local.colPab}>{r.pab.toFixed(2)}</Text>
          <Text style={local.colUsd}>{r.usd.toFixed(2)}</Text>
          <Text style={local.colKrw}>{fmtKrw(r.usd)}</Text>
          <Text style={local.colMk}>{(r.mkRate * 100).toFixed(1)}%</Text>
        </View>
      ))}

      {/* 면책 문구 */}
      <Text style={local.disclaimer}>
        ※ 상기 가격은 FOB 역산 시뮬레이션 결과입니다. 실제 계약가·낙찰가와 다를 수 있습니다.
        KRW 환산: 1 USD = {KRW_PER_USD.toFixed(1)} 원 (보고서 기준 환율). 최종 가격 결정 전 현지 파트너와 검토하십시오.
      </Text>
    </View>
  );
}

/**
 * 결합 PDF — 섹션 번호·명칭은 "공정" 표현 없이 지시서 표기 준수
 * Phase 1: 부록 가격 테이블에 PAB · USD · KRW 3열 병기
 */
export function CombinedReportDocument(props: CombinedReportDocumentProps) {
  const when = props.generatedAt.toISOString().slice(0, 19).replace("T", " ");

  return (
    <Document
      title={`UPharma Export AI — ${props.product.name}`}
      author="UPharma Export AI"
      language="ko"
    >
      <Page size="A4" style={pdfStyles.page}>
        <Text style={pdfStyles.titleBar}>UPharma Export AI — 파나마 통합 보고서</Text>
        <Text style={pdfStyles.subTitle}>
          {props.product.name} · {props.product.ingredient} | {props.country.toUpperCase()} | {when}
        </Text>
        <View style={{ marginTop: 16 }}>
          <Text style={local.sectionTitle}>표지 · 요약</Text>
          <Text style={local.body}>
            본 문서는 시장조사 분석, 수출가격 전략(공공·민간), 파트너 발굴 및 매칭 결과를 하나의 PDF로
            묶은 것입니다. 상세 수치는 각 단계별 보고서 JSON을 참고하세요.
          </Text>
        </View>
      </Page>

      <Page size="A4" style={pdfStyles.page}>
        <Text style={local.sectionTitle}>1. 시장조사 분석</Text>
        <Text style={local.body} wrap>
          {previewJson("시장조사", props.marketReport.report_data)}
        </Text>
      </Page>

      <Page size="A4" style={pdfStyles.page}>
        <Text style={local.sectionTitle}>2. 수출가격 전략</Text>
        <Text style={local.subTitle}>2-1. 공공 시장 (ALPS 조달청 기준)</Text>
        <Text style={local.body} wrap>
          {previewJson("공공", props.publicPricingReport.report_data)}
        </Text>
        <Text style={local.subTitle}>2-2. 민간 시장 (병원·약국·체인)</Text>
        <Text style={local.body} wrap>
          {previewJson("민간", props.privatePricingReport.report_data)}
        </Text>
      </Page>

      <Page size="A4" style={pdfStyles.page}>
        <Text style={local.sectionTitle}>3. 파트너 발굴 및 매칭</Text>
        <Text style={local.body} wrap>
          {previewJson("파트너", props.partnerReport.report_data)}
        </Text>
      </Page>

      {/* 부록 — USD/KRW 병기 가격 테이블 (Phase 1) */}
      <Page size="A4" style={pdfStyles.page}>
        <Text style={local.sectionTitle}>부록 A — 수출가격 요약 테이블 (PAB · USD · KRW)</Text>
        <Text style={{ ...local.body, marginBottom: 6, color: "#4a5a6f" }}>
          FOB 역산 시나리오별 가격을 PAB · USD · KRW 3개 통화로 병기합니다.
          환율: 1 USD = {KRW_PER_USD.toFixed(1)} 원 (보고서 기준).
        </Text>

        <Text style={local.subTitle}>공공 시장 (ALPS 조달청)</Text>
        <PriceTable
          segment="공공"
          data={props.publicPricingReport.report_data}
        />

        <Text style={local.subTitle}>민간 시장 (병원·약국·체인)</Text>
        <PriceTable
          segment="민간"
          data={props.privatePricingReport.report_data}
        />
      </Page>

      <Page size="A4" style={pdfStyles.page}>
        <Text style={local.sectionTitle}>부록 B — 메타데이터</Text>
        <Text style={local.body} wrap>
          {previewJson("시장조사 메타", props.marketReport.metadata)}
        </Text>
        <Text style={{ ...local.body, marginTop: 8 }} wrap>
          {previewJson("가격(공공) 메타", props.publicPricingReport.metadata)}
        </Text>
        <Text style={{ ...local.body, marginTop: 8 }} wrap>
          {previewJson("파트너 메타", props.partnerReport.metadata)}
        </Text>
      </Page>
    </Document>
  );
}
