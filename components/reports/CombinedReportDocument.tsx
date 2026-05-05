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

// ─── Color tokens (SG 양식 기준) ─────────────────────────────────────────────
const C_NAVY   = "#1B3A6B";  // section / title
const C_BODY   = "#1A1A1A";  // body / kv
const C_GRAY   = "#888888";  // subtitle / footer / disclaimer
const C_ORG    = "#C85A00";  // [저가 진입]
const C_BLUE   = "#1457A0";  // [기준가]
const C_GREEN  = "#1A6B35";  // [프리미엄]
const C_BG_PG  = "#FFFFFF";

const KRW_PER_USD = 1_473.1;

// ─── Styles ──────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  page: {
    backgroundColor: C_BG_PG,
    paddingTop: 40,
    paddingBottom: 36,
    paddingLeft: 40,
    paddingRight: 40,
    fontFamily: "NanumGothic",
    fontSize: 9,
    color: C_BODY,
    lineHeight: 1.45,
  },
  // header / footer
  pageHeader: {
    position: "absolute",
    top: 14,
    left: 40,
    right: 40,
    height: 16,
    fontSize: 8,
    color: C_GRAY,
    borderBottomWidth: 0.5,
    borderBottomColor: "#CCCCCC",
    paddingBottom: 4,
  },
  pageFooter: {
    position: "absolute",
    bottom: 14,
    left: 40,
    right: 40,
    height: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: C_GRAY,
    borderTopWidth: 0.5,
    borderTopColor: "#CCCCCC",
    paddingTop: 4,
  },
  // cover
  coverTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: C_NAVY,
    marginTop: 80,
    marginBottom: 12,
  },
  coverSub: {
    fontSize: 11,
    color: C_NAVY,
    marginBottom: 6,
  },
  coverMeta: {
    fontSize: 9,
    color: C_GRAY,
    marginBottom: 4,
  },
  coverDivider: {
    marginTop: 24,
    marginBottom: 16,
    borderBottomWidth: 1.5,
    borderBottomColor: C_NAVY,
  },
  // doc title block (top of each report page)
  docTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: C_NAVY,
    marginBottom: 4,
  },
  docSubtitle: {
    fontSize: 8,
    color: C_GRAY,
    marginBottom: 14,
  },
  // sections — 컴팩트화 (페이지당 정보 밀도 ↑)
  sectionH1: {
    fontSize: 11,
    fontWeight: "bold",
    color: C_NAVY,
    marginTop: 8,
    marginBottom: 3,
  },
  sectionH2: {
    fontSize: 9.5,
    fontWeight: "bold",
    color: C_NAVY,
    marginTop: 4,
    marginBottom: 2,
  },
  body: {
    fontSize: 8.5,
    color: C_BODY,
    lineHeight: 1.4,
    textAlign: "justify",
    marginBottom: 2,
  },
  // key-value row
  kvRow: {
    flexDirection: "row",
    marginBottom: 1,
    paddingLeft: 8,
  },
  kvLabel: {
    fontSize: 8.5,
    fontWeight: "bold",
    color: C_BODY,
    width: 90,
    flexShrink: 0,
  },
  kvValue: {
    fontSize: 8.5,
    color: C_BODY,
    flex: 1,
  },
  // bullet list
  bulletRow: {
    flexDirection: "row",
    paddingLeft: 16,
    marginBottom: 2,
  },
  bulletDot: {
    fontSize: 9,
    color: C_BODY,
    width: 12,
    flexShrink: 0,
  },
  bulletText: {
    fontSize: 8.5,
    color: C_BODY,
    flex: 1,
    lineHeight: 1.4,
  },
  // circled numbered items (①②) — 컴팩트화
  circledRow: {
    flexDirection: "row",
    paddingLeft: 12,
    marginBottom: 1,
  },
  circledNum: {
    fontSize: 8.5,
    fontWeight: "bold",
    color: C_BODY,
    width: 16,
    flexShrink: 0,
  },
  circledText: {
    fontSize: 8.5,
    color: C_BODY,
    flex: 1,
    lineHeight: 1.4,
  },
  // disclaimer ※
  disclaimer: {
    fontSize: 8,
    color: C_GRAY,
    marginTop: 10,
    lineHeight: 1.5,
  },
  // scenario label colors
  scenarioOrg: { fontSize: 10, fontWeight: "bold", color: C_ORG, marginTop: 6 },
  scenarioBlu: { fontSize: 10, fontWeight: "bold", color: C_BLUE, marginTop: 6 },
  scenarioGrn: { fontSize: 10, fontWeight: "bold", color: C_GREEN, marginTop: 6 },
  scenarioBody: {
    paddingLeft: 14,
    marginTop: 1,
  },
  scenarioKv: {
    flexDirection: "row",
    marginBottom: 2,
    paddingLeft: 14,
  },
  scenarioKvLabel: {
    fontSize: 9,
    fontWeight: "bold",
    color: C_BODY,
    width: 100,
    flexShrink: 0,
  },
  scenarioKvVal: {
    fontSize: 9,
    color: C_BODY,
    flex: 1,
  },
  // citation
  citeLabel: {
    fontSize: 9,
    fontWeight: "bold",
    color: C_NAVY,
    marginTop: 6,
    marginBottom: 1,
  },
  citeBody: {
    fontSize: 9,
    color: C_BODY,
    paddingLeft: 14,
    lineHeight: 1.5,
  },
  citeUrl: {
    fontSize: 8,
    color: C_GRAY,
    paddingLeft: 14,
    marginBottom: 4,
  },
  // section divider
  sectionDivider: {
    marginVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: "#D9E2EF",
  },
  // partner header — 컴팩트화 (페이지당 2개 기업 수용)
  partnerCompanyHeader: {
    fontSize: 10,
    fontWeight: "bold",
    color: C_NAVY,
    marginTop: 4,
    marginBottom: 2,
  },
  // source note
  sourceNote: {
    fontSize: 7.5,
    color: C_GRAY,
    marginTop: 2,
    paddingLeft: 2,
  },
  // ── table ──────────────────────────────────────────────────────────────────
  tblWrap: {
    marginTop: 5,
    marginBottom: 5,
    borderWidth: 0.5,
    borderColor: "#C8D6E8",
  },
  tblHdrRow: {
    flexDirection: "row",
    backgroundColor: "#1B3A6B",
  },
  tblRow: {
    flexDirection: "row",
    borderTopWidth: 0.5,
    borderTopColor: "#C8D6E8",
  },
  tblRowAlt: {
    flexDirection: "row",
    borderTopWidth: 0.5,
    borderTopColor: "#C8D6E8",
    backgroundColor: "#F4F7FB",
  },
  tblCell: {
    fontSize: 8.5,
    color: C_BODY,
    padding: 5,
    lineHeight: 1.45,
  },
  tblHdrCell: {
    fontSize: 8.5,
    fontWeight: "bold",
    color: "#FFFFFF",
    padding: 5,
  },
  // scenario table row colors
  tblRowOrg: {
    flexDirection: "row",
    borderTopWidth: 0.5,
    borderTopColor: "#C8D6E8",
    backgroundColor: "#FFF5EE",
  },
  tblRowBlu: {
    flexDirection: "row",
    borderTopWidth: 0.5,
    borderTopColor: "#C8D6E8",
    backgroundColor: "#EEF3FB",
  },
  tblRowGrn: {
    flexDirection: "row",
    borderTopWidth: 0.5,
    borderTopColor: "#C8D6E8",
    backgroundColor: "#EEF7EE",
  },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function safeStr(v: unknown, fallback = "—"): string {
  if (v === null || v === undefined || v === "") return fallback;
  return String(v);
}

