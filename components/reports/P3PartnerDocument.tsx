import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

import "@/lib/pdf/pdf-fonts";
import { NAVY, GRAY_TEXT, GRAY_BORDER, GRAY_LABEL_BG } from "@/lib/pdf/pdf-styles";
import type { Report } from "@/src/types/report_session";

// ─── helpers ─────────────────────────────────────────────────────────────────

function safeStr(v: unknown, fallback = "—"): string {
  if (v === null || v === undefined || v === "") return fallback;
  if (typeof v === "string") return v.trim() === "" ? fallback : v.trim();
  if (typeof v === "number") return String(v);
  return fallback;
}

function safeNum(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return null;
}

function taStr(ta: unknown): string {
  if (Array.isArray(ta) && ta.length > 0) return (ta as string[]).join(", ");
  return "—";
}

function mainProductSummary(p: Record<string, unknown>): string {
  const regP = Array.isArray(p["registered_products"]) && (p["registered_products"] as string[]).length > 0
    ? (p["registered_products"] as string[]).slice(0, 2).join(", ")
    : null;
  if (regP) return regP;
  const ta = Array.isArray(p["therapeutic_areas"]) && (p["therapeutic_areas"] as string[]).length > 0
    ? (p["therapeutic_areas"] as string[])[0]
    : null;
  if (ta) return ta;
  return safeStr(p["cphi_category"], "—");
}

function parseReasonLines(text: string): Array<{ num: string; label: string; content: string }> {
  const segments = text.split(/(?=[①②③④⑤])/);
  const results: Array<{ num: string; label: string; content: string }> = [];
  for (const seg of segments) {
    const m = seg.match(/^([①②③④⑤])\s*\[([^\]]+)\]\s*([\s\S]+)/);
    if (m) {
      results.push({ num: m[1], label: m[2].trim(), content: m[3].trim() });
    } else if (seg.trim().length > 0) {
      results.push({ num: "", label: "", content: seg.trim() });
    }
  }
  if (results.length > 0) return results;
  return text.split(/\n/).filter(Boolean).map((l) => ({ num: "", label: "", content: l.trim() }));
}

// ─── styles ──────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 36,
    paddingVertical: 32,
    fontFamily: "NanumGothic",
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
  headerLabel: { fontSize: 8, color: NAVY, fontWeight: "bold" },
  headerDate:  { fontSize: 7.5, color: "#6b7a8f" },
  pageFooter: {
    position: "absolute",
    bottom: 18,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: { fontSize: 7, color: "#94a3b8" },
  docTitle:    { fontSize: 16, fontWeight: "bold", color: NAVY, marginBottom: 3 },
  docSubtitle: { fontSize: 9, color: "#6b7a8f", marginBottom: 6 },
  disclaimer:  { fontSize: 7.5, color: "#6b7a8f", backgroundColor: "#f8fafc", padding: 6, borderRadius: 3, marginBottom: 10 },
  sectionH1:   { fontSize: 11, fontWeight: "bold", color: NAVY, backgroundColor: "#eef4fb", padding: "4 8", borderRadius: 3, marginTop: 10, marginBottom: 6 },
  sectionH2:   { fontSize: 9.5, fontWeight: "bold", color: NAVY, marginTop: 6, marginBottom: 3 },
  body:        { fontSize: 8.5, lineHeight: 1.5, color: GRAY_TEXT },
  partnerHeader: { fontSize: 10, fontWeight: "bold", color: NAVY, marginTop: 8, marginBottom: 4 },
  tblWrap:     { marginBottom: 4 },
  tblHdrRow:   { flexDirection: "row", backgroundColor: GRAY_LABEL_BG },
  tblHdrCell:  { fontSize: 8, fontWeight: "bold", color: "#273f60", padding: "3 5", borderWidth: 0.5, borderColor: GRAY_BORDER },
  tblRow:      { flexDirection: "row", backgroundColor: "#ffffff" },
  tblRowAlt:   { flexDirection: "row", backgroundColor: "#f8fafc" },
  tblCell:     { fontSize: 8, color: GRAY_TEXT, padding: "3 5", borderWidth: 0.5, borderColor: GRAY_BORDER },
  kvRow:       { flexDirection: "row", marginBottom: 2 },
  kvLabel:     { fontSize: 8, fontWeight: "bold", color: "#273f60", width: 70 },
  kvValue:     { fontSize: 8, color: GRAY_TEXT, flex: 1 },
  circledRow:  { flexDirection: "row", marginBottom: 3, alignItems: "flex-start" },
  circledNum:  { fontSize: 9, fontWeight: "bold", color: NAVY, width: 14 },
  circledText: { fontSize: 8.5, color: GRAY_TEXT, flex: 1, lineHeight: 1.5 },
  divider:     { borderBottomWidth: 0.5, borderBottomColor: GRAY_BORDER, marginVertical: 8 },
  sourceNote:  { fontSize: 7, color: "#94a3b8", marginTop: 4 },
});

