import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

import "@/lib/pdf/pdf-fonts";
import { pdfStyles } from "@/lib/pdf/pdf-styles";
import type { Report } from "@/src/types/report_session";

const local = StyleSheet.create({
  sectionTitle: { fontSize: 14, fontWeight: 700, marginBottom: 8 },
  subTitle: { fontSize: 11, fontWeight: 600, marginTop: 10, marginBottom: 4 },
  body: { fontSize: 9, lineHeight: 1.4 },
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

/**
 * 결합 PDF — 섹션 번호·명칭은 "공정" 표현 없이 지시서 표기 준수
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

      <Page size="A4" style={pdfStyles.page}>
        <Text style={local.sectionTitle}>부록 · 메타데이터</Text>
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
