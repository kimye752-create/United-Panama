import React from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import type { Report1PayloadV3 } from "@/src/llm/report1_schema";

import "./pdf-fonts";

export interface Report1PdfV3Props {
  brandName: string;
  innEn: string;
  hsCode: string;
  caseGrade: string;
  caseVerdict: string;
  confidence: number;
  payload: Report1PayloadV3;
  collectedAt?: string;
}

const styles = StyleSheet.create({
  page: { padding: 32, fontFamily: "NotoSansKR", fontSize: 9, color: "#1f2937" },
  header: {
    marginBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: "#1f3e64",
    paddingBottom: 6,
  },
  title: { fontSize: 14, fontWeight: "bold", color: "#1f3e64", textAlign: "center" },
  subTitle: { marginTop: 4, fontSize: 9, textAlign: "center", color: "#4b5563" },
  metaBar: {
    marginTop: 8,
    backgroundColor: "#1f3e64",
    color: "#ffffff",
    padding: 6,
    fontSize: 9,
    fontWeight: "bold",
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 12,
    marginBottom: 6,
    color: "#1f3e64",
  },
  verdictCard: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#f8fafc",
    padding: 8,
  },
  verdictText: { fontSize: 10, fontWeight: "bold", color: "#0f172a" },
  categoryBlock: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    padding: 8,
    marginBottom: 4,
  },
  categoryTitle: { fontSize: 10, fontWeight: "bold", marginBottom: 2, color: "#0f172a" },
  bodyText: { fontSize: 9, lineHeight: 1.4, color: "#1f2937" },
  gapBanner: {
    backgroundColor: "#fff9db",
    padding: 6,
    marginBottom: 6,
    borderLeftWidth: 3,
    borderLeftColor: "#f59e0b",
  },
  table: { marginTop: 6, borderWidth: 1, borderColor: "#d1d5db" },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#f4f6fa",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  tableCell: { padding: 4, borderRightWidth: 1, borderRightColor: "#e5e7eb" },
  tableHeaderText: { fontSize: 8, fontWeight: "bold", color: "#1f3e64" },
  paperTitle: { fontSize: 8.5, fontWeight: "bold", color: "#111827" },
  paperSource: { fontSize: 7.5, color: "#4b5563", marginTop: 1 },
  paperUrl: { fontSize: 7, color: "#2563eb", marginTop: 1 },
  footer: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 6,
    fontSize: 7.5,
    color: "#6b7280",
  },
});

function renderCategory(title: string, body: string): React.ReactElement {
  return (
    <View style={styles.categoryBlock}>
      <Text style={styles.categoryTitle}>{title}</Text>
      <Text style={styles.bodyText}>{body}</Text>
    </View>
  );
}

export function Report1DocumentV3(props: Report1PdfV3Props) {
  const collectedAt = props.collectedAt ?? new Date().toISOString().slice(0, 10);
  const hasGap =
    props.payload.block3_data_gaps.public_procurement_missing ||
    props.payload.block3_data_gaps.retail_missing;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>UPharma Export AI | 파나마 1공정 시장 분석 보고서</Text>
          <Text style={styles.subTitle}>파나마 전용 V3 구조 | {collectedAt}</Text>
          <Text style={styles.metaBar}>
            {props.brandName} — {props.innEn} | HS {props.hsCode} | Case {props.caseGrade} |
            confidence {props.confidence.toFixed(2)}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>① 핵심 판정</Text>
        <View style={styles.verdictCard}>
          <Text style={styles.verdictText}>{props.caseVerdict}</Text>
        </View>

        <Text style={styles.sectionTitle}>② 두괄식 판정 근거</Text>
        {renderCategory("시장 / 의료", props.payload.block2_market_medical)}
        {renderCategory("규제", props.payload.block2_regulation)}
        {renderCategory("무역", props.payload.block2_trade)}
        {renderCategory("조달", props.payload.block2_procurement)}
        {renderCategory("유통", props.payload.block2_distribution)}
        {props.payload.block2_reference_price !== null &&
          renderCategory("참고 가격", props.payload.block2_reference_price)}
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>③ 시장 진출 전략</Text>
        {hasGap && (
          <View style={styles.gapBanner}>
            <Text style={styles.bodyText}>
              데이터 수집 현황: {props.payload.block3_data_gaps.note}
            </Text>
          </View>
        )}
        {renderCategory("3-1 진입 채널", props.payload.block3_1_channel)}
        {renderCategory("3-2 가격 포지셔닝", props.payload.block3_2_pricing)}
        {renderCategory("3-3 유통 파트너", props.payload.block3_3_partners)}
        {renderCategory("3-4 리스크·조건", props.payload.block3_4_risks)}
        {renderCategory("3-5 진출 가능성", props.payload.block3_5_entry_feasibility)}
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>④ 근거 · 출처</Text>

        <Text style={styles.categoryTitle}>4-1. Perplexity 추천 논문</Text>
        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <View style={[styles.tableCell, { width: "10%" }]}>
              <Text style={styles.tableHeaderText}>No.</Text>
            </View>
            <View style={[styles.tableCell, { width: "50%" }]}>
              <Text style={styles.tableHeaderText}>논문 제목 / 출처</Text>
            </View>
            <View style={[styles.tableCell, { width: "40%", borderRightWidth: 0 }]}>
              <Text style={styles.tableHeaderText}>한국어 요약</Text>
            </View>
          </View>
          {props.payload.block4_papers.map((paper) => (
            <View key={paper.no} style={styles.tableRow}>
              <View style={[styles.tableCell, { width: "10%" }]}>
                <Text style={styles.bodyText}>{paper.no}</Text>
              </View>
              <View style={[styles.tableCell, { width: "50%" }]}>
                <Text style={styles.paperTitle}>{paper.title}</Text>
                <Text style={styles.paperSource}>[{paper.source}]</Text>
                <Text style={styles.paperUrl}>{paper.url}</Text>
              </View>
              <View style={[styles.tableCell, { width: "40%", borderRightWidth: 0 }]}>
                <Text style={styles.bodyText}>{paper.summary_ko}</Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={[styles.categoryTitle, { marginTop: 10 }]}>4-2. 사용된 DB / 기관</Text>
        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <View style={[styles.tableCell, { width: "30%" }]}>
              <Text style={styles.tableHeaderText}>DB / 기관명</Text>
            </View>
            <View style={[styles.tableCell, { width: "45%" }]}>
              <Text style={styles.tableHeaderText}>설명</Text>
            </View>
            <View style={[styles.tableCell, { width: "25%", borderRightWidth: 0 }]}>
              <Text style={styles.tableHeaderText}>링크</Text>
            </View>
          </View>
          {props.payload.block4_databases.map((db, index) => (
            <View key={`${db.name}-${index}`} style={styles.tableRow}>
              <View style={[styles.tableCell, { width: "30%" }]}>
                <Text style={styles.paperTitle}>{db.name}</Text>
              </View>
              <View style={[styles.tableCell, { width: "45%" }]}>
                <Text style={styles.bodyText}>{db.description}</Text>
              </View>
              <View style={[styles.tableCell, { width: "25%", borderRightWidth: 0 }]}>
                <Text style={styles.paperUrl}>{db.link ?? "내부 데이터"}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <Text>최종 수집: {collectedAt}</Text>
          <Text>LLM 본문 생성: Anthropic Claude Haiku (Tool Use 강제 양식 V3)</Text>
        </View>
      </Page>
    </Document>
  );
}
