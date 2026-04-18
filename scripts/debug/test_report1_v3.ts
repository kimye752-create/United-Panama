/// <reference types="node" />

import fs from "node:fs";
import path from "node:path";

import React from "react";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { config as loadEnv } from "dotenv";

import { generateReport1V3, type GeneratorInput } from "@/src/llm/report1_generator";
import { buildFallbackReportV3 } from "@/src/llm/report1_fallback_template";
import type { EntryFeasibility } from "@/src/llm/logic/panama_entry_feasibility";
import { Report1DocumentV3 } from "@/lib/pdf/Report1DocumentV3";

loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

async function main(): Promise<void> {
  const startedAt = Date.now();
  const entryFeasibility: EntryFeasibility = {
    grade: "B_short_term",
    verdict: "단기 진입 가능",
    path: "direct_minsa_plus_private",
    duration_days: 180,
    cost_usd: 3500,
    evidence: {
      note: "debug",
    },
  };
  const input: GeneratorInput = {
    productId: "2504d79b-c2ce-4660-9ea7-5576c8bb755f",
    innEn: "Rosuvastatin + Omega-3-acid ethyl esters",
    brandName: "Rosumeg Combigel",
    caseGrade: "B",
    caseVerdict: "조건부",
    emlWho: false,
    emlPaho: false,
    prevalenceMetric:
      "prevalence: 성인 이상지질혈증 유병률 35~40% [MINSA Estudio PREFREC / PAHO Cardiovascular Risk Factors] (2019, scope=panama)",
    pahoRegionalReference: null,
    distributorNames: [
      "Agencias Feduro, S.A.",
      "Agencias Celmar, S.A.",
      "C. G. de Haseth & Cia., S.A.",
      "Compañía Astur, S.A.",
    ],
    panamacompraCount: 5,
    panamacompraStats: {
      count: 5,
      avgPrice: 0.08,
      maxPrice: 0.1,
      minPrice: 0.0365,
    },
    panamacompraV3Top: {
      totalCount: 5,
      proveedor: "SEVEN PHARMA PANAMA, S.A.",
      count: 3,
      proveedorWins: 3,
      fabricante: "Hetero Labs Limited",
      paisOrigen: "India",
      nombreComercial: "ROSUVASTATINA 10MG TABLETAS RECUBIERTAS",
      entidadCompradora: "MINSA Sede",
      fechaOrden: "2025-09-19",
      representativePrice: 0.0365,
    },
    cabamedStats: {
      count: 1,
      avgPrice: 0.67,
      maxPrice: 0.67,
      minPrice: 0.67,
    },
    rawDataDigest: "debug digest",
    entryFeasibility,
    entryFeasibilityText:
      "진출 가능성: B_short_term 단기 진입 가능. 경로 direct_minsa_plus_private. 예상 180일/$3500.\n※ 공공·민간 병행 진입 시 초기 매출 확보 가능.",
    perplexityPapers: [
      {
        title: "Rosuvastatin and cardiovascular risk reduction in mixed dyslipidemia",
        url: "https://pubmed.ncbi.nlm.nih.gov/12345678/",
        published_at: "2024-01-01T00:00:00.000Z",
        summary:
          "혼합형 이상지질혈증 환자군에서 rosuvastatin 기반 치료의 LDL-C 개선과 심혈관 위험 감소 근거를 제시하며, 복합제 진입 시 임상 설명 자료로 활용 가능성을 보여준다.",
        source: "PubMed",
      },
      {
        title: "Omega-3 ethyl esters in hypertriglyceridemia management",
        url: "https://pubmed.ncbi.nlm.nih.gov/87654321/",
        published_at: "2023-07-01T00:00:00.000Z",
        summary:
          "고중성지방혈증 관리에서 omega-3 ethyl esters의 TG 저하 효과와 병용 전략을 설명하며, 파나마 민간 채널에서 처방 패턴 기반 포지셔닝 근거로 연결 가능한 임상 데이터를 제공한다.",
        source: "PubMed",
      },
    ],
  };

  const result = await generateReport1V3(input);
  const fallbackPayload = buildFallbackReportV3({
    innEn: input.innEn,
    brandName: input.brandName,
    caseGrade: input.caseGrade,
    caseVerdict: input.caseVerdict,
    emlWho: input.emlWho,
    emlPaho: input.emlPaho,
    prevalenceMetric: input.prevalenceMetric,
    pahoRegionalReference: input.pahoRegionalReference,
    distributorNames: input.distributorNames,
    panamacompraCount: input.panamacompraCount,
    panamacompraStats: null,
    panamacompraV3Top: input.panamacompraV3Top,
    cabamedStats: null,
    entryFeasibility: input.entryFeasibility,
    entryFeasibilityText: input.entryFeasibilityText,
    perplexityPapers: input.perplexityPapers,
  });
  const pdfBuffer = await renderToBuffer(
    React.createElement(Report1DocumentV3, {
      brandName: input.brandName,
      innEn: input.innEn,
      hsCode: "3004",
      caseGrade: input.caseGrade,
      caseVerdict: input.caseVerdict,
      confidence: 0.75,
      payload: result.payload,
      collectedAt: new Date().toISOString().slice(0, 10),
    }) as React.ReactElement<DocumentProps>,
  );
  const outPath = path.join(process.cwd(), "tmp", "report1_v3_test.pdf");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, pdfBuffer);

  const payloadKeys = Object.keys(result.payload);
  const elapsedMs = Date.now() - startedAt;
  const fallbackKeys = Object.keys(fallbackPayload);
  process.stdout.write(`source: ${result.source}\n`);
  process.stdout.write(`payload keys: ${payloadKeys.join(", ")}\n`);
  process.stdout.write(
    `block2_market_medical: ${result.payload.block2_market_medical.slice(0, 100)}\n`,
  );
  process.stdout.write(`block4_papers count: ${result.payload.block4_papers.length}\n`);
  process.stdout.write(
    `block4_databases count: ${result.payload.block4_databases.length}\n`,
  );
  process.stdout.write(`fallback keys: ${fallbackKeys.join(", ")}\n`);
  process.stdout.write(
    `fallback gap note: ${fallbackPayload.block3_data_gaps.note}\n`,
  );
  process.stdout.write(`PDF bytes: ${String(pdfBuffer.length)}\n`);
  process.stdout.write(`PDF output: ${outPath}\n`);
  process.stdout.write(`elapsed_ms: ${String(elapsedMs)}\n`);
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`error: ${message}\n`);
  process.exit(1);
});
