import type { ReactElement } from "react";
import React from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import "@/lib/pdf/pdf-fonts";

import { PARTNERS, PRODUCT_META, type Partner } from "@/src/lib/phase3/partners-data";
import type { ProductId } from "@/src/lib/phase3/partners-data";
import { PSI_BASIC_WEIGHTS } from "@/src/logic/phase3/types";
import { uuidToProductSlug } from "@/src/lib/phase3/product-uuid-to-slug";

const TOTAL_PAGES = 12;

const pageStyles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 36,
    paddingHorizontal: 32,
    fontFamily: "NotoSansKR",
    fontSize: 8,
    color: "#1e293b",
  },
  coverTitle: { fontSize: 11, fontWeight: "bold", color: "#0f172a", marginBottom: 6 },
  coverH1: { fontSize: 18, fontWeight: "bold", color: "#1e3a5f", marginBottom: 10 },
  coverDate: { fontSize: 10, color: "#475569", marginBottom: 8 },
  coverLine: { fontSize: 10, color: "#334155", marginBottom: 4, lineHeight: 1.45 },
  coverSub: { fontSize: 11, color: "#64748b", marginTop: 12 },
  pageNum: { fontSize: 8, color: "#94a3b8", marginTop: 16, textAlign: "center" },
  bodyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    paddingBottom: 6,
  },
  bodyHeaderTitle: { fontSize: 9, fontWeight: "bold" },
  bodyHeaderSub: { fontSize: 7, color: "#64748b" },
});

const cardStyles = StyleSheet.create({
  base: {
    marginBottom: 10,
    borderRadius: 6,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },
  header: {
    padding: 10,
    borderBottomWidth: 1,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    width: "100%",
  },
  psiValue: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#B45309",
    flex: 1,
    textAlign: "right",
  },
  partnerName: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#000000",
    marginTop: 4,
  },
  partnerSubtitle: {
    fontSize: 9,
    color: "#475569",
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#475569",
    marginBottom: 4,
  },
  infoLine: {
    fontSize: 8,
    color: "#1E293B",
    marginBottom: 3,
    lineHeight: 1.4,
  },
  factorRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
    paddingBottom: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: "#F1F5F9",
  },
  factorLabel: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#334155",
  },
  factorValue: {
    fontSize: 7.5,
    color: "#475569",
    marginTop: 1,
    lineHeight: 1.3,
    flex: 1,
    paddingRight: 6,
  },
  factorScore: {
    fontSize: 7.5,
    color: "#1E293B",
    maxWidth: "38%",
    textAlign: "right",
  },
  sectionContent: {
    fontSize: 8,
    color: "#1E293B",
    lineHeight: 1.45,
  },
  productMatchItem: {
    fontSize: 8,
    color: "#1E293B",
    lineHeight: 1.4,
    marginBottom: 2,
  },
  splitRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  leftCol: {
    flex: 1,
    padding: 8,
    borderRightWidth: 1,
    borderRightColor: "#E5E7EB",
  },
  rightCol: {
    flex: 1,
    padding: 8,
  },
  bottomBlock: {
    padding: 8,
  },
});

interface CardTheme {
  badgeLabel: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
  borderWidth: number;
  headerBg: string;
}

function getCardTheme(rank: number): CardTheme {
  if (rank === 1) {
    return {
      badgeLabel: "TOP 1",
      badgeBg: "#B8860B",
      badgeText: "#FFFFFF",
      borderColor: "#B8860B",
      borderWidth: 3,
      headerBg: "#FFF8E1",
    };
  }
  if (rank >= 2 && rank <= 5) {
    return {
      badgeLabel: `TOP ${String(rank)}`,
      badgeBg: "#BA7517",
      badgeText: "#FFFFFF",
      borderColor: "#BA7517",
      borderWidth: 2,
      headerBg: "#FAEEDA",
    };
  }
  if (rank >= 6 && rank <= 10) {
    return {
      badgeLabel: `#${String(rank)}`,
      badgeBg: "#3A3936",
      badgeText: "#F5F2EA",
      borderColor: "#7D7B74",
      borderWidth: 2,
      headerBg: "#EDEAE0",
    };
  }
  return {
    badgeLabel: `#${String(rank)}`,
    badgeBg: "#64748B",
    badgeText: "#FFFFFF",
    borderColor: "#CBD5E1",
    borderWidth: 1,
    headerBg: "#F8FAFC",
  };
}

/** 8제품 매칭 서술에서 Tier 접두 제거 */
function stripTierPrefix(text: string): string {
  return text.replace(/^Tier\s+\d+\s*[·.]\s*/i, "").trim();
}