// ─── sub-components ────────────────────────────────────────────────────────

function DocHeader({ label }: { label: string }) {
  return (
    <View style={S.pageHeader} fixed>
      <Text style={S.headerLabel}>{label}</Text>
      <Text style={S.headerDate}>한국유나이티드제약(주)</Text>
    </View>
  );
}

function DocFooter() {
  return (
    <View style={S.pageFooter} fixed>
      <Text style={S.footerText}>한국유나이티드제약(주) 해외 영업·마케팅 대시보드</Text>
      <Text style={S.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  );
}

function CircledItem({ num, label, content }: { num: string; label: string; content: string }) {
  return (
    <View style={S.circledRow}>
      <Text style={S.circledNum}>{num}</Text>
      <Text style={S.circledText}>
        <Text style={{ fontWeight: "bold" }}>{label ? `[${label}] ` : ""}</Text>{content}
      </Text>
    </View>
  );
}

function KVRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={S.kvRow}>
      <Text style={S.kvLabel}>{label}</Text>
      <Text style={S.kvValue}>{value}</Text>
    </View>
  );
}

// ─── Props ───────────────────────────────────────────────────────────────────

export interface P3PartnerDocumentProps {
  product: { id: string; name: string; ingredient: string };
  country: string;
  generatedAt: Date;
  partnerReport: Report;
}

// ─── Document ────────────────────────────────────────────────────────────────

