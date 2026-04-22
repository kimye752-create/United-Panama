import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

import "@/lib/pdf/pdf-fonts";
import { NAVY, GRAY_TEXT, GRAY_BORDER } from "@/lib/pdf/pdf-styles";

const local = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#FFFFFF",
    padding: 0,
    fontFamily: "NotoSansKR",
  },
  topBar: {
    backgroundColor: NAVY,
    height: 8,
  },
  body: {
    flex: 1,
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 60,
    paddingVertical: 40,
  },
  logoArea: {
    marginBottom: 48,
    alignItems: "center",
  },
  companyName: {
    fontSize: 13,
    fontWeight: "bold",
    color: NAVY,
    letterSpacing: 1,
  },
  companySubName: {
    fontSize: 9,
    color: GRAY_TEXT,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  divider: {
    width: 60,
    height: 2,
    backgroundColor: NAVY,
    marginVertical: 24,
  },
  reportTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: NAVY,
    textAlign: "center",
    lineHeight: 1.4,
    marginBottom: 8,
  },
  reportSubtitle: {
    fontSize: 11,
    color: GRAY_TEXT,
    textAlign: "center",
    marginBottom: 32,
  },
  tagBox: {
    borderWidth: 1,
    borderColor: GRAY_BORDER,
    borderRadius: 4,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginBottom: 8,
    alignItems: "center",
  },
  tagText: {
    fontSize: 9,
    color: GRAY_TEXT,
    textAlign: "center",
    lineHeight: 1.7,
  },
  dateArea: {
    marginTop: 32,
    alignItems: "center",
  },
  dateLabel: {
    fontSize: 8,
    color: GRAY_TEXT,
    marginBottom: 2,
  },
  dateValue: {
    fontSize: 10,
    fontWeight: "bold",
    color: NAVY,
  },
  bottomBar: {
    backgroundColor: NAVY,
    height: 4,
  },
  confidential: {
    backgroundColor: "#f0f4f8",
    paddingVertical: 4,
    paddingHorizontal: 60,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  confidentialText: {
    fontSize: 7,
    color: GRAY_TEXT,
  },
});

export interface CoverDocumentProps {
  product: { id: string; name: string; ingredient: string };
  country: string;
  generatedAt: Date;
}

export function CoverDocument({ product, country, generatedAt }: CoverDocumentProps) {
  const countryLabel = country.charAt(0).toUpperCase() + country.slice(1).toLowerCase();
  const dateStr = generatedAt.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Document title={`${countryLabel} 진출 전략 보고서 — ${product.name}`} language="ko">
      <Page size="A4" style={{ flexDirection: "column", backgroundColor: "#FFFFFF", fontFamily: "NotoSansKR" }}>
        <View style={local.topBar} />
        <View style={local.body}>
          <View style={local.logoArea}>
            <Text style={local.companyName}>한국유나이티드제약(주)</Text>
            <Text style={local.companySubName}>Korea United Pharm. Inc.</Text>
          </View>

          <View style={local.divider} />

          <Text style={local.reportTitle}>{countryLabel} 진출 전략 보고서</Text>
          <Text style={local.reportSubtitle}>
            {product.name} ({product.ingredient})
          </Text>

          <View style={local.tagBox}>
            <Text style={local.tagText}>
              수출가격 전략  ·  바이어 후보 리스트  ·  시장분석
            </Text>
          </View>

          <View style={local.dateArea}>
            <Text style={local.dateLabel}>보고서 생성일</Text>
            <Text style={local.dateValue}>{dateStr}</Text>
          </View>
        </View>
        <View style={local.confidential}>
          <Text style={local.confidentialText}>대외비 — 내부 검토용</Text>
          <Text style={local.confidentialText}>UPharma Export AI · {product.name}</Text>
        </View>
        <View style={local.bottomBar} />
      </Page>
    </Document>
  );
}