function factorScoreLine(
  score: number,
  weightKey: keyof typeof PSI_BASIC_WEIGHTS,
): string {
  const w = PSI_BASIC_WEIGHTS[weightKey];
  const pct = Math.round(w * 100);
  const contrib = (score * w).toFixed(1);
  return `${String(score)}×${String(pct)}%=${contrib}`;
}

function renderProductMatchList(partner: Partner): ReactElement[] {
  return partner.productMatches.map((match) => {
    const cat = PRODUCT_META[match.productId as ProductId]?.category ?? "";
    const cleaned = stripTierPrefix(match.shortInsight);
    return (
      <Text key={match.productId} style={cardStyles.productMatchItem}>
        ▸ {match.productName}
        {cat !== "" ? ` (${cat})` : ""}: {cleaned}
      </Text>
    );
  });
}

function renderPartnerCard(
  partner: Partner,
  rank: number,
  selectedProductName: string,
  selectedSlug: ReturnType<typeof uuidToProductSlug>,
): ReactElement {
  const theme = getCardTheme(rank);
  const sel =
    selectedSlug !== null ? partner.productMatches.find((m) => m.productId === selectedSlug) : undefined;
  const selectedInsight =
    sel !== undefined ? stripTierPrefix(sel.shortInsight) : "해당 제품 매칭 정보 없음";

  return (
    <View
      style={[
        cardStyles.base,
        {
          borderWidth: theme.borderWidth,
          borderColor: theme.borderColor,
        },
      ]}
    >
      <View style={[cardStyles.header, { backgroundColor: theme.headerBg, borderBottomColor: theme.borderColor }]}>
        <View style={cardStyles.headerTop}>
          <View
            style={{
              backgroundColor: theme.badgeBg,
              borderRadius: 3,
              paddingHorizontal: 8,
              paddingVertical: 3,
            }}
          >
            <Text style={{ fontSize: 9, fontWeight: "bold", color: theme.badgeText }}>{theme.badgeLabel}</Text>
          </View>
          <Text style={cardStyles.psiValue}>PSI {partner.basePSI.toFixed(1)}</Text>
        </View>
        <Text style={cardStyles.partnerName}>{partner.partnerName}</Text>
        <Text style={cardStyles.partnerSubtitle}>
          {(partner.groupName ?? "-")} ({partner.countryName})
        </Text>
      </View>

      <View style={cardStyles.splitRow}>
        <View style={cardStyles.leftCol}>
          <Text style={cardStyles.sectionLabel}>[기본 정보]</Text>
          <Text style={cardStyles.infoLine}>소재지: {partner.address}</Text>
          <Text style={cardStyles.infoLine}>연락처: {partner.phone ?? "정보 없음"}</Text>
          <Text style={cardStyles.infoLine}>이메일: {partner.email ?? "정보 없음"}</Text>
          <Text style={cardStyles.infoLine}>웹사이트: {partner.website ?? "정보 없음"}</Text>
        </View>

        <View style={cardStyles.rightCol}>
          <Text style={cardStyles.sectionLabel}>[5대 평가 요소]</Text>

          <View style={cardStyles.factorRow}>
            <View style={{ flex: 1 }}>
              <Text style={cardStyles.factorLabel}>매출규모 (35%)</Text>
              <Text style={cardStyles.factorValue}>{partner.fiveFactorsDescription.revenue}</Text>
            </View>
            <Text style={cardStyles.factorScore}>{factorScoreLine(partner.revenueScore, "revenue")}</Text>
          </View>

          <View style={cardStyles.factorRow}>
            <View style={{ flex: 1 }}>
              <Text style={cardStyles.factorLabel}>파이프라인 (28%)</Text>
              <Text style={cardStyles.factorValue}>{partner.fiveFactorsDescription.pipeline}</Text>
            </View>
            <Text style={cardStyles.factorScore}>{factorScoreLine(partner.pipelineAvgScore, "pipeline")}</Text>
          </View>

          <View style={cardStyles.factorRow}>
            <View style={{ flex: 1 }}>
              <Text style={cardStyles.factorLabel}>제조소 (20%)</Text>
              <Text style={cardStyles.factorValue}>{partner.fiveFactorsDescription.manufacturing}</Text>
            </View>
            <Text style={cardStyles.factorScore}>{factorScoreLine(partner.manufacturingScore, "manufacture")}</Text>
          </View>

          <View style={cardStyles.factorRow}>
            <View style={{ flex: 1 }}>
              <Text style={cardStyles.factorLabel}>수입 경험 (12%)</Text>
              <Text style={cardStyles.factorValue}>{partner.fiveFactorsDescription.importExperience}</Text>
            </View>
            <Text style={cardStyles.factorScore}>{factorScoreLine(partner.importExperienceScore, "import")}</Text>
          </View>

          <View style={[cardStyles.factorRow, { borderBottomWidth: 0 }]}>
            <View style={{ flex: 1 }}>
              <Text style={cardStyles.factorLabel}>약국체인 (5%)</Text>
              <Text style={cardStyles.factorValue}>{partner.fiveFactorsDescription.pharmacyChain}</Text>
            </View>
            <Text style={cardStyles.factorScore}>{factorScoreLine(partner.pharmacyChainScore, "pharmacy")}</Text>
          </View>
        </View>
      </View>

      <View style={cardStyles.bottomBlock}>
        <Text style={cardStyles.sectionLabel}>[기업 소개]</Text>
        <Text style={cardStyles.sectionContent}>{partner.companyDescription}</Text>

        <Text style={[cardStyles.sectionLabel, { marginTop: 8 }]}>[{selectedProductName} 선택 제품 매칭 분석]</Text>
        <Text style={cardStyles.sectionContent}>{selectedInsight}</Text>

        <Text style={[cardStyles.sectionLabel, { marginTop: 8 }]}>[8제품 포트폴리오 매칭 요약]</Text>
        {renderProductMatchList(partner)}
      </View>
    </View>
  );
}