function safeNum(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number.parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

function fmtPab(n: number): string {
  return `PAB ${n.toFixed(2)}`;
}

function fmtUsd(n: number): string {
  return `USD ${n.toFixed(2)}`;
}

function fmtKrw(usd: number): string {
  return `KRW ${Math.round(usd * KRW_PER_USD).toLocaleString("en-US")} 원`;
}

function safeRecord(v: unknown): Record<string, unknown> {
  if (v !== null && typeof v === "object" && !Array.isArray(v)) {
    return v as Record<string, unknown>;
  }
  return {};
}

// ─── Primitive building blocks ───────────────────────────────────────────────

function KVRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={S.kvRow}>
      <Text style={S.kvLabel}>{label}</Text>
      <Text style={S.kvValue}>{value}</Text>
    </View>
  );
}

function BulletItem({ text }: { text: string }) {
  return (
    <View style={S.bulletRow}>
      <Text style={S.bulletDot}>•</Text>
      <Text style={S.bulletText}>{text}</Text>
    </View>
  );
}

function CircledItem({ num, label, content }: { num: string; label: string; content: string }) {
  return (
    <View style={S.circledRow}>
      <Text style={S.circledNum}>{num}</Text>
      <Text style={S.circledText}>
        <Text style={{ fontWeight: "bold" }}>{label}</Text>{"  "}{content}
      </Text>
    </View>
  );
}

function SectionH1({ n, title }: { n: string; title: string }) {
  return <Text style={S.sectionH1}>{n}. {title}</Text>;
}

function SectionH2({ title }: { title: string }) {
  return <Text style={S.sectionH2}>▸ {title}</Text>;
}

function Divider() {
  return <View style={S.sectionDivider} />;
}

/**
 * LLM 텍스트 내 "▸ 소제목: 내용" 패턴을 파싱해 SectionH2 + body로 분리 렌더링.
 * ▸ 마커가 없으면 단일 Text 블록으로 출력.
 */
function LLMTextBlock({ text, style }: { text: string; style?: Record<string, unknown> }) {
  // "▸ " 로 분리 (공백 없는 경우도 처리)
  const parts = text.split(/(?=▸\s)/g).filter(Boolean);
  if (parts.length <= 1) {
    // 마커 없음 — 그냥 단일 단락
    return <Text style={{ ...S.body, ...style }}>{text}</Text>;
  }
  return (
    <>
      {parts.map((part, i) => {
        const stripped = part.replace(/^▸\s*/, "").trim();
        // "소제목: 내용" 형태로 분리
        const colonIdx = stripped.indexOf(":");
        if (colonIdx > 0 && colonIdx < 30) {
          const heading = stripped.slice(0, colonIdx).trim();
          const body    = stripped.slice(colonIdx + 1).trim();
          return (
            <View key={i} style={{ marginTop: i > 0 ? 4 : 0 }}>
              <Text style={S.sectionH2}>▸ {heading}</Text>
              {body !== "" && <Text style={{ ...S.body, marginTop: 2, ...style }}>{body}</Text>}
            </View>
          );
        }
        // 콜론 없음 — 전체를 body로
        return <Text key={i} style={{ ...S.body, marginTop: i > 0 ? 4 : 0, ...style }}>{stripped}</Text>;
      })}
    </>
  );
}

// ─── Competitor KV block (DOCX 스타일: 제품명 헤더 + 성분·채널·가격 KV) ─────────

function CompetitorKVBlocks({
  products,
  limit = 6,
  sourceNote,
}: {
  products: Array<Record<string, unknown>>;
  limit?: number;
  sourceNote?: string;
}) {
  const top = products.slice(0, limit);
  return (
    <>
      {top.map((row, i) => {
        const name    = safeStr(row["pa_product_name_local"]);
        const inn     = safeStr(row["pa_ingredient_inn"]);
        const channel = safeStr(row["market_segment"], safeStr(row["pa_price_type"]));
        const price   = safeNum(row["pa_price_local"]);
        const unit    = safeStr(row["pa_currency_unit"], "PAB");
        return (
          <View key={i} style={{
            marginBottom: 6, marginLeft: 12,
            paddingLeft: 8,
            borderLeftWidth: 1.5, borderLeftColor: "#D9E2EF",
          }}>
            <Text style={{ fontSize: 9, fontWeight: "bold", color: C_BODY, marginBottom: 1 }}>
              {name}
            </Text>
            <KVRow label="성분 (INN)"  value={inn} />
            <KVRow label="시장 채널"   value={channel} />
            <KVRow label="참고 가격"   value={price !== null ? `${unit} ${price.toFixed(2)}` : "—"} />
          </View>
        );
      })}
      {products.length > limit && (
        <Text style={S.sourceNote}>
          외 {products.length - limit}개 제품 포함
          {sourceNote ? `  (${sourceNote})` : ""}
        </Text>
      )}
    </>
  );
}

// ─── Table helpers ────────────────────────────────────────────────────────────

interface ColDef { label: string; width: string; align?: "left" | "center" | "right" }

