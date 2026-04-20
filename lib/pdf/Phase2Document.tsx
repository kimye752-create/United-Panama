import React from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import type { CompetitorPricesPayload } from "@/src/logic/phase2/competitor_prices";

import "./pdf-fonts";

export interface Phase2PdfProps {
  brandName: string;
  innEn: string;
  caseGrade: "A" | "B" | "C";
  marketType: "public" | "private";
  basePrice: {
    value: number;
    currency: string;
    calculationMethod: string;
    marketSegment: string;
  };
  formula: string;
  aiReasoning: string;
  scenarios: {
    aggressive: { price: number; reasoning: string; formula: string };
    average: { price: number; reasoning: string; formula: string };
    conservative: { price: number; reasoning: string; formula: string };
  };
  competitorPrices: CompetitorPricesPayload;
  collectedAt: string;
}

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontFamily: "NotoSansKR",
    fontSize: 9,
    color: "#1f2937",
  },
  header: {
    marginBottom: 14,
    borderBottomWidth: 2,
    borderBottomColor: "#1f3e64",
    paddingBottom: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1f3e64",
    textAlign: "center",
  },
  subTitle: { marginTop: 4, fontSize: 9, textAlign: "center", color: "#4b5563" },
  sectionBlock: { marginTop: 16 },
  sectionBlockFirst: { marginTop: 0 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#1f3e64",
  },
  bodyText: { fontSize: 9, lineHeight: 1.45, color: "#374151" },
  metaLine: { fontSize: 9, marginTop: 4, color: "#4b5563" },
  table: { marginTop: 6, borderWidth: 1, borderColor: "#d1d5db" },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#f4f6fa",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  tableCell: { padding: 5, borderRightWidth: 1, borderRightColor: "#e5e7eb", fontSize: 8 },
  tableHeaderText: { fontSize: 8, fontWeight: "bold", color: "#1f3e64" },
  sourceNote: { fontSize: 7.5, color: "#6b7280", marginTop: 4 },
  scenarioBox: {
    marginTop: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#fafafa",
  },
  scenarioAgg: { borderLeftWidth: 3, borderLeftColor: "#dc2626" },
  scenarioAvg: { borderLeftWidth: 3, borderLeftColor: "#2563eb" },
  scenarioCons: { borderLeftWidth: 3, borderLeftColor: "#16a34a" },
  scenarioLabel: { fontSize: 9, fontWeight: "bold", color: "#111827" },
  scenarioPrice: { fontSize: 10, fontWeight: "bold", color: "#1f3e64", marginTop: 2 },
  footer: {
    marginTop: 14,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    fontSize: 7.5,
    color: "#6b7280",
  },
});

function fmtUsd(value: number | null): string {
  if (value === null) {
    return "미수집";
  }
  return `$${value.toFixed(4)}`;
}

function CompetitorTable({
  title,
  row,
}: {
  title: string;
  row: CompetitorPricesPayload["publicProcurement"];
}): React.ReactElement {
  return (
    <View style={{ marginTop: 8 }}>
      <Text style={[styles.sectionTitle, { fontSize: 10, marginBottom: 4 }]}>{title}</Text>
      <View style={styles.table}>
        <View style={styles.tableHeaderRow}>
          <View style={[styles.tableCell, { width: "25%" }]}>
            <Text style={styles.tableHeaderText}>평균</Text>
          </View>
          <View style={[styles.tableCell, { width: "25%" }]}>
            <Text style={styles.tableHeaderText}>최고</Text>
          </View>
          <View style={[styles.tableCell, { width: "25%" }]}>
            <Text style={styles.tableHeaderText}>최저</Text>
          </View>
          <View style={[styles.tableCell, { width: "25%", borderRightWidth: 0 }]}>
            <Text style={styles.tableHeaderText}>건수</Text>
          </View>
        </View>
        <View style={styles.tableRow}>
          <View style={[styles.tableCell, { width: "25%" }]}>
            <Text>{fmtUsd(row.avg)}</Text>
          </View>
          <View style={[styles.tableCell, { width: "25%" }]}>
            <Text>{fmtUsd(row.max)}</Text>
          </View>
          <View style={[styles.tableCell, { width: "25%" }]}>
            <Text>{fmtUsd(row.min)}</Text>
          </View>
          <View style={[styles.tableCell, { width: "25%", borderRightWidth: 0 }]}>
            <Text>{row.count}건</Text>
          </View>
        </View>
      </View>
      <Text style={styles.sourceNote}>{row.source}</Text>
    </View>
  );
}