function BodyPageHeader(props: { pageIndex: number; dateStr: string }): ReactElement {
  const { pageIndex, dateStr } = props;
  return (
    <View style={pageStyles.bodyHeader} fixed={false}>
      <View>
        <Text style={pageStyles.bodyHeaderTitle}>KOREA UNITED PHARM INC.</Text>
        <Text style={pageStyles.bodyHeaderSub}>파나마 파트너 매칭 보고서</Text>
      </View>
      <Text style={pageStyles.bodyHeaderSub}>
        {String(pageIndex)}/{String(TOTAL_PAGES)} · {dateStr}
      </Text>
    </View>
  );
}

function MethodologyPage(props: { dateStr: string }): ReactElement {
  const { dateStr } = props;
  return (
    <Page size="A4" style={pageStyles.page}>
      <View style={pageStyles.bodyHeader}>
        <View>
          <Text style={pageStyles.bodyHeaderTitle}>KOREA UNITED PHARM INC.</Text>
          <Text style={pageStyles.bodyHeaderSub}>평가 방법 및 Tier 기준</Text>
        </View>
        <Text style={pageStyles.bodyHeaderSub}>
          {String(TOTAL_PAGES)}/{String(TOTAL_PAGES)} · {dateStr}
        </Text>
      </View>

      <View style={{ padding: 4 }}>
        <Text style={{ fontSize: 14, fontWeight: "bold", marginBottom: 10, color: "#0f172a" }}>
          평가 방법 및 Tier 기준
        </Text>

        <View
          style={{
            marginBottom: 12,
            padding: 10,
            backgroundColor: "#FFFBEB",
            borderLeftWidth: 3,
            borderLeftColor: "#D97706",
            borderRadius: 4,
          }}
        >
          <Text style={{ fontSize: 9, fontWeight: "bold", marginBottom: 4 }}>[평가 원칙]</Text>
          <Text style={{ fontSize: 9, lineHeight: 1.5, color: "#1E293B" }}>
            본 분석은 파나마 시장 유통 역량을 고려한 평가입니다. 글로벌 Top MNC도 현지 유통 역량이 부족하면 상위 순위에 오르지
            않을 수 있습니다.
          </Text>
        </View>

        <View style={{ marginBottom: 12, padding: 10, backgroundColor: "#F8FAFC", borderRadius: 6 }}>
          <Text style={{ fontSize: 9, fontWeight: "bold", marginBottom: 6 }}>[PSI 계산식]</Text>
          <Text style={{ fontSize: 9, lineHeight: 1.5 }}>
            PSI = (매출 × 35%) + (파이프라인 × 28%) + (제조소 × 20%) + (수입경험 × 12%) + (약국체인 × 5%)
          </Text>
          <Text style={{ fontSize: 8, color: "#64748B", marginTop: 4, fontStyle: "italic" }}>
            ※ 선택 지표만 체크 시 원본 비율 유지하며 자동 비례 재분배
          </Text>
        </View>

        <View style={{ marginBottom: 10 }}>
          <Text style={{ fontSize: 10, fontWeight: "bold", marginBottom: 6 }}>[매출 규모 Tier 기준 (USD)]</Text>
          <View style={{ paddingLeft: 6 }}>
            <Text style={{ fontSize: 9, lineHeight: 1.6 }}>
              Tier 1: USD 10억+ → 100점 · Hetero, GSK, Pfizer, Roche 등 글로벌 MNC
            </Text>
            <Text style={{ fontSize: 9, lineHeight: 1.6 }}>
              Tier 2: USD 3억~10억 → 85점 · Tecnoquímicas, PiSA, Guerbet 등 중견
            </Text>
            <Text style={{ fontSize: 9, lineHeight: 1.6 }}>Tier 3: USD 5천만~3억 → 70점 · Unipharm 등 국가 Top</Text>
            <Text style={{ fontSize: 9, lineHeight: 1.6 }}>
              Tier 4: USD 1천만~5천만 → 55점 · Medipan, Haseth 등 로컬 중견
            </Text>
            <Text style={{ fontSize: 9, lineHeight: 1.6 }}>Tier 5: USD 1천만 미만 → 30점 · Sequisa 등 소규모</Text>
          </View>
        </View>

        <View style={{ marginBottom: 10 }}>
          <Text style={{ fontSize: 10, fontWeight: "bold", marginBottom: 6 }}>
            [파이프라인 / 제조소 / 수입경험 / 약국체인 기준]
          </Text>
          <View style={{ paddingLeft: 6 }}>
            <Text style={{ fontSize: 9, lineHeight: 1.6 }}>
              파이프라인 (28%): High 85~100 / Mid-High 70~85 / Mid 55~70 / Low 30~50
            </Text>
            <Text style={{ fontSize: 9, lineHeight: 1.6 }}>제조소 (20%): 직영 GMP 100 / 창고 허브 70 / 순수 유통 40</Text>
            <Text style={{ fontSize: 9, lineHeight: 1.6 }}>
              수입 경험 (12%): 글로벌+WHO PQ 90~100 / 다국가 70~85 / 지역 50~70 / 내수 30~50
            </Text>
            <Text style={{ fontSize: 9, lineHeight: 1.6 }}>약국체인 (5%): 대형 80~100 / 중형 50~80 / 소형 20~50 / 미보유 0</Text>
          </View>
        </View>

        <Text style={{ fontSize: 8, color: "#64748B", marginTop: 8 }}>
          [출처] MINSA 라이선스 · 기업 공시 · Annual Report · Panjiva · Panadata
        </Text>
        <Text style={{ fontSize: 8, color: "#64748B", marginTop: 4, fontStyle: "italic" }}>
          ※ 모든 매출은 USD 환산 기준 (2025년 평균 환율 적용)
        </Text>
      </View>
    </Page>
  );
}

