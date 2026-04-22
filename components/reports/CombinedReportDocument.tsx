import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

import "@/lib/pdf/pdf-fonts";
import type { Report } from "@/src/types/report_session";

// ─── Color tokens ─────────────────────────────────────────────────────────────
const C_NAVY  = "#1B3A6B";
const C_BODY  = "#1A1A1A";
const C_GRAY  = "#888888";
const C_ORG   = "#C85A00";  // 저가 진입
const C_BLUE  = "#1457A0";  // 기준가
const C_GREEN = "#1A6B35";  // 프리미엄
const C_BG    = "#FFFFFF";

const KRW_PER_USD = 1_473.1;

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  page: {
    backgroundColor: C_BG,
    paddingTop: 64,
    paddingBottom: 52,
    paddingLeft: 64,
    paddingRight: 64,
    fontFamily: "NotoSansKR",
    fontSize: 9,
    color: C_BODY,
    lineHeight: 1.5,
  },
  pageHeader: {
    position: "absolute",
    top: 22,
    left: 64,
    right: 64,
    fontSize: 8,
    color: C_GRAY,
    borderBottomWidth: 0.5,
    borderBottomColor: "#CCCCCC",
    paddingBottom: 4,
  },
  pageFooter: {
    position: "absolute",
    bottom: 18,
    left: 64,
    right: 64,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: C_GRAY,
    borderTopWidth: 0.5,
    borderTopColor: "#CCCCCC",
    paddingTop: 4,
  },
  coverTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: C_NAVY,
    marginTop: 80,
    marginBottom: 12,
  },
  coverSub: { fontSize: 11, color: C_NAVY, marginBottom: 6 },
  coverMeta: { fontSize: 9, color: C_GRAY, marginBottom: 4 },
  coverDivider: {
    marginTop: 24,
    marginBottom: 16,
    borderBottomWidth: 1.5,
    borderBottomColor: C_NAVY,
  },
  docTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: C_NAVY,
    marginBottom: 4,
  },
  docSubtitle: { fontSize: 8, color: C_GRAY, marginBottom: 14 },
  sectionH1: {
    fontSize: 11,
    fontWeight: "bold",
    color: C_NAVY,
    marginTop: 14,
    marginBottom: 5,
  },
  sectionH2: {
    fontSize: 10,
    fontWeight: "bold",
    color: C_NAVY,
    marginTop: 9,
    marginBottom: 4,
  },
  body: {
    fontSize: 9,
    color: C_BODY,
    lineHeight: 1.55,
    textAlign: "justify",
    marginBottom: 4,
  },
  kvRow: { flexDirection: "row", marginBottom: 3, paddingLeft: 12 },
  kvLabel: { fontSize: 9, fontWeight: "bold", color: C_BODY, width: 120, flexShrink: 0 },
  kvValue: { fontSize: 9, color: C_BODY, flex: 1 },
  bulletRow: { flexDirection: "row", paddingLeft: 16, marginBottom: 2 },
  bulletDot: { fontSize: 9, color: C_BODY, width: 12, flexShrink: 0 },
  bulletText: { fontSize: 9, color: C_BODY, flex: 1 },
  circledRow: { flexDirection: "row", paddingLeft: 16, marginBottom: 3 },
  circledNum: { fontSize: 9, fontWeight: "bold", color: C_BODY, width: 20, flexShrink: 0 },
  circledText: { fontSize: 9, color: C_BODY, flex: 1 },
  disclaimer: { fontSize: 8, color: C_GRAY, marginTop: 10, lineHeight: 1.5 },
  scenarioOrg: { fontSize: 10, fontWeight: "bold", color: C_ORG, marginTop: 6 },
  scenarioBlu: { fontSize: 10, fontWeight: "bold", color: C_BLUE, marginTop: 6 },
  scenarioGrn: { fontSize: 10, fontWeight: "bold", color: C_GREEN, marginTop: 6 },
  sectionDivider: { marginVertical: 6, borderBottomWidth: 0.5, borderBottomColor: "#D9E2EF" },
  partnerHeader: { fontSize: 10, fontWeight: "bold", color: C_NAVY, marginTop: 10, marginBottom: 3 },
  sourceNote: { fontSize: 8, color: C_GRAY, marginTop: 4, paddingLeft: 2 },
  // table
  tblWrap: { marginTop: 5, marginBottom: 5, borderWidth: 0.5, borderColor: "#C8D6E8" },
  tblHdrRow: { flexDirection: "row", backgroundColor: "#1B3A6B" },
  tblRow: { flexDirection: "row", borderTopWidth: 0.5, borderTopColor: "#C8D6E8" },
  tblRowAlt: { flexDirection: "row", borderTopWidth: 0.5, borderTopColor: "#C8D6E8", backgroundColor: "#F4F7FB" },
  tblRowOrg: { flexDirection: "row", borderTopWidth: 0.5, borderTopColor: "#C8D6E8", backgroundColor: "#FFF5EE" },
  tblRowBlu: { flexDirection: "row", borderTopWidth: 0.5, borderTopColor: "#C8D6E8", backgroundColor: "#EEF3FB" },
  tblRowGrn: { flexDirection: "row", borderTopWidth: 0.5, borderTopColor: "#C8D6E8", backgroundColor: "#EEF7EE" },
  tblCell: { fontSize: 8.5, color: C_BODY, padding: 5, lineHeight: 1.45 },
  tblHdrCell: { fontSize: 8.5, fontWeight: "bold", color: "#FFFFFF", padding: 5 },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeStr(v: unknown, fallback = "—"): string {
  if (v === null || v === undefined || v === "") return fallback;
  return String(v);
}