export function Phase2Document(props: Phase2PdfProps): React.ReactElement {
  const marketLabel = props.marketType === "public" ? "공공조달 시장" : "민간소매 시장";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>UPharma 파나마 2단계 · 수출가격 책정 보고서</Text>
          <Text style={styles.subTitle}>
            {marketLabel} · {props.collectedAt} · Case {props.caseGrade}
          </Text>
          <Text style={[styles.bodyText, { textAlign: "center", marginTop: 6 }]}>
            {props.brandName} — {props.innEn}
          </Text>
        </View>

        <View style={styles.sectionBlockFirst}>
          <Text style={styles.sectionTitle}>1. 원 가격 (기준 가격)</Text>
          <Text style={styles.bodyText}>
            기준 가격: {props.basePrice.currency}{" "}
            {props.basePrice.value.toFixed(4)} (참조 PAB/USD 동일 취급)
          </Text>
          <Text style={styles.metaLine}>산정 방식: {props.basePrice.calculationMethod}</Text>
          <Text style={styles.metaLine}>시장 구분: {props.basePrice.marketSegment}</Text>
        </View>

        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>2. 경쟁사 가격 참조</Text>
          <CompetitorTable title="공공조달 (PanamaCompra V3)" row={props.competitorPrices.publicProcurement} />
          <CompetitorTable title="민간 소매 (ACODECO CABAMED)" row={props.competitorPrices.privateRetail} />
        </View>

        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>3. 적용한 계산 공식</Text>
          <Text style={styles.bodyText}>{props.formula}</Text>
          <Text style={[styles.bodyText, { marginTop: 8 }]}>{props.aiReasoning}</Text>
        </View>

        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>4. 가격 시나리오</Text>
          <View style={[styles.scenarioBox, styles.scenarioAgg]}>
            <Text style={styles.scenarioLabel}>공격</Text>
            <Text style={styles.scenarioPrice}>
              USD {props.scenarios.aggressive.price.toFixed(4)}
            </Text>
            <Text style={[styles.bodyText, { marginTop: 4 }]}>{props.scenarios.aggressive.reasoning}</Text>
            <Text style={[styles.metaLine, { marginTop: 4 }]}>{props.scenarios.aggressive.formula}</Text>
          </View>
          <View style={[styles.scenarioBox, styles.scenarioAvg]}>
            <Text style={styles.scenarioLabel}>평균</Text>
            <Text style={styles.scenarioPrice}>
              USD {props.scenarios.average.price.toFixed(4)}
            </Text>
            <Text style={[styles.bodyText, { marginTop: 4 }]}>{props.scenarios.average.reasoning}</Text>
            <Text style={[styles.metaLine, { marginTop: 4 }]}>{props.scenarios.average.formula}</Text>
          </View>
          <View style={[styles.scenarioBox, styles.scenarioCons]}>
            <Text style={styles.scenarioLabel}>보수</Text>
            <Text style={styles.scenarioPrice}>
              USD {props.scenarios.conservative.price.toFixed(4)}
            </Text>
            <Text style={[styles.bodyText, { marginTop: 4 }]}>{props.scenarios.conservative.reasoning}</Text>
            <Text style={[styles.metaLine, { marginTop: 4 }]}>{props.scenarios.conservative.formula}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>UPharma Export AI · 2단계 FOB 역산 · Claude Haiku 서술</Text>
        </View>
      </Page>
    </Document>
  );
}