function DataTable({
  cols,
  rows,
}: {
  cols: ColDef[];
  rows: string[][];
}) {
  return (
    <View style={S.tblWrap}>
      {/* header */}
      <View style={S.tblHdrRow}>
        {cols.map((c, ci) => (
          <Text key={ci} style={{ ...S.tblHdrCell, width: c.width, textAlign: c.align ?? "left" }}>
            {c.label}
          </Text>
        ))}
      </View>
      {/* rows */}
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

  return (
    <>
      <View style={S.tblWrap}>
        {/* header */}
        <View style={S.tblHdrRow}>
          <Text style={{ ...S.tblHdrCell, width: "18%" }}>시나리오</Text>
          <Text style={{ ...S.tblHdrCell, width: "30%", textAlign: "right" }}>현지 참고가 (PAB=USD)</Text>
          <Text style={{ ...S.tblHdrCell, width: "28%", textAlign: "right" }}>FOB 역산 (USD)</Text>
          <Text style={{ ...S.tblHdrCell, width: "24%", textAlign: "right" }}>KRW 환산</Text>
        </View>
        {rows.map(({ card, rowStyle, labelColor }, ri) => {
          const pab = card.price_pab;
          const usd = card.price_usd;
          const krw = card.price_krw;
          return (
            <View key={ri} style={rowStyle}>
              <Text style={{ ...S.tblCell, width: "18%", fontWeight: "bold", color: labelColor }}>
                {card.label !== "—" ? card.label : ["저가 진입","기준가","프리미엄"][ri]}
              </Text>
              <Text style={{ ...S.tblCell, width: "30%", textAlign: "right" }}>
                {pab !== null ? `${currencyLabel} ${pab.toFixed(2)}` : "—"}
              </Text>
              <Text style={{ ...S.tblCell, width: "28%", textAlign: "right" }}>
                {usd !== null ? `≈ USD ${usd.toFixed(2)}` : "—"}
              </Text>
              <Text style={{ ...S.tblCell, width: "24%", textAlign: "right" }}>
                {krw !== null ? `KRW ${Math.round(krw).toLocaleString("en-US")}` : "—"}
              </Text>
            </View>
          );
        })}
      </View>
      {/* 시나리오별 전략 설명 + FOB 역산 수식 블록 */}
      {rows.map(({ card, labelColor }, ri) => (
        <View key={ri} style={{ marginBottom: 6 }}>
          {/* 전략 요약 */}
          <View style={S.bulletRow}>
            <Text style={{ ...S.bulletDot, color: labelColor }}>▸</Text>
            <Text style={S.bulletText}>
              <Text style={{ fontWeight: "bold", color: labelColor }}>
                {card.label !== "—" ? card.label : ["저가 진입","기준가","프리미엄"][ri]}
              </Text>
              {"  "}{card.basis !== "—" ? card.basis : "—"}
            </Text>
          </View>
          {/* FOB 역산 수식 강조 박스 */}
          {card.calculation !== "—" && (
            <View style={{
              marginLeft: 14,
              marginTop: 2,
              paddingHorizontal: 8,
              paddingVertical: 4,
              backgroundColor: "#F5F7FF",
              borderLeftWidth: 2,
              borderLeftColor: labelColor,
            }}>
              <Text style={{ fontSize: 8, color: "#333", fontFamily: "NanumGothic" }}>
                ▶ FOB 역산식:{"  "}{card.calculation}
              </Text>
            </View>
          )}
        </View>
      ))}
    </>
  );
}

// ─── Page header / footer ────────────────────────────────────────────────────

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

// ─── Props & data extractors ─────────────────────────────────────────────────

export interface CombinedReportDocumentProps {
  product: { id: string; name: string; ingredient: string };
  country: string;
  generatedAt: Date;
  marketReport: Report;
  publicPricingReport: Report;
  privatePricingReport: Report;
  partnerReport: Report;
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
  const r = safeRecord(sc);
  return {
    label: safeStr(r["label"]),
    price_pab: safeNum(r["price_pab"]),
    price_usd: safeNum(r["price_usd"]),
    price_krw: safeNum(r["price_krw"]),
    basis: safeStr(r["basis"], "—"),
    calculation: safeStr(r["calculation"], "—"),
  };
}

function extractScenariosFromData(data: Record<string, unknown> | null): {
  agg: ScenarioCard;
  avg: ScenarioCard;
  cons: ScenarioCard;
} | null {
  if (data === null) return null;
  const mr = safeRecord(data["marketResult"]);
  const sc = safeRecord(mr["scenarios"]);
  if (Object.keys(sc).length === 0) return null;
  // Support both key styles: new (agg/avg/cons) and legacy (aggressive/average/conservative)
  const get = (k1: string, k2: string) =>
    sc[k1] !== undefined ? sc[k1] : sc[k2];
  return {
    agg:  extractScenarioCard(get("agg",  "aggressive")),
    avg:  extractScenarioCard(get("avg",  "average")),
    cons: extractScenarioCard(get("cons", "conservative")),
  };
}

// ─── Report 1 — 시장보고서 ─────────────────────────────────────────────────

function MarketReportSection({
  product,
  generatedAt,
  marketReport,
  publicPricingReport,
}: {
  product: CombinedReportDocumentProps["product"];
  generatedAt: Date;
  marketReport: Report;
  publicPricingReport: Report;
}) {
  const mData = marketReport.report_data ?? {};
  const pData = publicPricingReport.report_data ?? {};

  // 파나마 거시 통계 (panama_macro_stats)
  const macro         = safeRecord(mData["macroStats"]);
  const macroPop      = safeNum(macro["population"]);
  const macroPopSrc   = safeStr(macro["population_source"],         "World Bank 2024");
  const macroGdpPc    = safeNum(macro["gdp_per_capita_usd"]);
  const macroGdpTot   = safeNum(macro["gdp_total_usd_billion"]);
  const macroGdpSrc   = safeStr(macro["gdp_source"],               "IMF 2024");
  const macroPharma   = safeNum(macro["pharma_market_usd"]);
  const macroPharmaM  = macroPharma !== null ? macroPharma / 1_000_000 : null;
  const macroPharmaSrc= safeStr(macro["pharma_market_source"],     "Statista 2024");
  const macroImportPct= safeNum(macro["import_dependency_pct"]);
  const macroImportSrc= safeStr(macro["import_dependency_source"], "KOTRA / ITA 2024");

  // 치료영역 통계 (panama_therapeutic_stats)
  const therStats      = safeRecord(mData["therapeuticStats"]);
  const healthExpPct   = safeNum(therStats["health_expenditure_pct_gdp"]);
  const healthExpPc    = safeNum(therStats["health_expenditure_usd_per_capita"]);
  const prevalencePct  = safeNum(therStats["prevalence_rate_pct"]);
  const prevalenceSrc  = safeStr(therStats["prevalence_source"], "PAHO/WHO");
  const prevalenceYr   = safeNum(therStats["prevalence_year"]);
  const therMarketUsd  = safeNum(therStats["therapeutic_market_usd"]);
  const therMarketSrc  = safeStr(therStats["therapeutic_market_source"], "IQVIA");
  const therMarketYr   = safeNum(therStats["therapeutic_market_year"]);

  // 경쟁사 개별 제품 목록
  const competitorProducts = Array.isArray(mData["competitorProducts"])
    ? (mData["competitorProducts"] as Array<Record<string, unknown>>)
    : [];

  // 논문 인용
  const paperCitations = Array.isArray(mData["paperCitations"])
    ? (mData["paperCitations"] as Array<Record<string, unknown>>)
    : [];

  // EML
  const emlWho   = mData["emlWho"]   === true;
  const emlPaho  = mData["emlPaho"]  === true;
  const emlMinsa = mData["emlMinsa"] === true;

  // 가격 데이터 — market report 자체 + pricing report 교차 확인
  const mComp = safeRecord(mData["competitorPrices"]);
  const pComp = safeRecord(pData["competitorPrices"]);
  // market 우선, 없으면 pricing에서
  const pubChM  = safeRecord(mComp["publicProcurement"]);
  const pubChP  = safeRecord(pComp["publicProcurement"]);
  const privChM = safeRecord(mComp["privateRetail"]);
  const privChP = safeRecord(pComp["privateRetail"]);

  const pubAvg  = safeNum(pubChM["avg"])  ?? safeNum(pubChP["avg"]);
  const pubMin  = safeNum(pubChP["min"]);
  const pubMax  = safeNum(pubChP["max"]);
  const pubCnt  = (safeNum(pubChM["count"]) ?? safeNum(pubChP["count"]) ?? 0);
  const privAvg = safeNum(privChM["avg"]) ?? safeNum(privChP["avg"]);
  const privCnt = (safeNum(privChM["count"]) ?? safeNum(privChP["count"]) ?? 0);

  // LLM 생성 시장분석 블록 (market_generator.ts Haiku 호출)
  const ma     = safeRecord(mData["marketAnalysis"]);
  const llmB1  = safeStr(ma["block1_macro_overview"],          "");
  const llmB2  = safeStr(ma["block2_regulatory_path"],         "");
  const llmB3  = safeStr(ma["block3_price_context"],           "");
  const llmB4  = safeStr(ma["block4_risk_factors"],            "");
  const llmB5  = safeStr(ma["block5_action_recommendation"],   "");

  // 통계
  const panamacompraCount  = safeNum(mData["panamacompraCount"])  ?? 0;
  const privateRetailCount = safeNum(mData["privateRetailCount"]) ?? 0;
  const srcAgg = Array.isArray(mData["sourceAggregation"]) ? mData["sourceAggregation"] : [];

  const dateStr = generatedAt.toISOString().slice(0, 10);

  return (
    <Page size="A4" style={S.page}>
      <DocHeader label="파나마 시장보고서" />
      <DocFooter />

      {/* 제목 블록 */}
      <Text style={S.docTitle}>파나마 시장보고서 — {product.name}</Text>
      <Text style={S.docSubtitle}>
        {product.name} ({product.ingredient})  |  HS CODE: 3004.90  |  Panama  |  {dateStr}
      </Text>

      {/* 1. 의료 거시환경 파악 */}
      <SectionH1 n="1" title="의료 거시환경 파악" />
      <KVRow
        label="인구"
        value={macroPop !== null
          ? `${macroPop.toLocaleString("en-US")}명 (${macroPopSrc})`
          : "4,515,577명 (World Bank 2024)"}
      />
      <KVRow
        label="1인당 GDP"
        value={macroGdpPc !== null
          ? `USD ${macroGdpPc.toLocaleString("en-US")} (${macroGdpSrc})`
          : "USD 19,445 (IMF 2024)"}
      />
      <KVRow
        label="국가 GDP"
        value={macroGdpTot !== null
          ? `USD ${macroGdpTot.toFixed(1)} Billion (${macroGdpSrc})`
          : "USD 87.6 Billion (IMF 2024)"}
      />
      <KVRow
        label="의약품 시장 규모"
        value={macroPharmaM !== null
          ? `USD ${macroPharmaM.toFixed(1)}M (${macroPharmaSrc})`
          : "USD 534.5M (Statista 2024)"}
      />
      <KVRow
        label="의약품 수입 의존도"
        value={macroImportPct !== null
          ? `~${macroImportPct.toFixed(0)}% (${macroImportSrc})`
          : "~90% (KOTRA / ITA 2024)"}
      />
      {healthExpPct !== null && (
        <KVRow
          label="보건지출 (GDP%)"
          value={`${healthExpPct.toFixed(2)}% GDP (${healthExpPc !== null ? `USD ${healthExpPc.toFixed(0)}/인당, ` : ""}World Bank 2023)`}
        />
      )}
      {prevalencePct !== null && (
        <KVRow
          label="치료영역 유병률"
          value={`${prevalencePct.toFixed(1)}% (${prevalenceSrc}${prevalenceYr !== null ? `, ${prevalenceYr}` : ""})`}
        />
      )}
      {therMarketUsd !== null && (
        <KVRow
          label="치료영역 시장 규모"
          value={`USD ${(therMarketUsd / 1_000_000).toFixed(1)}M (${therMarketSrc}${therMarketYr !== null ? `, ${therMarketYr}` : ""})`}
        />
      )}
      <KVRow label="EML 등재 여부" value={`WHO: ${emlWho ? "등재" : "미등재"}  |  PAHO: ${emlPaho ? "등재" : "미등재"}  |  MINSA: ${emlMinsa ? "등재" : "미등재"}`} />
      {panamacompraCount > 0 && (
        <KVRow label="공공조달 이력" value={`${panamacompraCount}건 (PanamaCompra 기록 기준)`} />
      )}
      {privateRetailCount > 0 && (
        <KVRow label="민간 소매 표본" value={`${privateRetailCount}건`} />
      )}
      {/* AI 생성 거시환경 분석 (narrative) */}
      {llmB1 !== "" ? (
        <Text style={{ ...S.body, marginTop: 6 }}>{llmB1}</Text>
      ) : (
        // LLM narrative 없을 때 데이터 기반 fallback (개별 보고서 수준의 인사이트)
        <Text style={{ ...S.body, marginTop: 6 }}>
          파나마는 인구 약 {macroPop !== null ? (macroPop / 1_000_000).toFixed(2) + "백만 명" : "435만 명"},
          1인당 GDP USD {macroGdpPc !== null ? macroGdpPc.toLocaleString("en-US") : "19,445"}로 중미 최고 소득 국가입니다.
          의약품 시장 규모 {macroPharmaM !== null ? `USD ${macroPharmaM.toFixed(1)}M` : "USD 534.5M"}({macroPharmaSrc}),
          수입 의존도 약 {macroImportPct !== null ? macroImportPct.toFixed(0) : "90"}%로
          한국산 수입의약품 진출에 유리한 환경입니다. {product.name}의 EML 등재 현황: WHO {emlWho ? "등재" : "미등재"}, PAHO {emlPaho ? "등재" : "미등재"}, MINSA {emlMinsa ? "등재" : "미등재"}.
          {prevalencePct !== null ? ` 치료영역 유병률 ${prevalencePct.toFixed(1)}%로 만성질환 관리 수요 증가와 함께 지속 성장세를 보이고 있어 한국산 고품질 개량신약에 대한 수요가 기대됩니다.` : " 만성질환 관리 수요 증가와 함께 한국산 고품질 개량신약에 대한 수요가 기대됩니다."}
        </Text>
      )}

      <Divider />

      {/* 2. 무역/규제 환경 */}
      <SectionH1 n="2" title="무역/규제 환경" />
      {llmB2 !== "" ? (
        <LLMTextBlock text={llmB2} />
      ) : (
        <>
          <SectionH2 title="MINSA 등록 현황" />
          <Text style={S.body}>
            파나마 의약품은 MINSA 산하 DNFD의 사전 등록을 요하며, 통상 12–18개월 소요됩니다.
            기등록 INN 성분은 서류 간소화 절차가 가능합니다.
          </Text>
          <SectionH2 title="관세 및 무역" />
          <Text style={S.body}>
            한-파나마 FTA(2021.3 발효) 완성의약품(HS 3004) 관세 0%, ITBMS 의약품 면세 적용.
          </Text>
        </>
      )}

      <Divider />

      {/* 3. 참고 가격 — 크롤링 데이터 + 근거 명시 */}
      <SectionH1 n="3" title="참고 가격" />
      <Text style={{ ...S.body, color: C_GRAY, marginBottom: 4 }}>
        ※ 근거: PanamaCompra 공공조달 낙찰가 및 ACODECO(Autoridad de Protección al Consumidor, 소비자보호원)·CABAMED 약국 소매가 DB 기준
      </Text>
      {/* 경쟁사 제품 참고가 테이블 — 양식: 업체명 | 제품명 | 성분함량 | 시장가 */}
      {competitorProducts.length > 0 ? (
        <View style={S.tblWrap}>
          <View style={S.tblHdrRow}>
            <Text style={{ ...S.tblHdrCell, width: "28%" }}>업체명 (제조사)</Text>
            <Text style={{ ...S.tblHdrCell, width: "28%" }}>제품명</Text>
            <Text style={{ ...S.tblHdrCell, width: "26%" }}>성분·함량</Text>
            <Text style={{ ...S.tblHdrCell, width: "18%", textAlign: "right" }}>시장가</Text>
          </View>
          {competitorProducts.slice(0, 8).map((row, i) => {
            const mfr   = safeStr(row["pa_manufacturer"] ?? row["pa_brand_name"], safeStr(row["pa_product_name_local"]));
            const prod  = safeStr(row["pa_product_name_local"]);
            const inn   = safeStr(row["pa_ingredient_inn"]);
            const price = safeNum(row["pa_price_local"]);
            const unit  = safeStr(row["pa_currency_unit"], "PAB");
            const priceStr = price !== null ? `${unit} ${price.toFixed(2)}` : "—";
            return (
              <View key={i} style={i % 2 === 0 ? S.tblRow : S.tblRowAlt}>
                <Text style={{ ...S.tblCell, width: "28%", fontSize: 8 }}>{mfr}</Text>
                <Text style={{ ...S.tblCell, width: "28%", fontSize: 8 }}>{prod}</Text>
                <Text style={{ ...S.tblCell, width: "26%", fontSize: 8 }}>{inn}</Text>
                <Text style={{ ...S.tblCell, width: "18%", fontSize: 8, textAlign: "right" }}>{priceStr}</Text>
              </View>
            );
          })}
        </View>
      ) : (
        <DataTable
          cols={[
            { label: "채널",    width: "30%" },
            { label: "기준",    width: "28%" },
            { label: "평균가",  width: "24%", align: "right" },
            { label: "표본 수", width: "18%", align: "right" },
          ]}
          rows={[
            ["공공조달 (PanamaCompra)", "ALPS 낙찰가 기준",      pubAvg  !== null ? `PAB ${pubAvg.toFixed(2)}`  : "—", pubCnt  > 0 ? `${pubCnt}건`  : "0건"],
            ["민간 소매 (ACODECO/CABAMED)", "약국 소매가 기준", privAvg !== null ? `PAB ${privAvg.toFixed(2)}` : "—", privCnt > 0 ? `${privCnt}건` : "0건"],
          ]}
        />
      )}
      {llmB3 !== "" ? (
        <LLMTextBlock text={llmB3} style={{ marginTop: 4 }} />
      ) : (
        // 가격 narrative fallback (Case 판정 + 전략 제안)
        <Text style={{ ...S.body, marginTop: 4 }}>
          파나마 현지 {product.name} 관련 제품 공공조달 평균가는{" "}
          {pubAvg !== null ? `PAB ${pubAvg.toFixed(4)} (${pubCnt}건)` : `데이터 없음 (0건)`},{" "}
          민간 소매가는{" "}
          {privAvg !== null ? `PAB ${privAvg.toFixed(2)} (${privCnt}건)` : `데이터 없음 (0건)`} 수준입니다.
          {pubAvg !== null && privAvg !== null
            ? ` 전략 제안: Tier 2 경쟁사 대비 10~15% 할인 포지셔닝으로 공공 채널 초기 진입을 권고합니다.`
            : " 추가 데이터 수집 후 가격 전략 재수립 권고."}
        </Text>
      )}

      <Divider />

      {/* 4. 리스크 / 조건 */}
      <SectionH1 n="4" title="리스크 / 조건" />
      {llmB4 !== "" ? (
        <LLMTextBlock text={llmB4} />
      ) : (
        <>
          <SectionH2 title="규제 심사 소요 기간" />
          <Text style={S.body}>MINSA 신규 등록 통상 12~18개월, 행정 지연 시 24개월 이상 가능. 사전 자문(Pre-submission) 통해 서류 보완 최소화 권장.</Text>
          <SectionH2 title="경쟁 강도" />
          <Text style={S.body}>동일 INN 성분 다국적 제네릭(Bayer, Sandoz, Genfar 등) 기진입 시장으로 경쟁 강도 높음. 처방 기반 시장 내 신규 진입자의 처방 전환이 핵심 과제.</Text>
          <SectionH2 title="포뮬러리 등재" />
          <Text style={S.body}>CSS/MINSA 포뮬러리 등재 요건 충족 필요. EML 미등재 성분의 경우 공공 조달 입찰 자격 제한 가능성 있음.</Text>
        </>
      )}

      {/* 진출 전략 권고 — block5 narrative (개별 보고서 수준) */}
      <SectionH2 title="진출 전략 권고" />
      {llmB5 !== "" ? (
        <Text style={S.body}>{llmB5}</Text>
      ) : (
        <Text style={S.body}>
          단기: ALPS 공공 입찰 전 MINSA 등록 + Formulario Nacional 등재 신청 병행.
          중기: 약국 체인 파트너(Arrocha, Rey, Metro)와 민간 유통 계약 체결.
          {pubAvg !== null && privAvg !== null
            ? " 가격 경쟁력 확보 전략 수립."
            : " 추가 가격 데이터 수집 후 전략 정밀화."}
        </Text>
      )}

      <Divider />

      {/* 5. 근거 및 출처 */}
      <SectionH1 n="5" title="근거 및 출처" />

      {/* 5-1. 퍼플렉시티 추천 논문 — 없으면 "-" 공란 처리 */}
      <SectionH2 title="5-1. 퍼플렉시티 추천 논문" />
      <View style={S.tblWrap}>
        <View style={S.tblHdrRow}>
          <Text style={{ ...S.tblHdrCell, width: "8%",  textAlign: "center" }}>No.</Text>
          <Text style={{ ...S.tblHdrCell, width: "55%" }}>논문 제목 및 출처</Text>
          <Text style={{ ...S.tblHdrCell, width: "37%" }}>한국어 요약</Text>
        </View>
        {paperCitations.length > 0 ? (
          paperCitations.slice(0, 5).map((cite, i) => {
            const no    = String(safeNum(cite["citation_no"]) ?? i + 1);
            const title = safeStr(cite["title"], "—");
            const journal = safeStr(cite["journal"], "");
            const year  = safeNum(cite["year"]);
            const url   = safeStr(cite["url"], "");
            const titleLine = [title, journal !== "" ? journal : null, year !== null ? String(year) : null]
              .filter(Boolean).join("  |  ");
            const summaryKo = safeStr(cite["summary_ko"], "—");
            return (
              <View key={i} style={i % 2 === 0 ? S.tblRow : S.tblRowAlt}>
                <Text style={{ ...S.tblCell, width: "8%",  textAlign: "center", fontSize: 8 }}>{no}</Text>
                <Text style={{ ...S.tblCell, width: "55%", fontSize: 8 }}>
                  {titleLine}{url !== "" ? `\n${url}` : ""}
                </Text>
                <Text style={{ ...S.tblCell, width: "37%", fontSize: 8 }}>{summaryKo}</Text>
              </View>
            );
          })
        ) : (
          <>
            {[1, 2, 3].map(n => (
              <View key={n} style={S.tblRow}>
                <Text style={{ ...S.tblCell, width: "8%",  textAlign: "center", fontSize: 8 }}>{n}</Text>
                <Text style={{ ...S.tblCell, width: "55%", fontSize: 8, color: C_GRAY }}>—</Text>
                <Text style={{ ...S.tblCell, width: "37%", fontSize: 8, color: C_GRAY }}>—</Text>
              </View>
            ))}
          </>
        )}
      </View>

      {/* 5-2. 사용된 DB/기관 */}
      <SectionH2 title="5-2. 사용된 DB/기관" />
      <BulletItem text="PanamaCompra — 공공조달 전자입찰 시스템(Panama Electronic Procurement System)" />
      <BulletItem text="ACODECO / CABAMED — 파나마 소비자보호원(Autoridad de Protección al Consumidor) 의약품 가격 DB" />
      <BulletItem text="MINSA / DNFD — 파나마 보건부(Ministerio de Salud) 의약품 등록 정보" />
      <BulletItem text="WHO EML(Essential Medicines List) / PAHO 필수의약품 목록" />
      <BulletItem text={`World Bank Open Data — 인구·GDP 지표 (출처: ${macroPopSrc})`} />
      <BulletItem text={`${macroPharmaSrc} — Panama Pharmaceutical Market${macroPharmaM !== null ? ` USD ${macroPharmaM.toFixed(1)}M` : ""}`} />
      <BulletItem text="KOTRA 파나마 의약품 시장 동향 보고서 (2024)" />
      {/* 0건 수집 항목 필터 — 실제 데이터 있는 출처만 표시 (개별 보고서 수준) */}
      {srcAgg.length > 0 && (
        (srcAgg as Array<Record<string, unknown>>)
          .filter((row) => (safeNum(row["cnt"]) ?? 0) > 0)
          .slice(0, 6)
          .map((row, i) => (
            <BulletItem key={i} text={`${safeStr(row["pa_source"])} — ${safeNum(row["cnt"]) ?? 0}건 수집`} />
          ))
      )}

      <Text style={S.disclaimer}>
        ※ 본 보고서는 DB 수집 데이터와 AI(Anthropic Claude Haiku) 분석에 기반한 참고 자료이며,
        최종 의사결정 전 담당자 검토가 필요합니다.
      </Text>
    </Page>
  );
}

// ─── Report 2 — 수출가격전략 ──────────────────────────────────────────────────

function PricingReportSection({
  product,
  generatedAt,
  marketReport,
  publicPricingReport,
  privatePricingReport,
}: {
  product: CombinedReportDocumentProps["product"];
  generatedAt: Date;
  marketReport: Report;
  publicPricingReport: Report;
  privatePricingReport: Report;
}) {
  const pData  = publicPricingReport.report_data ?? {};
  const prData = privatePricingReport.report_data ?? {};

  const pubScenarios  = extractScenariosFromData(pData);
  const privScenarios = extractScenariosFromData(prData);

  // 공공 시장 LLM 블록
  // 공공 시장 LLM 블록
  const phase2Raw = safeRecord(pData["phase2Report"]);
  const b1 = safeStr(phase2Raw["block1_input_summary"], "");
  const b2 = safeStr(phase2Raw["block2_fob_calculation"], "");
  const b3 = safeStr(phase2Raw["block3_scenarios"], "");
  const b4 = safeStr(phase2Raw["block4_incoterms"], "");
  const b5 = safeStr(phase2Raw["block5_risk_and_recommendation"], "");

  // 민간 시장 LLM 블록
  const prPhase2Raw = safeRecord(prData["phase2Report"]);
  const prB1 = safeStr(prPhase2Raw["block1_input_summary"], "");
  const prB2 = safeStr(prPhase2Raw["block2_fob_calculation"], "");
  const prB3 = safeStr(prPhase2Raw["block3_scenarios"], "");
  const prB5 = safeStr(prPhase2Raw["block5_risk_and_recommendation"], "");

  const compPrices = safeRecord(pData["competitorPrices"]);
  const pubCh  = safeRecord(compPrices["publicProcurement"]);
  const privCh = safeRecord(compPrices["privateRetail"]);
  const pubAvg  = safeNum(pubCh["avg"]);
  const privAvg = safeNum(privCh["avg"]);
  const pubCnt  = safeNum(pubCh["count"]) ?? 0;
  const privCnt = safeNum(privCh["count"]) ?? 0;

  const pubMrResult  = safeRecord(pData["marketResult"]);
  const formula = safeStr(pubMrResult["formula"], "FOB 역산 공식");

  const mData = marketReport.report_data ?? {};
  const emlWho   = mData["emlWho"]   === true;
  const emlPaho  = mData["emlPaho"]  === true;
  const emlMinsa = mData["emlMinsa"] === true;

  // 파나마 거시 통계 (market report에서 참조)
  const macroPr        = safeRecord(mData["macroStats"]);
  const macroPharmaUsdPr = safeNum(macroPr["pharma_market_usd"]);
  const macroPharmaMPr   = macroPharmaUsdPr !== null ? macroPharmaUsdPr / 1_000_000 : null;
  const macroPharmaSrcPr = safeStr(macroPr["pharma_market_source"], "Statista 2024");

  // 경쟁사 개별 제품 목록 (market report에서 참조)
  const competitorProductsPr = Array.isArray(mData["competitorProducts"])
    ? (mData["competitorProducts"] as Array<Record<string, unknown>>)
    : [];

  const dateStr = generatedAt.toISOString().slice(0, 10);

  // 기준 가격 — 공공 평균 우선, 없으면 민간 평균
  const basePrice = pubAvg ?? privAvg;

  return (
    <Page size="A4" style={S.page}>
      <DocHeader label="파나마 수출 가격 전략 보고서" />
      <DocFooter />

      {/* 제목 블록 */}
      <Text style={S.docTitle}>파나마 수출 가격 전략 보고서 — {product.name}</Text>
      <Text style={S.docSubtitle}>
        {product.name} ({product.ingredient})  |  Panama  |  {dateStr}
      </Text>

      {/* 1. 파나마 거시 시장 */}
      <SectionH1 n="1" title="파나마 거시 시장" />
      <Text style={S.body}>
        파나마는 의약품 시장 규모 약 {macroPharmaMPr !== null
          ? `USD ${macroPharmaMPr.toFixed(1)}M(${macroPharmaSrcPr})`
          : "USD 534.5M(2024, Statista)"}으로 중미 최대 의약품 유통 허브입니다.
        수입 의존도 ~90%로 한국 제약사 진출 여건이 양호하며, 공공·민간 채널로 구분됩니다.
        EML 등재: WHO {emlWho ? "○" : "✕"} / PAHO {emlPaho ? "○" : "✕"} / MINSA {emlMinsa ? "○" : "✕"}.
      </Text>
      {(b1 !== "" || prB1 !== "") && (
        <Text style={{ ...S.body, marginTop: 2 }}>
          {b1 !== "" ? b1 : prB1}
        </Text>
      )}

      <Divider />

      {/* 2. 단가 (시장 기준가) — 개별 P2 양식: 공공/민간 별도 테이블 + 천장가 % */}
      <SectionH1 n="2" title={`${product.name} 단가 (시장 기준가)`} />
      <SectionH2 title="공공시장 (ALPS / PanamaCompra 기준)" />
      <ScenarioTable scenarios={pubScenarios} />
      <SectionH2 title="민간시장 (ACODECO / CABAMED 기준)" />
      <ScenarioTable scenarios={privScenarios} />
      {b2 !== "" && (
        <>
          <SectionH2 title="공공 시장 FOB 역산 분석" />
          <Text style={S.body}>{b2}</Text>
        </>
      )}
      {prB2 !== "" && (
        <>
          <SectionH2 title="민간 시장 FOB 역산 분석" />
          <Text style={S.body}>{prB2}</Text>
        </>
      )}

      <Divider />

      {/* 3. 거래처 참고 가격 — 채널별 집계 (개별 P2 양식: 평균/최저/최고/건수/출처) */}
      <SectionH1 n="3" title="거래처 참고 가격" />
      <Text style={{ ...S.body, color: C_GRAY, marginBottom: 4 }}>
        ※ 근거: ACODECO(소비자보호원) PDF / PanamaCompra 공공조달 / SuperXtra VTEX 약국 체인
      </Text>
      {/* 채널별 집계 테이블 — 평균/최저/최고/건수 (개별 P2와 동일) */}
      <DataTable
        cols={[
          { label: "채널",    width: "32%" },
          { label: "평균 (PAB)", width: "16%", align: "right" },
          { label: "최저 (PAB)", width: "16%", align: "right" },
          { label: "최고 (PAB)", width: "16%", align: "right" },
          { label: "건수",       width: "10%", align: "right" },
          { label: "출처",       width: "10%", align: "left"  },
        ]}
        rows={[
          [
            "공공조달 (PanamaCompra)",
            pubAvg !== null ? pubAvg.toFixed(2) : "—",
            safeNum(pubCh["min"]) !== null ? (safeNum(pubCh["min"]) as number).toFixed(2) : "—",
            safeNum(pubCh["max"]) !== null ? (safeNum(pubCh["max"]) as number).toFixed(2) : "—",
            pubCnt > 0 ? String(pubCnt) : "0",
            "Ley 419",
          ],
          [
            "ACODECO 소비자 모니터링",
            privAvg !== null ? privAvg.toFixed(2) : "—",
            safeNum(privCh["min"]) !== null ? (safeNum(privCh["min"]) as number).toFixed(2) : "—",
            safeNum(privCh["max"]) !== null ? (safeNum(privCh["max"]) as number).toFixed(2) : "—",
            privCnt > 0 ? String(privCnt) : "0",
            "CABAMED",
          ],
        ]}
      />
      {/* 개별 거래 list — 데이터 있을 때만, dedupe 적용 (제품명+가격 기준) */}
      {competitorProductsPr.length > 0 && (() => {
        const seen = new Set<string>();
        const dedup = competitorProductsPr.filter((row) => {
          const k = `${safeStr(row["pa_product_name_local"])}|${safeNum(row["pa_price_local"]) ?? "—"}`;
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        }).slice(0, 8);
        return (
          <View style={{ marginTop: 6 }}>
            <Text style={{ ...S.body, color: C_GRAY, fontSize: 8, marginBottom: 2 }}>
              ▸ 개별 거래 샘플 ({dedup.length}건):
            </Text>
            <View style={S.tblWrap}>
              <View style={S.tblHdrRow}>
                <Text style={{ ...S.tblHdrCell, width: "32%" }}>제품명</Text>
                <Text style={{ ...S.tblHdrCell, width: "30%" }}>성분·함량</Text>
                <Text style={{ ...S.tblHdrCell, width: "20%", textAlign: "right" }}>시장가 (PAB)</Text>
                <Text style={{ ...S.tblHdrCell, width: "18%", textAlign: "right" }}>KRW 환산</Text>
              </View>
              {dedup.map((row, i) => {
                const prod  = safeStr(row["pa_product_name_local"]);
                const inn   = safeStr(row["pa_ingredient_inn"]);
                const price = safeNum(row["pa_price_local"]);
                return (
                  <View key={i} style={i % 2 === 0 ? S.tblRow : S.tblRowAlt}>
                    <Text style={{ ...S.tblCell, width: "32%", fontSize: 8 }}>{prod}</Text>
                    <Text style={{ ...S.tblCell, width: "30%", fontSize: 8 }}>{inn}</Text>
                    <Text style={{ ...S.tblCell, width: "20%", fontSize: 8, textAlign: "right" }}>
                      {price !== null ? `PAB ${price.toFixed(2)}` : "—"}
                    </Text>
                    <Text style={{ ...S.tblCell, width: "18%", fontSize: 8, textAlign: "right" }}>
                      {price !== null ? `${Math.round(price * KRW_PER_USD).toLocaleString("en-US")}원` : "—"}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        );
      })()}
      {b4 !== "" && (
        <>
          <SectionH2 title="INCOTERMS 역산 참고" />
          <Text style={S.body}>{b4}</Text>
        </>
      )}

      <Divider />

      {/* 4. 시나리오 인사이트 — §2에서 시나리오 테이블 이미 표시했으므로 narrative만 (페이지 중복 방지) */}
      {(b3 !== "" || prB3 !== "") && (
        <>
          <SectionH1 n="4" title="시나리오 분석" />
          {b3 !== "" && (
            <>
              <SectionH2 title="공공 시장 시나리오 분석" />
              <Text style={S.body}>{b3}</Text>
            </>
          )}
          {prB3 !== "" && (
            <>
              <SectionH2 title="민간 시장 시나리오 분석" />
              <Text style={S.body}>{prB3}</Text>
            </>
          )}
        </>
      )}

      {/* 5. 리스크 및 전략 권고 */}
      {(b5 !== "" || prB5 !== "") && (
        <>
          <Divider />
          <SectionH1 n="5" title="리스크 및 전략 권고" />
          {b5 !== "" && (
            <>
              <SectionH2 title="공공 시장 전략 권고" />
              <Text style={S.body}>{b5}</Text>
            </>
          )}
          {prB5 !== "" && (
            <>
              <SectionH2 title="민간 시장 전략 권고" />
              <Text style={S.body}>{prB5}</Text>
            </>
          )}
        </>
      )}

      <Text style={S.disclaimer}>
        ※ 본 산출 결과는 AI 분석에 기반한 추정치이므로, 최종 의사결정 전 반드시 담당자의 검토 및 확인이 필요합니다.
        PAB(발보아, Panamanian Balboa)는 USD와 1:1 고정환율(페깅제)이므로 PAB 가격 = USD 가격입니다.
        KRW 환산: 1 USD = {KRW_PER_USD.toLocaleString("en-US")}원 (보고서 기준 환율).
      </Text>
    </Page>
  );
}

// ─── Report 3 — 바이어 리스트 ──────────────────────────────────────────────────

function PartnerReportSection({
  product,
  generatedAt,
  partnerReport,
}: {
  product: CombinedReportDocumentProps["product"];
  generatedAt: Date;
  partnerReport: Report;
}) {
  const pData = partnerReport.report_data ?? {};
  // partners 필드 우선, top10은 하위호환
  const top10 = Array.isArray(pData["partners"])
    ? (pData["partners"] as Array<Record<string, unknown>>)
    : Array.isArray(pData["top10"])
    ? (pData["top10"] as Array<Record<string, unknown>>)
    : [];

  const dateStr = generatedAt.toISOString().slice(0, 10);

  function taStr(ta: unknown): string {
    if (Array.isArray(ta) && ta.length > 0) return (ta as string[]).join(", ");
    return "—";
  }

  /** 주력상품 요약: 등록제품 우선 → 치료영역 → CPHI 카테고리 순 */
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

  /**
   * LLM 추천 이유 파싱: "① [파이프라인] ...\n② [수입이력] ..." 형식
   * ①②③④⑤ 앞에서 split → 각 세그먼트에서 번호+라벨+내용 추출
   */
  function parseReasonLines(text: string): Array<{ num: string; label: string; content: string }> {
    // ①②③④⑤ 앞에서 분리 (lookahead)
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
    // fallback: 줄 단위 반환
    return text.split(/\n/).filter(Boolean).map((l) => ({ num: "", label: "", content: l.trim() }));
  }

  return (
    <Page size="A4" style={S.page}>
      <DocHeader label="파나마 바이어 분석 보고서" />
      <DocFooter />

      {/* 제목 블록 */}
      <Text style={S.docTitle}>파나마 바이어 분석 보고서 — {product.name}</Text>
      <Text style={S.docSubtitle}>Panama  |  {dateStr}</Text>
      <Text style={S.disclaimer}>
        ※ 필터링 조건: 원료의약품(API) 기업, 다국적 글로벌 기업, 오리지널 제약사는 제외하고 완제품 유통 가능 바이어를 우선합니다.
        아래 바이어 후보는 DB 수집 및 AI 분석을 통해 도출되었으며, 개별 기업의 파나마 진출 현황 및 제품 연관성은 추가 실사가 필요합니다.
      </Text>

      {/* 1. 바이어 후보 리스트 (현지 유통 가능 바이어) */}
      <SectionH1 n="1" title={`바이어 후보 리스트 (현지 유통 가능 바이어 — ${top10.length}개사)`} />
      {top10.length === 0 ? (
        <Text style={S.body}>바이어 데이터 없음.</Text>
      ) : (
        <View style={S.tblWrap}>
          <View style={S.tblHdrRow}>
            <Text style={{ ...S.tblHdrCell, width: "6%",  textAlign: "center" }}>#</Text>
            <Text style={{ ...S.tblHdrCell, width: "38%" }}>기업명</Text>
            <Text style={{ ...S.tblHdrCell, width: "36%" }}>주력상품</Text>
            <Text style={{ ...S.tblHdrCell, width: "20%" }}>이메일</Text>
          </View>
          {top10.map((p, i) => {
            const name  = safeStr(p["company_name"]);
            const mainProduct = mainProductSummary(p);
            const email = safeStr(p["email"], "—");
            return (
              <View key={i} style={i % 2 === 0 ? S.tblRow : S.tblRowAlt}>
                <Text style={{ ...S.tblCell, width: "6%",  textAlign: "center" }}>{i + 1}</Text>
                <Text style={{ ...S.tblCell, width: "38%", fontWeight: "bold" }}>{name}</Text>
                <Text style={{ ...S.tblCell, width: "36%", fontSize: 8 }}>{mainProduct}</Text>
                <Text style={{ ...S.tblCell, width: "20%", fontSize: 7.5 }}>{email}</Text>
              </View>
            );
          })}
        </View>
      )}

      <Divider />

      {/* 2. 바이어 정보 상세 */}
      <SectionH1 n="2" title={`바이어 정보 상세 (상위 ${Math.min(10, top10.length)}개사)`} />

      {top10.slice(0, 10).map((p, i) => {
        const name    = safeStr(p["company_name"]);
        const addr    = safeStr(p["address"], "—");
        const email   = safeStr(p["email"], "—");
        const website = safeStr(p["website"], "—");
        const ta      = taStr(p["therapeutic_areas"]);
        const revUsd  = safeNum(p["revenue_usd"]);
        const empCnt  = safeNum(p["employee_count"]);
        const gmp     = p["gmp_certified"] === true ? "Yes" : p["gmp_certified"] === false ? "No" : "—";
        const impHist = p["import_history"] === true ? "Yes" : "—";
        const pubWins = safeNum(p["public_procurement_wins"]);
        const mah     = p["mah_capable"] === true ? "Yes" : "—";
        const foundedYear = safeStr(p["founded_year"], "—");

        const regProds = Array.isArray(p["registered_products"])
          ? (p["registered_products"] as string[]).join(", ")
          : safeStr(p["registered_products"], "");
        const cphiCat  = safeStr(p["cphi_category"], "");
        // 파이프라인: 등록제품 우선, 없으면 치료영역
        const pipeline = regProds !== "" ? regProds : ta !== "—" ? ta : "—";
        const mainProductDisplay = mainProductSummary(p);

        return (
          <View key={i} wrap={false}>
            <Text style={S.partnerCompanyHeader}>{i + 1}. {name}</Text>

            {/* 기업 개요 */}
            <SectionH2 title="기업 개요" />
            <Text style={S.body}>
              {name}은(는) {addr}에 소재한 의약품 유통·판매 기업입니다.
              {revUsd !== null ? ` 연매출 USD ${(revUsd / 1_000_000).toFixed(1)}M,` : ""}
              {empCnt !== null ? ` 임직원 ${empCnt}명,` : ""}
              {ta !== "" ? ` 주력 치료 영역: ${ta}.` : ""}
              {impHist === "Yes" ? " 의약품 수입 이력 보유." : ""}
              {mah === "Yes" ? " MAH 역량 보유." : ""}
            </Text>

            {/* 추천 이유: LLM 생성 5가지 기준 */}
            <SectionH2 title="추천 이유" />
            {(() => {
              const relevance = safeStr(p["product_relevance_reason"], "");
              if (relevance === "") {
                // 폴백: 데이터 기반 간략 표시
                return (
                  <>
                    <CircledItem num="①" label="파이프라인"  content={pipeline !== "—" ? `${pipeline} 취급 — ${product.name} 계열과 연관성` : "정보 수집 필요"} />
                    <CircledItem num="②" label="수입 이력"   content={impHist === "Yes" ? "의약품 수입 이력 확인됨" : "추가 확인 필요"} />
                    <CircledItem num="③" label="유통 채널"   content={p["pharmacy_chain_operator"] === true ? "약국 체인 운영으로 소매 채널 확보" : "현지 의약품 유통 채널 보유"} />
                    <CircledItem num="④" label="MAH 역량"    content={mah === "Yes" ? "위생등록 대행(MAH) 역량 보유" : "등록 역량 추가 확인 필요"} />
                    <CircledItem num="⑤" label="기업 안정성" content={revUsd !== null ? `연매출 USD ${(revUsd / 1_000_000).toFixed(1)}M 규모의 안정적 사업체` : "파나마 현지 꾸준히 운영 중"} />
                  </>
                );
              }
              // LLM 생성: ①[파이프라인] ... 형식 파싱
              const reasonLines = parseReasonLines(relevance);
              return (
                <View style={{ paddingLeft: 4 }}>
                  {reasonLines.map((r, li) => (
                    r.num !== ""
                      ? <CircledItem key={li} num={r.num} label={r.label} content={r.content} />
                      : <Text key={li} style={{ ...S.body, marginBottom: 3 }}>{r.content}</Text>
                  ))}
                </View>
              );
            })()}

            {/* 기본 정보 — 개별 P3 양식: 컴팩트 KVRow (테두리 테이블 X, 페이지당 2개 기업 수용) */}
            <SectionH2 title="기본 정보" />
            <KVRow label="주소"     value={addr} />
            <KVRow label="연락처"   value={[email !== "—" ? email : "", website !== "—" ? website : ""].filter(Boolean).join("  ·  ") || "—"} />
            <KVRow label="설립연도" value={foundedYear} />
            <KVRow label="파이프라인" value={pipeline} />
            <KVRow
              label="기업 규모"
              value={[
                revUsd !== null ? `매출 USD ${(revUsd / 1_000_000).toFixed(1)}M` : "",
                empCnt !== null ? `임직원 ${empCnt}명` : "",
              ].filter(Boolean).join("  ·  ") || "—"}
            />
            <KVRow
              label="역량"
              value={[
                impHist === "Yes" ? "수입이력" : "",
                gmp === "Yes" ? "GMP인증" : "",
                mah === "Yes" ? "MAH가능" : "",
                pubWins !== null && pubWins > 0 ? `공공조달 ${pubWins}건` : "",
                cphiCat !== "" ? `CPHI: ${cphiCat}` : "",
              ].filter(Boolean).join("  ·  ") || "—"}
            />

            <Text style={S.sourceNote}>출처: Claude AI 분석 (web_search 기반) · DB 수집 데이터</Text>
            {i < top10.length - 1 && <Divider />}
          </View>
        );
      })}
    </Page>
  );
}

// ─── Cover Page ───────────────────────────────────────────────────────────────

function CoverPage({
  product: _product,
  country,
  generatedAt,
}: {
  product: CombinedReportDocumentProps["product"];
  country: string;
  generatedAt: Date;
}) {
  const dateStr = generatedAt.toISOString().slice(0, 10);
  const countryName = country === "panama" ? "파나마" : country.toUpperCase();

  // SG 팀장 양식 정합 — 심플 표지 (큰 제목 + 회사명 + 날짜 + 하단 안내)
  // 변경 이유: 사용자 요청 — 목차·HS CODE·제품명 섹션 제거하고 팀장 양식처럼 단순화
  return (
    <Page size="A4" style={S.page}>
      <DocFooter />

      {/* 상단 여백 */}
      <View style={{ marginTop: 220 }} />

      {/* 메인 제목 (가운데 정렬, 큰 글씨) */}
      <Text style={{ fontSize: 26, fontWeight: "bold", color: C_NAVY, textAlign: "center", marginBottom: 40 }}>
        {countryName} 진출 전략 보고서
      </Text>

      {/* 회사명 (가운데) */}
      <Text style={{ fontSize: 14, color: C_NAVY, textAlign: "center", marginBottom: 16 }}>
        한국유나이티드제약
      </Text>

      {/* 날짜 (가운데) */}
      <Text style={{ fontSize: 11, color: C_GRAY, textAlign: "center", marginBottom: 200 }}>
        {dateStr}
      </Text>

      {/* 하단 구성 안내 (가운데) — 팀장 양식 */}
      <Text style={{ fontSize: 10, color: C_GRAY, textAlign: "center" }}>
        수출가격 전략 - 바이어 후보 리스트 - 시장분석
      </Text>
    </Page>
  );
}

// ─── Main Document ────────────────────────────────────────────────────────────

export function CombinedReportDocument(props: CombinedReportDocumentProps) {
  const { product, country, generatedAt, marketReport, publicPricingReport, privatePricingReport, partnerReport } = props;

  return (
    <Document
      title={`파나마 수출 통합 보고서 — ${product.name}`}
      author="한국유나이티드제약(주)"
      language="ko"
    >
      {/* 표지 */}
      <CoverPage product={product} country={country} generatedAt={generatedAt} />

      {/* Report 2: 수출가격전략 (먼저) */}
      <PricingReportSection
        product={product}
        generatedAt={generatedAt}
        marketReport={marketReport}
        publicPricingReport={publicPricingReport}
        privatePricingReport={privatePricingReport}
      />

      {/* Report 3: 바이어 리스트 */}
      <PartnerReportSection
        product={product}
        generatedAt={generatedAt}
        partnerReport={partnerReport}
      />

      {/* Report 1: 시장보고서 (마지막) */}
      <MarketReportSection
        product={product}
        generatedAt={generatedAt}
        marketReport={marketReport}
        publicPricingReport={publicPricingReport}
      />
    </Document>
  );
}