function safeNum(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number.parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

function safeRec(v: unknown): Record<string, unknown> {
  if (v !== null && typeof v === "object" && !Array.isArray(v)) {
    return v as Record<string, unknown>;
  }
  return {};
}

// ─── Building blocks ──────────────────────────────────────────────────────────

function DocHeader({ label }: { label: string }) {
  return (
    <View style={S.pageHeader} fixed>
      <Text>한국유나이티드제약  |  {label}</Text>
    </View>
  );
}

function DocFooter() {
  return (
    <View style={S.pageFooter} fixed>
      <Text>기밀 — 내부용</Text>
      <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  );
}

function H1({ n, title }: { n: string; title: string }) {
  return <Text style={S.sectionH1}>{n}. {title}</Text>;
}

function H2({ title }: { title: string }) {
  return <Text style={S.sectionH2}>▸ {title}</Text>;
}

function Divider() {
  return <View style={S.sectionDivider} />;
}

function KVRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={S.kvRow}>
      <Text style={S.kvLabel}>{label}</Text>
      <Text style={S.kvValue}>{value}</Text>
    </View>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <View style={S.bulletRow}>
      <Text style={S.bulletDot}>•</Text>
      <Text style={S.bulletText}>{text}</Text>
    </View>
  );
}

function Circled({ num, label, content }: { num: string; label: string; content: string }) {
  return (
    <View style={S.circledRow}>
      <Text style={S.circledNum}>{num}</Text>
      <Text style={S.circledText}>
        <Text style={{ fontWeight: "bold" }}>{label}</Text>{"  "}{content}
      </Text>
    </View>
  );
}

// ─── Table helpers ────────────────────────────────────────────────────────────

interface ColDef { label: string; width: string; align?: "left" | "center" | "right" }

