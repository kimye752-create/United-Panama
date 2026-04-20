/**
 * Report1 A4 2페이지 PDF — 엔진⑦
 */
import React from "react";
import { Document, Page, Text, View } from "@react-pdf/renderer";

import type { Report1Payload } from "@/src/llm/report1_schema";
import type { PerplexityPaper } from "@/src/logic/perplexity_insights";

import "./pdf-fonts";
import { pdfStyles } from "./pdf-styles";

export interface SourceRow {
  source: string;
  count: number;
  avgConfidence: number;
}

export interface Report1PdfProps {
  brandName: string;
  innEn: string;
  dosageForm: string;
  hsCode: string;
  caseGrade: "A" | "B" | "C";
  caseVerdict: string;
  confidence: number;
  llmPayload: Report1Payload;
  sourceRows: SourceRow[];
  perplexityPapers: PerplexityPaper[];
  perplexitySource: string;
  collectedAt: string;
}

export function Report1Document(props: Report1PdfProps) {
  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <Text style={pdfStyles.titleBar}>
          UPharma Export AI | 파나마 1단계 시장조사 보고서
        </Text>
        <Text style={pdfStyles.subTitle}>
          파나마 전용 | {props.collectedAt} | 단일 INN 분석 · 5개 블록 구조
        </Text>

        <View style={pdfStyles.headerBar}>
          <Text style={pdfStyles.headerBarText}>
            {props.brandName} — {props.innEn} | {props.dosageForm} | HS{" "}
            {props.hsCode} | Case {props.caseGrade} | confidence{" "}
            {props.confidence.toFixed(2)}
          </Text>
        </View>

        <Text style={pdfStyles.blockHeader}>① 핵심 판정</Text>
        <View style={pdfStyles.twoColTable}>
          <View style={pdfStyles.twoColRowLast}>
            <Text style={pdfStyles.labelCell}>판정</Text>
            <Text style={[pdfStyles.contentCell, pdfStyles.verdictText]}>
              {props.caseVerdict}
            </Text>
          </View>
        </View>

        <Text style={pdfStyles.blockHeader}>② 두괄식 판정 근거</Text>
        <View style={pdfStyles.twoColTable}>
          <View style={pdfStyles.twoColRowLast}>
            <Text style={pdfStyles.labelCell}>핵심 근거</Text>
            <View style={pdfStyles.contentCellColumn}>
              {props.llmPayload.block3_reasoning.map((line, i) => (
                <Text key={i} style={pdfStyles.reasoningItem}>
                  {i + 1}. {line}
                </Text>
              ))}
              {(() => {
                const f = props.llmPayload.block3_latam_scope_footnote;
                const t =
                  f !== null && f !== undefined && typeof f === "string"
                    ? f.trim()
                    : "";
                if (t === "") {
                  return null;
                }
                return <Text style={pdfStyles.scopeFootnote}>{t}</Text>;
              })()}
            </View>
          </View>
        </View>

        <Text style={pdfStyles.blockHeader}>③ 시장 진출 전략</Text>
        <View style={pdfStyles.twoColTable}>
          <View style={pdfStyles.twoColRow}>
            <Text style={pdfStyles.labelCell}>4-1 진입 채널</Text>
            <Text style={pdfStyles.contentCell}>
              {props.llmPayload.block4_1_channel}
            </Text>
          </View>
          <View style={pdfStyles.twoColRow}>
            <Text style={pdfStyles.labelCell}>4-2 가격 포지셔닝</Text>
            <Text style={pdfStyles.contentCell}>
              {props.llmPayload.block4_2_pricing}
            </Text>
          </View>
          <View style={pdfStyles.twoColRow}>
            <Text style={pdfStyles.labelCell}>4-3 유통 파트너</Text>
            <Text style={pdfStyles.contentCell}>
              {props.llmPayload.block4_3_partners}
            </Text>
          </View>
          <View style={pdfStyles.twoColRowLast}>
            <Text style={pdfStyles.labelCell}>4-4 리스크·조건</Text>
            <Text style={pdfStyles.contentCell}>
              {props.llmPayload.block4_4_risks}
            </Text>
          </View>
          <View style={pdfStyles.twoColRowLast}>
            <Text style={pdfStyles.labelCell}>4-5 진출 가능성</Text>
            <Text style={pdfStyles.contentCell}>
              {props.llmPayload.block4_5_entry_feasibility}
            </Text>
          </View>
        </View>
      </Page>

      <Page size="A4" style={pdfStyles.page}>
        <Text style={pdfStyles.titleBar}>④ 근거·출처 및 논문 참고</Text>
        <Text style={pdfStyles.subTitle}>
          출처 집계·근거 메타·Perplexity 추천 논문
        </Text>
        <Text style={pdfStyles.blockHeader}>④ 근거·출처 (Supabase 실적재)</Text>
        <View style={pdfStyles.sourceTable}>
          <View style={pdfStyles.sourceHeaderRow}>
            <Text style={pdfStyles.sourceHeaderCell}>출처</Text>
            <Text style={pdfStyles.sourceHeaderCell}>건수</Text>
            <Text style={pdfStyles.sourceHeaderCell}>신뢰도(평균)</Text>
          </View>
          {props.sourceRows.map((row, i) => (
            <View key={i} style={pdfStyles.sourceRow}>
              <Text style={pdfStyles.sourceCell}>{row.source}</Text>
              <Text style={pdfStyles.sourceCell}>{row.count}건</Text>
              <Text style={pdfStyles.sourceCell}>
                {row.avgConfidence.toFixed(2)}
              </Text>
            </View>
          ))}
        </View>

        <View style={pdfStyles.perplexitySection}>
          <Text style={pdfStyles.blockHeader}>
            ⑤ Perplexity 추천 논문 ({props.perplexitySource})
          </Text>
          <View style={pdfStyles.paperTable}>
            {props.perplexityPapers.length > 0 ? (
              props.perplexityPapers.slice(0, 8).map((paper, index) => (
                <View key={`${paper.url}-${paper.title}`} style={pdfStyles.paperRow}>
                  <Text style={pdfStyles.paperIndex}>{index + 1}.</Text>
                  <View style={pdfStyles.paperBody}>
                    <Text style={pdfStyles.paperTitle}>{paper.title}</Text>
                    <Text style={pdfStyles.paperMeta}>
                      {paper.source}
                      {paper.published_at !== null
                        ? ` · ${paper.published_at.slice(0, 10)}`
                        : ""}
                    </Text>
                    <Text style={pdfStyles.paperUrl}>{paper.url}</Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={pdfStyles.emptyPaperText}>
                캐시된 추천 논문이 아직 없어 표시할 항목이 없습니다.
              </Text>
            )}
          </View>
        </View>

        <View style={pdfStyles.footer}>
          <Text>최종 수집: {props.collectedAt}</Text>
          <Text>수집 방식: L1 정적 seed (사용자 검증) + L2 조건부 크롤러</Text>
          <Text>의미적 신선도 판정: Phase 2 로드맵 — 해법 C (AI 2단계 게이트)</Text>
          <Text>LLM 본문 생성: Anthropic Claude Haiku (Tool Use 강제 양식)</Text>
        </View>
      </Page>
    </Document>
  );
}
