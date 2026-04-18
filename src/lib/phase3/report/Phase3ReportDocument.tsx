import type { ReactElement } from "react";
import React from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import "@/lib/pdf/pdf-fonts";

import { PARTNERS, PRODUCT_META, type Partner } from "@/src/lib/phase3/partners-data";
import { uuidToProductSlug } from "@/src/lib/phase3/product-uuid-to-slug";

const styles = StyleSheet.create({
  page: {
    paddingTop: 44,
    paddingBottom: 40,
    paddingHorizontal: 36,
    fontFamily: "Pretendard",
    fontSize: 8,
    color: "#1e293b",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    paddingBottom: 6,
  },
  headerTitle: { fontSize: 10, fontWeight: "bold" },
  headerSub: { fontSize: 7, color: "#64748b" },
  banner: {
    backgroundColor: "#fef3c7",
    padding: 8,
    marginBottom: 10,
    borderRadius: 4,
  },
  bannerLine: { fontSize: 8, marginBottom: 2 },
  card: {
    borderWidth: 1,
    borderRadius: 4,
    padding: 8,
    marginBottom: 8,
  },
  cardGold: { borderColor: "#c9a961", backgroundColor: "#fffdf5" },
  cardBlue: { borderColor: "#3b82f6", backgroundColor: "#f8fafc" },
  cardGray: { borderColor: "#94a3b8", backgroundColor: "#ffffff" },
  cardTitle: { fontSize: 10, fontWeight: "bold", marginBottom: 4 },
  line: { fontSize: 7.5, marginBottom: 2, lineHeight: 1.35 },
  divider: {
    marginVertical: 6,
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: "#94a3b8",
  },
  dividerText: { fontSize: 7, color: "#64748b", textAlign: "center" },
  methodologyTitle: { fontSize: 11, fontWeight: "bold", marginBottom: 8 },
  methodologyBlock: { marginBottom: 10 },
});

function cardStyleForRank(rank: number): typeof styles.cardGold | typeof styles.cardBlue | typeof styles.cardGray {
  if (rank <= 5) {
    return styles.cardGold;
  }
  if (rank <= 10) {
    return styles.cardBlue;
  }
  return styles.cardGray;
}

function PartnerCardPdf(props: { partner: Partner; selectedSlug: ReturnType<typeof uuidToProductSlug> }): ReactElement {
  const { partner: p, selectedSlug } = props;
  const sel =
    selectedSlug !== null ? p.productMatches.find((m) => m.productId === selectedSlug) : undefined;
  const borderStyle = cardStyleForRank(p.rank);

  return (
    <View style={[styles.card, borderStyle]}>
      <Text style={styles.cardTitle}>
        [{p.rank}위] {p.partnerName}
        {p.groupName !== null ? ` (${p.groupName})` : ""} · PSI {p.basePSI.toFixed(1)}
      </Text>
      <Text style={styles.line}>📍 {p.address}</Text>
      <Text style={styles.line}>
        📞 {p.phone ?? "-"} · ✉ {p.email ?? "-"} · 🌐 {p.website ?? "-"}
      </Text>
      <Text style={styles.line}>
        💰 매출 Tier {p.revenueTier} · 파이프라인 평균 {p.pipelineAvgScore} · 제조 {p.manufacturingScore} · 수입{" "}
        {p.importExperienceScore} · 약국 {p.pharmacyChainScore}
      </Text>
      <Text style={styles.line}>🎯 핵심 포트폴리오 · {p.keyPortfolio}</Text>
      <Text style={styles.line}>💡 추천 사유 · {p.recommendationReason}</Text>
      {sel !== undefined ? (
        <Text style={[styles.line, { marginTop: 4, backgroundColor: "#fef3c7", color: "#92400e" }]}>
          ⭐ 선택 제품 ({sel.productName}): {sel.shortInsight}
        </Text>
      ) : null}
    </View>
  );
}

const PAGE_SLICES: readonly [number, number][] = [
  [0, 3],
  [3, 6],
  [6, 9],
  [9, 12],
  [12, 15],
  [15, 18],
  [18, 20],
];

export interface Phase3ReportDocumentProps {
  productIdUuid: string;
  generatedAt: Date;
}