export interface Phase3ReportDocumentProps {
  productIdUuid: string;
  generatedAt: Date;
}

/** 표지 1p + 기업 2페이지×10(2기업/페이지) + 방법론 1p = 12p */
export function Phase3ReportDocument({ productIdUuid, generatedAt }: Phase3ReportDocumentProps): ReactElement {
  const slug = uuidToProductSlug(productIdUuid);
  const meta = slug !== null ? PRODUCT_META[slug] : null;
  const dateStr = generatedAt.toISOString().slice(0, 16).replace("T", " ");
  const selectedName = meta !== null ? meta.name : "선택 제품";
  const partnersOrdered = [...PARTNERS].sort((a, b) => a.rank - b.rank);

  const bodyPageStarts = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

  return (
    <Document title="파나마 파트너 매칭 보고서" author="KOREA UNITED PHARM INC." creator="UPharma Export AI">
      <Page size="A4" style={pageStyles.page}>
        <Text style={pageStyles.coverTitle}>KOREA UNITED PHARM INC.</Text>
        <Text style={pageStyles.coverH1}>파나마 파트너 매칭 보고서</Text>
        <Text style={pageStyles.coverDate}>발행일: {dateStr}</Text>
        {meta !== null ? (
          <Text style={pageStyles.coverLine}>1공정 선택 제품: {meta.name}</Text>
        ) : (
          <Text style={pageStyles.coverLine}>1공정 선택 제품: (미지정)</Text>
        )}
        <Text style={pageStyles.coverSub}>파나마 Top 20 파트너 종합 평가</Text>
        <Text style={pageStyles.pageNum}>1/{String(TOTAL_PAGES)}</Text>
      </Page>

      {bodyPageStarts.map((pageNum, i) => {
        const a = partnersOrdered[i * 2];
        const b = partnersOrdered[i * 2 + 1];
        return (
          <Page key={pageNum} size="A4" style={pageStyles.page}>
            <BodyPageHeader pageIndex={pageNum} dateStr={dateStr} />
            {a !== undefined ? renderPartnerCard(a, a.rank, selectedName, slug) : null}
            {b !== undefined ? renderPartnerCard(b, b.rank, selectedName, slug) : null}
          </Page>
        );
      })}

      <MethodologyPage dateStr={dateStr} />
    </Document>
  );
}
