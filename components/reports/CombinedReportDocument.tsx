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
    paddingTop: 64,
    paddingBottom: 52,
    paddingLeft: 64,
    paddingRight: 64,
    fontFamily: "NotoSansKR",
    fontSize: 9,
    color: C_BODY,
    lineHeight: 1.5,
  },
  // header / footer
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
  // sections
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
  // key-value row
  kvRow: {
    flexDirection: "row",
    marginBottom: 3,
    paddingLeft: 12,
  },
  kvLabel: {
    fontSize: 9,
    fontWeight: "bold",
    color: C_BODY,
    width: 120,
    flexShrink: 0,
  },
  kvValue: {
    fontSize: 9,
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
    fontSize: 9,
    color: C_BODY,
    flex: 1,
  },
  // circled numbered items (①②)
  circledRow: {
    flexDirection: "row",
    paddingLeft: 16,
    marginBottom: 3,
  },
  circledNum: {
    fontSize: 9,
    fontWeight: "bold",
    color: C_BODY,
    width: 20,
    flexShrink: 0,
  },
  circledText: {
    fontSize: 9,
    color: C_BODY,
    flex: 1,
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
  // partner header
  partnerCompanyHeader: {
    fontSize: 10,
    fontWeight: "bold",
    color: C_NAVY,
    marginTop: 10,
    marginBottom: 3,
  },
  // source note
  sourceNote: {
    fontSize: 8,
    color: C_GRAY,
    marginTop: 4,
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
          <Text style={{ ...S.tblHdrCell, width: "30%", textAlign: "right" }}>현지 참고가</Text>
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
      {/* scenario descriptions */}
      {rows.map(({ card, labelColor }, ri) => (
        card.basis !== "—" && (
          <View key={ri} style={S.bulletRow}>
            <Text style={{ ...S.bulletDot, color: labelColor }}>▸</Text>
            <Text style={S.bulletText}>
              <Text style={{ fontWeight: "bold", color: labelColor }}>
                {card.label !== "—" ? card.label : ["저가 진입","기준가","프리미엄"][ri]}
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
      {/* AI 생성 거시환경 분석 */}
      {llmB1 !== "" && <Text style={{ ...S.body, marginTop: 6 }}>{llmB1}</Text>}

      <Divider />

      {/* 2. 무역/규제 환경 */}
      <SectionH1 n="2" title="무역/규제 환경" />
      {llmB2 !== "" ? (
        <Text style={S.body}>{llmB2}</Text>
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
      {llmB3 !== "" && (
        <Text style={{ ...S.body, marginTop: 4 }}>{llmB3}</Text>
      )}

      <Divider />

      {/* 4. 리스크 / 조건 */}
      <SectionH1 n="4" title="리스크 / 조건" />
      {llmB4 !== "" ? (
        <Text style={S.body}>{llmB4}</Text>
      ) : (
        <>
          <SectionH2 title="규제 심사 소요 기간" />
          <Text style={S.body}>MINSA 신규 등록 심사 12–18개월, 지연 시 24개월 이상 가능.</Text>
          <SectionH2 title="포뮬러리 등재" />
          <Text style={S.body}>CSS/MINSA 포뮬러리 등재 없이 공공 입찰 자격 없음.</Text>
        </>
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
      {srcAgg.length > 0 && (
        (srcAgg as Array<Record<string, unknown>>).slice(0, 6).map((row, i) => (
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

      {/* 2. 단가 — SG 양식: "USD XX / PAB XX / KRW XX" 형식으로 3개 통화 병기 */}
      <SectionH1 n="2" title={`${product.name} 단가 (시장 기준가)`} />
      <KVRow
        label="기준 가격"
        value={basePrice !== null
          ? `PAB ${basePrice.toFixed(2)}  /  USD ${basePrice.toFixed(2)}  /  KRW ${Math.round(basePrice * KRW_PER_USD).toLocaleString("en-US")}원`
          : "—"}
      />
      <KVRow label="산정 방식" value={formula} />
      <KVRow label="시장 구분" value="공공(ALPS 조달청) / 민간(병원·약국·체인)" />
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

      {/* 3. 거래처 참고 가격 — 양식: 업체명 | 제품명 | 성분함량 | 시장가 */}
      <SectionH1 n="3" title="거래처 참고 가격" />
      <Text style={{ ...S.body, color: C_GRAY, marginBottom: 4 }}>
        ※ 근거: ACODECO(소비자보호원) PDF / PanamaCompra 공공조달 기준
      </Text>
      {competitorProductsPr.length > 0 ? (
        <View style={S.tblWrap}>
          <View style={S.tblHdrRow}>
            <Text style={{ ...S.tblHdrCell, width: "28%" }}>업체명 (제조사)</Text>
            <Text style={{ ...S.tblHdrCell, width: "28%" }}>제품명</Text>
            <Text style={{ ...S.tblHdrCell, width: "26%" }}>성분·함량</Text>
            <Text style={{ ...S.tblHdrCell, width: "18%", textAlign: "right" }}>시장가</Text>
          </View>
          {competitorProductsPr.slice(0, 8).map((row, i) => {
            const mfr  = safeStr(row["pa_manufacturer"] ?? row["pa_brand_name"], safeStr(row["pa_product_name_local"]));
            const prod = safeStr(row["pa_product_name_local"]);
            const inn  = safeStr(row["pa_ingredient_inn"]);
            const price = safeNum(row["pa_price_local"]);
            const unit  = safeStr(row["pa_currency_unit"], "PAB");
            const priceStr = price !== null ? `${unit} ${price.toFixed(2)}  /  KRW ${Math.round(price * KRW_PER_USD).toLocaleString("en-US")}원` : "—";
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
            { label: "기준",    width: "26%" },
            { label: "평균가 (PAB / KRW)", width: "30%", align: "right" },
            { label: "표본 수", width: "14%", align: "right" },
          ]}
          rows={[
            ["공공조달 (PanamaCompra)", "ALPS 낙찰가 기준",  pubAvg  !== null ? `PAB ${pubAvg.toFixed(2)}  /  KRW ${Math.round(pubAvg  * KRW_PER_USD).toLocaleString("en-US")}원` : "—", pubCnt  > 0 ? `${pubCnt}건`  : "0건"],
            ["민간 소매 (ACODECO)", "약국 소매가 기준",      privAvg !== null ? `PAB ${privAvg.toFixed(2)}  /  KRW ${Math.round(privAvg * KRW_PER_USD).toLocaleString("en-US")}원` : "—", privCnt > 0 ? `${privCnt}건` : "0건"],
          ]}
        />
      )}
      {b4 !== "" && (
        <>
          <SectionH2 title="INCOTERMS 역산 참고" />
          <Text style={S.body}>{b4}</Text>
        </>
      )}

      <Divider />

      {/* 4. 가격 시나리오 */}
      <SectionH1 n="4" title="가격 시나리오" />
      <Text style={{ ...S.body, color: C_GRAY, marginBottom: 4 }}>
        ※ 역산식 공통: FOB(USD) = 현지 참고가(PAB) × (1 − 현지물류/관세율) × (1 − 이익마진)
        {"  "}[PAB ≡ USD 1:1 고정환율]
      </Text>

      <SectionH2 title="4-1. 공공 시장 (ALPS 조달청)" />
      <ScenarioTable scenarios={pubScenarios} />
      {b3 !== "" && <Text style={{ ...S.body, marginTop: 4, color: "#555555" }}>{b3}</Text>}

      <SectionH2 title="4-2. 민간 시장 (병원·약국·체인)" />
      <ScenarioTable scenarios={privScenarios} />
      {prB3 !== "" && <Text style={{ ...S.body, marginTop: 4, color: "#555555" }}>{prB3}</Text>}

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
        PAB(발보아)는 USD와 1:1 고정환율입니다. KRW 환산: 1 USD = {KRW_PER_USD.toLocaleString("en-US")} 원 (보고서 기준 환율).
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
  const top10 = Array.isArray(pData["top10"]) ? (pData["top10"] as Array<Record<string, unknown>>) : [];

  const dateStr = generatedAt.toISOString().slice(0, 10);

  const CIRCLED = ["①", "②", "③", "④", "⑤"];

  function scoreLabel(n: unknown): string {
    const v = safeNum(n);
    if (v === null) return "—";
    return v.toFixed(1);
  }

  function taStr(ta: unknown): string {
    if (Array.isArray(ta) && ta.length > 0) return (ta as string[]).join(", ");
    return "—";
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
            const cphiC = safeStr(p["cphi_category"], "");
            const regP  = Array.isArray(p["registered_products"])
              ? (p["registered_products"] as string[])[0] ?? ""
              : safeStr(p["registered_products"], "");
            const taVal = taStr(p["therapeutic_areas"]);
            // 주력상품: CPHI 카테고리 > 첫 번째 등록제품 > 치료영역 순 우선
            const mainProduct = cphiC !== "" ? cphiC : regP !== "" ? regP : taVal !== "" ? taVal : "—";
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
        const pipeline = regProds !== "" ? regProds : ta !== "" ? ta : "—";

        return (
          <View key={i} wrap={false}>
            <Text style={S.partnerCompanyHeader}>{i + 1}. {name}</Text>

            {/* 기업 개요 */}
            <SectionH2 title="기업 개요" />
            <Text style={S.body}>
              {name}은(는) {addr}에 소재한 의약품 유통 기업입니다.
              {revUsd !== null ? ` 연매출 USD ${(revUsd / 1_000_000).toFixed(1)}M,` : ""}
              {empCnt !== null ? ` 임직원 ${empCnt}명,` : ""}
              {" "}제조소 보유 {gmp}, MAH 역량 {mah}.
              주요 치료 영역: {ta !== "" ? ta : "—"}.
            </Text>

            {/* 추천 이유: 5가지 기준 */}
            <SectionH2 title="추천 이유" />
            <CircledItem num="①" label="매출 규모"    content={revUsd !== null ? `USD ${(revUsd / 1_000_000).toFixed(1)}M` : "—"} />
            <CircledItem num="②" label="파이프라인"   content={pipeline} />
            <CircledItem num="③" label="제조소 보유"  content={gmp} />
            <CircledItem num="④" label="수입 경험"    content={impHist} />
            <CircledItem num="⑤" label="공공조달 낙찰" content={pubWins !== null ? `${pubWins}건` : "—"} />

            {/* 기본 정보 (주소 | 연락처 | 설립연도 | 홈페이지 | 파이프라인) */}
            <SectionH2 title="기본 정보" />
            <View style={S.tblWrap}>
              <View style={S.tblHdrRow}>
                <Text style={{ ...S.tblHdrCell, width: "22%" }}>주소</Text>
                <Text style={{ ...S.tblHdrCell, width: "20%" }}>연락처</Text>
                <Text style={{ ...S.tblHdrCell, width: "10%", textAlign: "center" }}>설립연도</Text>
                <Text style={{ ...S.tblHdrCell, width: "20%" }}>홈페이지</Text>
                <Text style={{ ...S.tblHdrCell, width: "28%" }}>파이프라인 (제품명·성분)</Text>
              </View>
              <View style={S.tblRow}>
                <Text style={{ ...S.tblCell, width: "22%", fontSize: 7.5 }}>{addr}</Text>
                <Text style={{ ...S.tblCell, width: "20%", fontSize: 7.5 }}>{email}</Text>
                <Text style={{ ...S.tblCell, width: "10%", fontSize: 7.5, textAlign: "center" }}>{foundedYear}</Text>
                <Text style={{ ...S.tblCell, width: "20%", fontSize: 7.5 }}>{website}</Text>
                <Text style={{ ...S.tblCell, width: "28%", fontSize: 7.5 }}>{pipeline}</Text>
              </View>
            </View>

            {/* 기업 규모 */}
            <KVRow
              label="기업 규모"
              value={revUsd !== null ? `USD ${(revUsd / 1_000_000).toFixed(1)}M (매출액)` : empCnt !== null ? `${empCnt}명 (임직원수)` : "—"}
            />

            {/* 등록 제품 */}
            {(regProds !== "" || cphiCat !== "") && (
              <KVRow
                label="등록 제품"
                value={[regProds, cphiCat !== "" ? `[CPHI: ${cphiCat}]` : ""].filter(Boolean).join("  ") || "—"}
              />
            )}

            <Text style={S.sourceNote}>출처: Perplexity 분석</Text>
            {i < top10.length - 1 && <Divider />}
          </View>
        );
      })}
    </Page>
  );
}

// ─── Cover Page ───────────────────────────────────────────────────────────────

function CoverPage({
  product,
  country,
  generatedAt,
}: {
  product: CombinedReportDocumentProps["product"];
  country: string;
  generatedAt: Date;
}) {
  const dateStr = generatedAt.toISOString().slice(0, 10);
  const countryName = country === "panama" ? "파나마(Panama)" : country.toUpperCase();

  return (
    <Page size="A4" style={S.page}>
      <DocFooter />

      {/* 로고 텍스트 */}
      <Text style={{ fontSize: 10, color: C_GRAY, marginTop: 10 }}>한국유나이티드제약(주)</Text>

      {/* 제목 */}
      <Text style={S.coverTitle}>
        {countryName} 수출 통합 보고서
      </Text>
      <Text style={S.coverSub}>{product.name}</Text>
      <Text style={S.coverMeta}>{product.ingredient}</Text>
      <Text style={S.coverMeta}>HS CODE: 3004.90  |  {countryName}  |  {dateStr}</Text>

      <View style={S.coverDivider} />

      {/* 목차 */}
      <Text style={{ fontSize: 11, fontWeight: "bold", color: C_NAVY, marginBottom: 10 }}>목 차</Text>
      {[
        "I.    파나마 수출 가격 전략 보고서",
        "        1. 파나마 거시 시장",
        "        2. 단가 (시장 기준가)",
        "        3. 거래처 참고 가격",
        "        4. 가격 시나리오 (공공 / 민간)",
        "",
        "II.   파나마 바이어 후보 리스트",
        "        1. 바이어 후보 리스트 (전체)",
        "        2. 우선 접촉 바이어 상세 정보 (상위 3개사)",
        "",
        "III.  파나마 시장보고서",
        "        1. 의료 거시환경 파악",
        "        2. 무역/규제 환경",
        "        3. 참고 가격",
        "        4. 리스크 / 조건",
        "        5. 근거 및 출처",
      ].map((line, i) => (
        <Text key={i} style={{ fontSize: 9, color: line === "" ? C_GRAY : line.startsWith("  ") ? C_BODY : C_NAVY, fontWeight: line.startsWith("I") ? "bold" : "normal", marginBottom: line === "" ? 4 : 2 }}>
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