export function P3PartnerDocument({
  product,
  country,
  generatedAt,
  partnerReport,
}: P3PartnerDocumentProps) {
  const pData = partnerReport.report_data ?? {};
  const top10 = Array.isArray(pData["partners"])
    ? (pData["partners"] as Array<Record<string, unknown>>)
    : Array.isArray(pData["top10"])
    ? (pData["top10"] as Array<Record<string, unknown>>)
    : [];

  const dateStr = generatedAt.toISOString().slice(0, 10);
  const countryName = country === "panama" ? "파나마" : country.toUpperCase();

  return (
    <Document>
      <Page size="A4" style={S.page}>
        <DocHeader label="파나마 바이어 분석 보고서" />
        <DocFooter />

        {/* 제목 */}
        <Text style={S.docTitle}>파나마 바이어 분석 보고서 — {product.name}</Text>
        <Text style={S.docSubtitle}>{countryName}  |  {dateStr}</Text>
        <Text style={S.disclaimer}>
          ※ 필터링 조건: 원료의약품(API) 기업, 다국적 글로벌 기업, 오리지널 제약사 제외. 완제품 유통 가능 현지 바이어 기업만 포함합니다.{"\n"}
          아래 바이어 후보는 PharmChoices 크롤링 및 Claude AI 분석을 통해 도출되었으며, 개별 기업의 제품 연관성은 추가 실사가 필요합니다.
        </Text>

        {/* 1. 바이어 후보 리스트 */}
        <Text style={S.sectionH1}>1. 바이어 후보 리스트 (현지 유통 가능 바이어 — {top10.length}개사)</Text>
        {top10.length === 0 ? (
          <Text style={S.body}>바이어 데이터 없음.</Text>
        ) : (
          <View style={S.tblWrap}>
            <View style={S.tblHdrRow}>
              <Text style={{ ...S.tblHdrCell, width: "6%",  textAlign: "center" }}>#</Text>
              <Text style={{ ...S.tblHdrCell, width: "38%" }}>기업명</Text>
              <Text style={{ ...S.tblHdrCell, width: "36%" }}>주력상품 / 치료영역</Text>
              <Text style={{ ...S.tblHdrCell, width: "20%" }}>이메일</Text>
            </View>
            {top10.map((p, i) => (
              <View key={i} style={i % 2 === 0 ? S.tblRow : S.tblRowAlt}>
                <Text style={{ ...S.tblCell, width: "6%", textAlign: "center" }}>{i + 1}</Text>
                <Text style={{ ...S.tblCell, width: "38%", fontWeight: "bold" }}>{safeStr(p["company_name"])}</Text>
                <Text style={{ ...S.tblCell, width: "36%", fontSize: 7.5 }}>{mainProductSummary(p)}</Text>
                <Text style={{ ...S.tblCell, width: "20%", fontSize: 7.5 }}>{safeStr(p["email"], "—")}</Text>
              </View>
            ))}
          </View>
        )}

        {/* 2. 바이어 정보 상세 */}
        <Text style={{ ...S.sectionH1, marginTop: 14 }}>2. 바이어 정보 상세 (상위 {Math.min(10, top10.length)}개사)</Text>

        {top10.slice(0, 10).map((p, i) => {
          const name     = safeStr(p["company_name"]);
          const addr     = safeStr(p["address"], "—");
          const email    = safeStr(p["email"], "—");
          const website  = safeStr(p["website"], "—");
          const ta       = taStr(p["therapeutic_areas"]);
          const revUsd   = safeNum(p["revenue_usd"]);
          const empCnt   = safeNum(p["employee_count"]);
          const gmp      = p["gmp_certified"] === true ? "예" : p["gmp_certified"] === false ? "아니오" : "—";
          const impHist  = p["import_history"] === true ? "예" : "—";
          const mah      = p["mah_capable"] === true ? "예" : "—";
          const foundedY = safeStr(p["founded_year"], "—");
          const pubWins  = safeNum(p["public_procurement_wins"]);
          const korea    = p["korea_partnership"] === true ? "예" : "—";

          const regProds = Array.isArray(p["registered_products"])
            ? (p["registered_products"] as string[]).join(", ")
            : safeStr(p["registered_products"], "");
          const pipeline = regProds !== "" ? regProds : ta !== "—" ? ta : "—";

          return (
            <View key={i} wrap={false}>
              <Text style={S.partnerHeader}>{i + 1}. {name}</Text>

              {/* 기업 개요 */}
              <Text style={S.sectionH2}>▸ 기업 개요</Text>
              <Text style={S.body}>
                {name}은(는) {addr}에 소재한 의약품 유통·판매 기업입니다.
                {revUsd !== null ? ` 연매출 USD ${(revUsd / 1_000_000).toFixed(1)}M.` : ""}
                {empCnt !== null ? ` 임직원 ${empCnt}명.` : ""}
                {ta !== "—" ? ` 주력 치료 영역: ${ta}.` : ""}
                {impHist === "예" ? " 의약품 수입 이력 보유." : ""}
                {mah === "예" ? " MAH 역량 보유." : ""}
              </Text>

              {/* 추천 이유 */}
              <Text style={S.sectionH2}>▸ 추천 이유</Text>
              {(() => {
                const relevance = safeStr(p["product_relevance_reason"], "");
                if (relevance === "") {
                  return (
                    <>
                      <CircledItem num="①" label="파이프라인"  content={pipeline !== "—" ? `${pipeline} 취급 — ${product.name} 계열과 연관성` : "정보 수집 필요"} />
                      <CircledItem num="②" label="수입 이력"   content={impHist === "예" ? "의약품 수입 이력 확인됨" : "추가 확인 필요"} />
                      <CircledItem num="③" label="유통 채널"   content={p["pharmacy_chain_operator"] === true ? "약국 체인 운영으로 소매 채널 확보" : "현지 의약품 유통 채널 보유"} />
                      <CircledItem num="④" label="MAH 역량"    content={mah === "예" ? "위생등록 대행(MAH) 역량 보유" : "등록 역량 추가 확인 필요"} />
                      <CircledItem num="⑤" label="기업 안정성" content={revUsd !== null ? `연매출 USD ${(revUsd / 1_000_000).toFixed(1)}M 규모의 안정적 사업체` : "파나마 현지 꾸준히 운영 중"} />
                    </>
                  );
                }
                const lines = parseReasonLines(relevance);
                return (
                  <View style={{ paddingLeft: 4 }}>
                    {lines.map((r, li) =>
                      r.num !== ""
                        ? <CircledItem key={li} num={r.num} label={r.label} content={r.content} />
                        : <Text key={li} style={{ ...S.body, marginBottom: 3 }}>{r.content}</Text>
                    )}
                  </View>
                );
              })()}

              {/* 기본 정보 */}
              <Text style={S.sectionH2}>▸ 기본 정보</Text>
              <KVRow label="주소"     value={addr} />
              <KVRow label="이메일"   value={email} />
              <KVRow label="홈페이지" value={website} />
              <KVRow label="설립연도" value={foundedY} />
              <KVRow label="파이프라인" value={pipeline} />

              {/* 기업 규모 */}
              {(revUsd !== null || empCnt !== null) && (
                <KVRow
                  label="기업 규모"
                  value={[
                    revUsd !== null ? `매출 USD ${(revUsd / 1_000_000).toFixed(1)}M` : "",
                    empCnt !== null ? `임직원 ${empCnt}명` : "",
                  ].filter(Boolean).join("  ·  ")}
                />
              )}

              {/* 역량 */}
              <KVRow
                label="역량"
                value={[
                  impHist === "예" ? "수입이력" : "",
                  gmp === "예" ? "GMP인증" : "",
                  mah === "예" ? "MAH가능" : "",
                  pubWins !== null && pubWins > 0 ? `공공조달 ${pubWins}건` : "",
                  korea === "예" ? "한국협력" : "",
                ].filter(Boolean).join("  ·  ") || "—"}
              />

              <Text style={S.sourceNote}>출처: Claude AI 분석 (web_search 기반) · DB 수집 데이터</Text>
              {i < top10.length - 1 && <View style={S.divider} />}
            </View>
          );
        })}
      </Page>
    </Document>
  );
}