function DataTable({ cols, rows }: { cols: ColDef[]; rows: string[][] }) {
  return (
    <View style={S.tblWrap}>
      <View style={S.tblHdrRow}>
        {cols.map((c, ci) => (
          <Text key={ci} style={{ ...S.tblHdrCell, width: c.width, textAlign: c.align ?? "left" }}>
            {c.label}
          </Text>
        ))}
      </View>
      {rows.map((row, ri) => (
        <View key={ri} style={ri % 2 === 0 ? S.tblRow : S.tblRowAlt}>
          {cols.map((c, ci) => (
            <Text key={ci} style={{ ...S.tblCell, width: c.width, textAlign: c.align ?? "left" }}>
              {row[ci] ?? ""}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

interface ScenarioCard {
  label: string;
  price_pab: number | null;
  price_usd: number | null;
  price_krw: number | null;
  basis: string;
  calculation: string;
}

function extractScenarioCard(sc: unknown): ScenarioCard {
  const r = safeRec(sc);
  return {
    label:      safeStr(r["label"]),
    price_pab:  safeNum(r["price_pab"]),
    price_usd:  safeNum(r["price_usd"]),
    price_krw:  safeNum(r["price_krw"]),
    basis:      safeStr(r["basis"], "—"),
    calculation: safeStr(r["calculation"], "—"),
  };
}

function extractScenarios(data: Record<string, unknown> | null): {
  agg: ScenarioCard; avg: ScenarioCard; cons: ScenarioCard;
} | null {
  if (data === null) return null;
  const mr = safeRec(data["marketResult"]);
  const sc = safeRec(mr["scenarios"]);
  if (Object.keys(sc).length === 0) return null;
  const get = (k1: string, k2: string) => sc[k1] !== undefined ? sc[k1] : sc[k2];
  return {
    agg:  extractScenarioCard(get("agg",  "aggressive")),
    avg:  extractScenarioCard(get("avg",  "average")),
    cons: extractScenarioCard(get("cons", "conservative")),
  };
}

function ScenarioTable({
  scenarios,
  currencyLabel = "PAB",
}: {
  scenarios: { agg: ScenarioCard; avg: ScenarioCard; cons: ScenarioCard } | null;
  currencyLabel?: string;
}) {
  if (scenarios === null) {
    return <Text style={S.body}>시나리오 데이터 없음.</Text>;
  }

  const rows: Array<{ card: ScenarioCard; rowStyle: typeof S.tblRow; labelColor: string }> = [
    { card: scenarios.agg,  rowStyle: S.tblRowOrg, labelColor: C_ORG   },
    { card: scenarios.avg,  rowStyle: S.tblRowBlu, labelColor: C_BLUE  },
    { card: scenarios.cons, rowStyle: S.tblRowGrn, labelColor: C_GREEN },
  ];
  const defaultLabels = ["저가 진입", "기준", "프리미엄"];

  return (
    <>
      <View style={S.tblWrap}>
        <View style={S.tblHdrRow}>
          <Text style={{ ...S.tblHdrCell, width: "18%" }}>시나리오</Text>
          <Text style={{ ...S.tblHdrCell, width: "30%", textAlign: "right" }}>현지 참고가</Text>
          <Text style={{ ...S.tblHdrCell, width: "28%", textAlign: "right" }}>FOB 역산 (USD)</Text>
          <Text style={{ ...S.tblHdrCell, width: "24%", textAlign: "right" }}>KRW 환산</Text>
        </View>
        {rows.map(({ card, rowStyle, labelColor }, ri) => (
          <View key={ri} style={rowStyle}>
            <Text style={{ ...S.tblCell, width: "18%", fontWeight: "bold", color: labelColor }}>
              {card.label !== "—" ? card.label : defaultLabels[ri]}
            </Text>
            <Text style={{ ...S.tblCell, width: "30%", textAlign: "right" }}>
              {card.price_pab !== null ? `${currencyLabel} ${card.price_pab.toFixed(2)}` : "—"}
            </Text>
            <Text style={{ ...S.tblCell, width: "28%", textAlign: "right" }}>
              {card.price_usd !== null ? `≈ USD ${card.price_usd.toFixed(2)}` : "—"}
            </Text>
            <Text style={{ ...S.tblCell, width: "24%", textAlign: "right" }}>
              {card.price_krw !== null ? `KRW ${Math.round(card.price_krw).toLocaleString("en-US")}` : "—"}
            </Text>
          </View>
        ))}
      </View>
      {rows.map(({ card, labelColor }, ri) => (
        card.basis !== "—" && (
          <View key={ri} style={S.bulletRow}>
            <Text style={{ ...S.bulletDot, color: labelColor }}>▸</Text>
            <Text style={S.bulletText}>
              <Text style={{ fontWeight: "bold", color: labelColor }}>
                {card.label !== "—" ? card.label : defaultLabels[ri]}
              </Text>
              {"  "}{card.basis}
              {card.calculation !== "—" ? `  (역산식: ${card.calculation})` : ""}
            </Text>
          </View>
        )
      ))}
    </>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface CombinedReportDocumentProps {
  product: { id: string; name: string; ingredient: string };
  country: string;
  generatedAt: Date;
  marketReport: Report;
  publicPricingReport: Report;
  privatePricingReport: Report;
  partnerReport: Report;
}

// ─── Cover Page ───────────────────────────────────────────────────────────────

function CoverPage({
  product,
  country,
  generatedAt,
}: Pick<CombinedReportDocumentProps, "product" | "country" | "generatedAt">) {
  const dateStr = generatedAt.toISOString().slice(0, 10);
  const countryName = country === "panama" ? "파나마(Panama)" : country.toUpperCase();

  return (
    <Page size="A4" style={S.page}>
      <DocFooter />

      <Text style={{ fontSize: 10, color: C_GRAY, marginTop: 10 }}>한국유나이티드제약(주)</Text>
      <Text style={S.coverTitle}>{countryName} 수출 통합 보고서</Text>
      <Text style={S.coverSub}>{product.name}</Text>
      <Text style={S.coverMeta}>{product.ingredient}</Text>
      <Text style={S.coverMeta}>HS CODE: 3004.90  |  {countryName}  |  {dateStr}</Text>

      <View style={S.coverDivider} />

      <Text style={{ fontSize: 11, fontWeight: "bold", color: C_NAVY, marginBottom: 10 }}>목 차</Text>
      {[
        "I.    파나마 수출 가격 전략 보고서",
        "        1. 파나마 거시 시장",
        "        2. 단가 (시장 기준가)",
        "        3. 거래처 참고 가격",
        "        4. 가격 시나리오 (공공 / 민간)",
        "",
        "II.   파나마 바이어 후보 리스트",
        "        1. 바이어 후보 리스트 (전체 10개사)",
        "        2. 우선 접촉 바이어 상세 정보 (상위 3개사)",
        "",
        "III.  파나마 시장보고서",
        "        1. 의료 거시환경 파악",
        "        2. 무역/규제 환경",
        "        3. 참고 가격",
        "        4. 리스크 / 조건",
        "        5. 근거 및 출처",
      ].map((line, i) => (
        <Text
          key={i}
          style={{
            fontSize: 9,
            color: line === "" ? C_GRAY : line.startsWith("  ") ? C_BODY : C_NAVY,
            fontWeight: /^[IVX]+\./.test(line.trim()) ? "bold" : "normal",
            marginBottom: line === "" ? 4 : 2,
          }}
        >
          {line || " "}
        </Text>
      ))}

      <Text style={{ ...S.disclaimer, marginTop: 32 }}>
        기밀 — 내부용. 본 보고서는 AI 분석 및 공개 데이터에 기반한 내부 참고용 자료입니다.{"\n"}
        최종 의사결정 전 담당자 검토 및 현지 실사가 필요합니다.
      </Text>
    </Page>
  );
}

// ─── Report 2: 수출가격전략 ──────────────────────────────────────────────────

function PricingReportPage({
  product,
  generatedAt,
  marketReport,
  publicPricingReport,
  privatePricingReport,
}: Pick<CombinedReportDocumentProps, "product" | "generatedAt" | "marketReport" | "publicPricingReport" | "privatePricingReport">) {
  const pData  = publicPricingReport.report_data  ?? {};
  const prData = privatePricingReport.report_data ?? {};
  const mData  = marketReport.report_data         ?? {};

  const pubScenarios  = extractScenarios(pData);
  const privScenarios = extractScenarios(prData);

  const phase2Pub = safeRec(pData["phase2Report"]);
  const b1  = safeStr(phase2Pub["block1_input_summary"],         "");
  const b2  = safeStr(phase2Pub["block2_fob_calculation"],       "");
  const b4  = safeStr(phase2Pub["block4_incoterms"],             "");
  const b5  = safeStr(phase2Pub["block5_risk_and_recommendation"], "");

  const phase2Priv = safeRec(prData["phase2Report"]);
  const prB2 = safeStr(phase2Priv["block2_fob_calculation"],       "");
  const prB5 = safeStr(phase2Priv["block5_risk_and_recommendation"], "");

  const compPrices = safeRec(pData["competitorPrices"]);
  const pubCh  = safeRec(compPrices["publicProcurement"]);
  const privCh = safeRec(compPrices["privateRetail"]);
  const pubAvg  = safeNum(pubCh["avg"]);
  const privAvg = safeNum(privCh["avg"]);
  const pubCnt  = safeNum(pubCh["count"]) ?? 0;
  const privCnt = safeNum(privCh["count"]) ?? 0;

  const emlWho   = mData["emlWho"]   === true;
  const emlPaho  = mData["emlPaho"]  === true;
  const emlMinsa = mData["emlMinsa"] === true;

  const basePrice = pubAvg ?? privAvg;
  const dateStr   = generatedAt.toISOString().slice(0, 10);

  return (
    <Page size="A4" style={S.page}>
      <DocHeader label="파나마 수출 가격 전략 보고서" />
      <DocFooter />

      <Text style={S.docTitle}>파나마 수출 가격 전략 보고서 — {product.name}</Text>
      <Text style={S.docSubtitle}>
        {product.name} ({product.ingredient})  |  Panama  |  {dateStr}
      </Text>

      <H1 n="1" title="파나마 거시 시장" />
      <Text style={S.body}>
        파나마는 의약품 시장 규모 약 USD 496M(2024, Statista)으로 중미 최대 의약품 유통 허브입니다.
        수입 의존도 ~90%로 한국 제약사 진출 여건이 양호하며, 공공·민간 채널로 구분됩니다.
        EML 등재: WHO {emlWho ? "○" : "✕"} / PAHO {emlPaho ? "○" : "✕"} / MINSA {emlMinsa ? "○" : "✕"}.
      </Text>
      {b1 !== "" && <Text style={{ ...S.body, marginTop: 2 }}>{b1}</Text>}

      <Divider />

      <H1 n="2" title={`${product.name} 단가 (시장 기준가)`} />
      <KVRow label="기준 가격"   value={basePrice !== null ? `PAB ${basePrice.toFixed(2)}` : "—"} />
      <KVRow label="시장 구분"   value="공공(ALPS 조달청) / 민간(병원·약국·체인)" />
      {b2 !== "" && (
        <>
          <H2 title="공공 시장 FOB 역산 분석" />
          <Text style={S.body}>{b2}</Text>
        </>
      )}
      {prB2 !== "" && (
        <>
          <H2 title="민간 시장 FOB 역산 분석" />
          <Text style={S.body}>{prB2}</Text>
        </>
      )}

      <Divider />

      <H1 n="3" title="거래처 참고 가격" />
      <DataTable
        cols={[
          { label: "채널",    width: "28%" },
          { label: "기준",    width: "30%" },
          { label: "평균가",  width: "22%", align: "right" },
          { label: "표본 수", width: "20%", align: "right" },
        ]}
        rows={[
          [
            "공공조달 (PanamaCompra)",
            "ALPS 낙찰가 기준",
            pubAvg !== null ? `PAB ${pubAvg.toFixed(2)}` : "수집 대기",
            pubCnt > 0 ? `${pubCnt}건` : "0건",
          ],
          [
            "민간 소매 (ACODECO/CABAMED)",
            "약국 소매가 기준",
            privAvg !== null ? `PAB ${privAvg.toFixed(2)}` : "수집 대기",
            privCnt > 0 ? `${privCnt}건` : "0건",
          ],
        ]}
      />
      {b4 !== "" && (
        <>
          <H2 title="INCOTERMS 역산 참고" />
          <Text style={S.body}>{b4}</Text>
        </>
      )}

      <Divider />

      <H1 n="4" title="가격 시나리오" />
      <H2 title="4-1. 공공 시장 (ALPS 조달청)" />
      <ScenarioTable scenarios={pubScenarios} />

      <H2 title="4-2. 민간 시장 (병원·약국·체인)" />
      <ScenarioTable scenarios={privScenarios} />

      {(b5 !== "" || prB5 !== "") && (
        <>
          <Divider />
          <H1 n="5" title="리스크 및 전략 권고" />
          {b5 !== "" && (
            <>
              <H2 title="공공 시장 전략 권고" />
              <Text style={S.body}>{b5}</Text>
            </>
          )}
          {prB5 !== "" && (
            <>
              <H2 title="민간 시장 전략 권고" />
              <Text style={S.body}>{prB5}</Text>
            </>
          )}
        </>
      )}

      <Text style={S.disclaimer}>
        ※ 본 산출 결과는 AI 분석에 기반한 추정치이므로, 최종 의사결정 전 반드시 담당자의 검토 및 확인이 필요합니다.
        PAB(발보아)는 USD와 1:1 고정환율입니다. KRW 환산: 1 USD = {KRW_PER_USD.toLocaleString("en-US")} 원 (보고서 기준 환율).
      </Text>
    </Page>
  );
}

// ─── Report 3: 바이어 리스트 ─────────────────────────────────────────────────

function PartnerReportPage({
  product,
  generatedAt,
  partnerReport,
}: Pick<CombinedReportDocumentProps, "product" | "generatedAt" | "partnerReport">) {
  const pData = partnerReport.report_data ?? {};
  const top10 = Array.isArray(pData["top10"])
    ? (pData["top10"] as Array<Record<string, unknown>>)
    : [];

  const dateStr  = generatedAt.toISOString().slice(0, 10);
  const CIRCLED  = ["①", "②", "③", "④", "⑤"];

  function scoreStr(n: unknown): string {
    const v = safeNum(n);
    return v !== null ? v.toFixed(1) : "—";
  }

  function taStr(ta: unknown): string {
    if (Array.isArray(ta) && ta.length > 0) return (ta as string[]).join(", ");
    return "—";
  }

  return (
    <Page size="A4" style={S.page}>
      <DocHeader label="파나마 바이어 후보 리스트" />
      <DocFooter />

      <Text style={S.docTitle}>파나마 바이어 후보 리스트 — {product.name}</Text>
      <Text style={S.docSubtitle}>Panama  |  {dateStr}</Text>
      <Text style={S.disclaimer}>
        ※ 아래 바이어 후보는 DB 수집 및 AI 분석을 통해 도출되었으며, 개별 기업의 파나마 진출 현황 및 제품 연관성은 추가 실사가 필요합니다.
      </Text>

      {/* 1. 전체 리스트 테이블 */}
      <H1 n="1" title={`바이어 후보 리스트 (전체 ${top10.length}개사)`} />
      {top10.length === 0 ? (
        <Text style={S.body}>바이어 데이터 없음.</Text>
      ) : (
        <View style={S.tblWrap}>
          <View style={S.tblHdrRow}>
            <Text style={{ ...S.tblHdrCell, width: "6%",  textAlign: "center" }}>#</Text>
            <Text style={{ ...S.tblHdrCell, width: "32%" }}>업체명</Text>
            <Text style={{ ...S.tblHdrCell, width: "18%" }}>국가/지역</Text>
            <Text style={{ ...S.tblHdrCell, width: "26%" }}>치료 영역</Text>
            <Text style={{ ...S.tblHdrCell, width: "18%" }}>이메일</Text>
          </View>
          {top10.map((p, i) => {
            const addr = safeStr(p["address"], "Panama");
            const countryStr = addr.includes(",")
              ? (addr.split(",").pop()?.trim() ?? "Panama")
              : addr.length < 30 ? addr : "Panama";
            const psi    = safeNum(p["psi_score"]) ?? safeNum(p["score_total_default"]);
            const psiStr = psi !== null ? ` (PSI ${psi.toFixed(1)})` : "";
            return (
              <View key={i} style={i % 2 === 0 ? S.tblRow : S.tblRowAlt}>
                <Text style={{ ...S.tblCell, width: "6%",  textAlign: "center" }}>{i + 1}</Text>
                <Text style={{ ...S.tblCell, width: "32%", fontWeight: "bold" }}>
                  {safeStr(p["company_name"])}{psiStr}
                </Text>
                <Text style={{ ...S.tblCell, width: "18%" }}>{countryStr}</Text>
                <Text style={{ ...S.tblCell, width: "26%" }}>{taStr(p["therapeutic_areas"])}</Text>
                <Text style={{ ...S.tblCell, width: "18%", fontSize: 7.5 }}>{safeStr(p["email"], "—")}</Text>
              </View>
            );
          })}
        </View>
      )}

      <Divider />

      {/* 2. 상위 3개사 상세 */}
      <H1 n="2" title={`우선 접촉 바이어 상세 정보 (상위 ${Math.min(3, top10.length)}개사)`} />
      <Text style={S.disclaimer}>
        ※ 상위 3개사는 PSI(파트너 적합성 지수) 및 AI 분석 종합 점수 기준입니다.
      </Text>

      {top10.slice(0, 3).map((p, i) => {
        const name    = safeStr(p["company_name"]);
        const addr    = safeStr(p["address"], "Panama City, Panama");
        const email   = safeStr(p["email"],   "—");
        const website = safeStr(p["website"], "—");
        const ta      = taStr(p["therapeutic_areas"]);
        const revUsd  = safeNum(p["revenue_usd"]);
        const empCnt  = safeNum(p["employee_count"]);
        const gmp     = p["gmp_certified"] === true ? "Yes" : p["gmp_certified"] === false ? "No" : "—";
        const impHist = p["import_history"] === true ? "Yes" : "—";
        const pubWins = safeNum(p["public_procurement_wins"]);
        const mah     = p["mah_capable"] === true ? "Yes" : "—";

        const reasons = [
          { label: "매출 규모",    value: revUsd !== null ? `USD ${(revUsd / 1_000_000).toFixed(1)}M` : "—" },
          { label: "치료 영역",    value: ta },
          { label: "GMP 인증",    value: gmp },
          { label: "수입 이력",    value: impHist },
          { label: "공공조달 낙찰", value: pubWins !== null ? `${pubWins}건` : "—" },
        ];

        return (
          <View key={i} wrap={false}>
            <Text style={S.partnerHeader}>
              {i + 1}. {name}  |  {addr} · {ta}
            </Text>
            <H2 title="기업 개요" />
            <Text style={S.body}>
              {name}은(는) {addr}에 소재한 파나마 의약품 유통 기업입니다.
              {revUsd !== null ? ` 연매출 USD ${(revUsd / 1_000_000).toFixed(1)}M,` : ""}
              {empCnt !== null ? ` 임직원 ${empCnt}명,` : ""}
              {" "}GMP 인증 {gmp}, MAH 역량 {mah}. 주요 치료 영역: {ta}.
            </Text>
            <H2 title="추천 이유" />
            {reasons.map((r, j) => (
              <Circled key={j} num={CIRCLED[j] ?? `${j + 1}.`} label={r.label} content={r.value} />
            ))}
            <H2 title="PSI 점수 (파트너 적합성 지수)" />
            <KVRow label="① 매출 (35%)"        value={scoreStr(p["score_revenue"])} />
            <KVRow label="② 파이프라인 (28%)"  value={scoreStr(p["score_pipeline"])} />
            <KVRow label="③ 제조/GMP (20%)"    value={scoreStr(p["score_gmp"])} />
            <KVRow label="④ 수입이력 (12%)"    value={scoreStr(p["score_import"])} />
            <KVRow label="⑤ 약국 체인 (5%)"   value={scoreStr(p["score_pharmacy_chain"])} />
            <H2 title="연락처 및 기업 규모" />
            <KVRow label="주소"       value={addr} />
            <KVRow label="이메일"     value={email} />
            <KVRow label="홈페이지"   value={website} />
            <KVRow label="기업 규모"  value={revUsd !== null ? `USD ${(revUsd / 1_000_000).toFixed(1)}M` : "—"} />
            <Text style={S.sourceNote}>※ 출처: Panama 파트너 DB / AI 분석</Text>
            {i < 2 && <Divider />}
          </View>
        );
      })}
    </Page>
  );
}

// ─── Report 1: 시장보고서 ────────────────────────────────────────────────────

function MarketReportPage({
  product,
  generatedAt,
  marketReport,
  publicPricingReport,
}: Pick<CombinedReportDocumentProps, "product" | "generatedAt" | "marketReport" | "publicPricingReport">) {
  const mData = marketReport.report_data         ?? {};
  const pData = publicPricingReport.report_data  ?? {};

  const emlWho   = mData["emlWho"]   === true;
  const emlPaho  = mData["emlPaho"]  === true;
  const emlMinsa = mData["emlMinsa"] === true;

  const mComp = safeRec(mData["competitorPrices"]);
  const pComp = safeRec(pData["competitorPrices"]);
  const pubChM  = safeRec(mComp["publicProcurement"]);
  const pubChP  = safeRec(pComp["publicProcurement"]);
  const privChM = safeRec(mComp["privateRetail"]);
  const privChP = safeRec(pComp["privateRetail"]);

  const pubAvg  = safeNum(pubChM["avg"])  ?? safeNum(pubChP["avg"]);
  const pubMin  = safeNum(pubChP["min"]);
  const pubMax  = safeNum(pubChP["max"]);
  const pubCnt  = safeNum(pubChM["count"]) ?? safeNum(pubChP["count"]) ?? 0;
  const privAvg = safeNum(privChM["avg"]) ?? safeNum(privChP["avg"]);
  const privCnt = safeNum(privChM["count"]) ?? safeNum(privChP["count"]) ?? 0;

  const ma   = safeRec(mData["marketAnalysis"]);
  const llm1 = safeStr(ma["block1_macro_overview"],        "");
  const llm2 = safeStr(ma["block2_regulatory_path"],       "");
  const llm3 = safeStr(ma["block3_price_context"],         "");
  const llm4 = safeStr(ma["block4_risk_factors"],          "");
  const llm5 = safeStr(ma["block5_action_recommendation"], "");

  const panamacompraCount  = safeNum(mData["panamacompraCount"])  ?? 0;
  const privateRetailCount = safeNum(mData["privateRetailCount"]) ?? 0;
  const srcAgg = Array.isArray(mData["sourceAggregation"]) ? mData["sourceAggregation"] : [];
  const dateStr = generatedAt.toISOString().slice(0, 10);

  return (
    <Page size="A4" style={S.page}>
      <DocHeader label="파나마 시장보고서" />
      <DocFooter />

      <Text style={S.docTitle}>파나마 시장보고서 — {product.name}</Text>
      <Text style={S.docSubtitle}>
        {product.name} ({product.ingredient})  |  HS CODE: 3004.90  |  Panama  |  {dateStr}
      </Text>

      <H1 n="1" title="의료 거시환경 파악" />
      <KVRow label="인구"               value="4,351,267명 (2024, World Bank)" />
      <KVRow label="1인당 GDP"          value="USD 19,445 (2024, IMF)" />
      <KVRow label="국가 GDP"           value="USD 87.6 Billion (2024, IMF)" />
      <KVRow label="의약품 시장 규모"   value="USD 496M (2024, Statista)" />
      <KVRow label="의약품 수입 의존도" value="~90% (KOTRA / ITA, 2024)" />
      <KVRow label="EML 등재 여부"      value={`WHO: ${emlWho ? "등재" : "미등재"}  |  PAHO: ${emlPaho ? "등재" : "미등재"}  |  MINSA: ${emlMinsa ? "등재" : "미등재"}`} />
      {panamacompraCount > 0 && (
        <KVRow label="공공조달 이력"  value={`${panamacompraCount}건 (PanamaCompra 기록 기준)`} />
      )}
      {privateRetailCount > 0 && (
        <KVRow label="민간 소매 표본" value={`${privateRetailCount}건`} />
      )}
      {llm1 !== "" && <Text style={{ ...S.body, marginTop: 6 }}>{llm1}</Text>}

      <Divider />

      <H1 n="2" title="무역/규제 환경" />
      {llm2 !== "" ? (
        <Text style={S.body}>{llm2}</Text>
      ) : (
        <>
          <H2 title="MINSA 등록 현황" />
          <Text style={S.body}>
            파나마 의약품은 MINSA 산하 DNFD의 사전 등록을 요하며, 통상 12–18개월 소요됩니다.
            기등록 INN 성분은 서류 간소화 절차가 가능합니다.
          </Text>
          <H2 title="관세 및 무역" />
          <Text style={S.body}>
            한-파나마 FTA(2021.3 발효) 완성의약품(HS 3004) 관세 0%, ITBMS 의약품 면세 적용.
          </Text>
        </>
      )}

      <Divider />

      <H1 n="3" title="참고 가격" />
      {pubCnt > 0 ? (
        <>
          <KVRow label="공공조달 평균가" value={pubAvg !== null ? `PAB ${pubAvg.toFixed(2)} (n=${pubCnt})` : "—"} />
          {pubMin !== null && pubMax !== null && (
            <KVRow label="공공조달 범위" value={`PAB ${pubMin.toFixed(2)} ~ ${pubMax.toFixed(2)}`} />
          )}
        </>
      ) : (
        <KVRow label="공공조달 참고가" value="—" />
      )}
      {privCnt > 0 && privAvg !== null ? (
        <KVRow label="민간 소매 평균가" value={`PAB ${privAvg.toFixed(2)} (n=${privCnt})`} />
      ) : (
        <KVRow label="민간 소매 참고가" value="—" />
      )}
      {llm3 !== "" ? (
        <Text style={{ ...S.body, marginTop: 4 }}>{llm3}</Text>
      ) : (
        <Text style={{ ...S.body, marginTop: 4 }}>
          상기 가격은 PanamaCompra(공공) 및 ACODECO/CABAMED(민간) 수집 데이터 기준입니다.
        </Text>
      )}

      <Divider />

      <H1 n="4" title="리스크 / 조건" />
      {llm4 !== "" ? (
        <Text style={S.body}>{llm4}</Text>
      ) : (
        <>
          <H2 title="규제 심사 소요 기간" />
          <Text style={S.body}>MINSA 신규 등록 심사 12–18개월, 지연 시 24개월 이상 가능.</Text>
          <H2 title="포뮬러리 등재" />
          <Text style={S.body}>CSS/MINSA 포뮬러리 등재 없이 공공 입찰 자격 없음.</Text>
        </>
      )}

      <Divider />

      <H1 n="5" title="근거 및 출처" />
      {llm5 !== "" && (
        <>
          <H2 title="5-0. 진출 전략 권고 (AI 분석)" />
          <Text style={S.body}>{llm5}</Text>
        </>
      )}
      <H2 title="5-1. 활용 데이터베이스 및 기관" />
      <Bullet text="PanamaCompra (공공조달 전자입찰 시스템, PANAMÁ)" />
      <Bullet text="ACODECO / CABAMED (파나마 소비자보호원 의약품 가격 DB)" />
      <Bullet text="MINSA / DNFD (보건부 의약품 등록 정보)" />
      <Bullet text="WHO EML / PAHO Essential Medicines List" />
      <Bullet text="World Bank Open Data — 인구·GDP 지표" />
      <Bullet text="Statista — Panama Pharmaceutical Market 2024" />
      <Bullet text="KOTRA 파나마 의약품 시장 동향 보고서 (2024)" />
      {srcAgg.length > 0 && (
        <>
          <H2 title="5-2. 수집 데이터 현황" />
          {(srcAgg as Array<Record<string, unknown>>).slice(0, 8).map((row, i) => (
            <Bullet key={i} text={`${safeStr(row["pa_source"])} — ${safeNum(row["cnt"]) ?? 0}건`} />
          ))}
        </>
      )}
      <Text style={S.disclaimer}>
        ※ 본 보고서는 DB 수집 데이터와 AI(Anthropic Haiku) 분석에 기반한 참고 자료이며,
        최종 의사결정 전 담당자 검토가 필요합니다.
      </Text>
    </Page>
  );
}

// ─── Main Document ────────────────────────────────────────────────────────────

export function CombinedReportDocument(props: CombinedReportDocumentProps) {
  return (
    <Document
      title={`파나마 수출 통합 보고서 — ${props.product.name}`}
      author="한국유나이티드제약(주)"
      language="ko"
    >
      {/* 순서: 표지 → 수출가격전략 → 바이어리스트 → 시장보고서 */}
      <CoverPage
        product={props.product}
        country={props.country}
        generatedAt={props.generatedAt}
      />
      <PricingReportPage
        product={props.product}
        generatedAt={props.generatedAt}
        marketReport={props.marketReport}
        publicPricingReport={props.publicPricingReport}
        privatePricingReport={props.privatePricingReport}
      />
      <PartnerReportPage
        product={props.product}
        generatedAt={props.generatedAt}
        partnerReport={props.partnerReport}
      />
      <MarketReportPage
        product={props.product}
        generatedAt={props.generatedAt}
        marketReport={props.marketReport}
        publicPricingReport={props.publicPricingReport}
      />
    </Document>
  );
}