/** 3공정 파트너 매칭 PDF — 1~7장 기업 프로필 + 8장 방법론 */
export function Phase3ReportDocument({ productIdUuid, generatedAt }: Phase3ReportDocumentProps): ReactElement {
  const slug = uuidToProductSlug(productIdUuid);
  const meta = slug !== null ? PRODUCT_META[slug] : null;
  const dateStr = generatedAt.toISOString().slice(0, 16).replace("T", " ");

  return (
    <Document
      title="파나마 파트너 매칭 보고서"
      author="KOREA UNITED PHARM INC."
      creator="UPharma Export AI"
    >
      {PAGE_SLICES.map((range, idx) => {
        const slice = PARTNERS.slice(range[0], range[1]);
        const pageNum = idx + 1;
        const isRank10to12Page = idx === 3 && slice.length >= 3;

        return (
          <Page key={pageNum} size="A4" style={styles.page}>
            <View style={styles.header} fixed>
              <View>
                <Text style={styles.headerTitle}>KOREA UNITED PHARM INC.</Text>
                <Text style={styles.headerSub}>파나마 파트너 매칭 보고서</Text>
              </View>
              <Text style={styles.headerSub}>
                {pageNum}/8 · {dateStr}
              </Text>
            </View>
            {meta !== null ? (
              <View style={styles.banner}>
                <Text style={styles.bannerLine}>📌 1공정 선택 제품: {meta.name}</Text>
                <Text style={styles.bannerLine}>본 분석은 8개 제품 전체 포트폴리오 관점에서 Top 20 파트너를 평가함.</Text>
              </View>
            ) : null}
            {isRank10to12Page ? (
              <View>
                <PartnerCardPdf partner={slice[0]} selectedSlug={slug} />
                <View style={styles.divider}>
                  <Text style={styles.dividerText}>─── Top 10 이하 · 경쟁사 프로필 포함 ───</Text>
                </View>
                <PartnerCardPdf partner={slice[1]} selectedSlug={slug} />
                <PartnerCardPdf partner={slice[2]} selectedSlug={slug} />
              </View>
            ) : (
              slice.map((partner) => <PartnerCardPdf key={partner.id} partner={partner} selectedSlug={slug} />)
            )}
          </Page>
        );
      })}
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          <View>
            <Text style={styles.headerTitle}>KOREA UNITED PHARM INC.</Text>
            <Text style={styles.headerSub}>기업 순위 선정 방법</Text>
          </View>
          <Text style={styles.headerSub}>8/8 · {dateStr}</Text>
        </View>
        <Text style={styles.methodologyTitle}>📊 기업 순위 선정 방법 및 가중치 정보</Text>
        <View style={styles.methodologyBlock}>
          <Text style={{ fontWeight: "bold", marginBottom: 4 }}>[블록 1] PSI 계산식</Text>
          <Text style={styles.line}>
            PSI = (매출 × 35%) + (파이프라인 × 28%) + (제조소 × 20%) + (수입경험 × 12%) + (약국체인 × 5%)
          </Text>
          <Text style={styles.line}>※ 선택 지표만 체크 시 원본 비율 유지하며 자동 비례 재분배</Text>
        </View>
        <View style={styles.methodologyBlock}>
          <Text style={{ fontWeight: "bold", marginBottom: 4 }}>[블록 2] 5대 평가지표</Text>
          <Text style={styles.line}>① 매출규모 (35%) ② 파이프라인 (28%) ③ 제조소 (20%) ④ 수입경험 (12%) ⑤ 약국체인 (5%)</Text>
        </View>
        <View style={styles.methodologyBlock}>
          <Text style={{ fontWeight: "bold", marginBottom: 4 }}>[블록 3] 가중치 설계</Text>
          <Text style={styles.line}>
            글로벌 매출 위상이 아닌 파나마 현지 실행 가능성 중심 평가. 글로벌 Top MNC도 현지 유통 역량이 부족하면 Top 5에 못
            들어올 수 있음.
          </Text>
        </View>
        <Text style={[styles.line, { marginTop: 12 }]}>
          [출처] MINSA 라이선스 · 기업 공시·Annual Report · Panjiva · Panadata
        </Text>
      </Page>
    </Document>
  );
}
