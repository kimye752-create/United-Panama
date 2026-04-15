/**
 * Report1 PDF 다운로드 — LLM payload + 동일 generateReport1(캐시 우선)
 */
import { NextRequest, NextResponse } from "next/server";
import type { DocumentProps } from "@react-pdf/renderer";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";

import {
  Report1Document,
  type Report1PdfProps,
} from "@/lib/pdf/Report1Document";
import type { PerplexityPaper } from "@/src/logic/perplexity_insights";
import {
  generateReport1,
  type GeneratorInput,
} from "@/src/llm/report1_generator";
import type { MarketPriceStats } from "@/src/logic/market_stats";
import { analyzePanamaProduct } from "@/src/logic/panama_analysis";
import {
  buildRawDataDigest,
  dedupeDistributorNames,
  extractPrevalenceMetric,
} from "@/src/logic/report1_digest";
import { getCabamedStats, getPanamacompraStats } from "@/src/logic/market_stats";
import { getPahoRegionalReferenceLine } from "@/src/logic/paho_reference_prices";
import { getPerplexityCacheInsight } from "@/src/logic/perplexity_insights";
import { findProductById } from "@/src/utils/product-dictionary";

export const runtime = "nodejs";

interface PdfRequestBody {
  productId: string;
  caseGrade: "A" | "B" | "C";
  caseVerdict: string;
  confidence: number;
  emlWho: boolean;
  emlPaho: boolean;
  prevalenceMetric: string;
  distributorNames: string[];
  panamacompraCount: number;
  rawDataDigest: string;
  sourceRows: Array<{ source: string; count: number; avgConfidence: number }>;
  perplexityPapers: PerplexityPaper[];
  perplexitySource: string;
  dosageForm: string;
  hsCode: string;
  panamacompraStats?: MarketPriceStats | null;
  cabamedStats?: MarketPriceStats | null;
  panamacompraV3Top?: {
    totalCount: number;
    proveedor: string;
    proveedorWins: number;
    fabricante: string;
    paisOrigen: string;
    entidadCompradora: string;
    fechaOrden: string;
    representativePrice: number | null;
  } | null;
}

interface MinimalPdfRequestBody {
  productId: string;
}

function parsePerplexityPapers(raw: unknown): PerplexityPaper[] | null {
  if (!Array.isArray(raw)) {
    return null;
  }
  const out: PerplexityPaper[] = [];
  for (const item of raw) {
    if (!isRecord(item)) {
      return null;
    }
    if (
      typeof item.title !== "string" ||
      typeof item.url !== "string" ||
      (typeof item.published_at !== "string" && item.published_at !== null) ||
      typeof item.summary !== "string" ||
      typeof item.source !== "string"
    ) {
      return null;
    }
    out.push({
      title: item.title,
      url: item.url,
      published_at: item.published_at,
      summary: item.summary,
      source: item.source,
    });
  }
  return out;
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === "object" && !Array.isArray(x);
}

function parseSourceRows(
  raw: unknown,
): Array<{ source: string; count: number; avgConfidence: number }> | null {
  if (!Array.isArray(raw)) {
    return null;
  }
  const out: Array<{ source: string; count: number; avgConfidence: number }> =
    [];
  for (const item of raw) {
    if (!isRecord(item)) {
      return null;
    }
    if (typeof item.source !== "string" || typeof item.count !== "number") {
      return null;
    }
    const ac = item.avgConfidence;
    let avg = 0;
    if (typeof ac === "number" && !Number.isNaN(ac)) {
      avg = ac;
    } else if (typeof ac === "string") {
      const n = Number.parseFloat(ac);
      avg = Number.isFinite(n) ? n : 0;
    }
    out.push({ source: item.source, count: item.count, avgConfidence: avg });
  }
  return out;
}

function parsePdfBody(raw: unknown): PdfRequestBody | null {
  if (!isRecord(raw)) {
    return null;
  }
  if (typeof raw.productId !== "string") {
    return null;
  }
  const cg = raw.caseGrade;
  if (cg !== "A" && cg !== "B" && cg !== "C") {
    return null;
  }
  if (typeof raw.caseVerdict !== "string") {
    return null;
  }
  if (typeof raw.confidence !== "number" || Number.isNaN(raw.confidence)) {
    return null;
  }
  if (typeof raw.emlWho !== "boolean" || typeof raw.emlPaho !== "boolean") {
    return null;
  }
  const pmRaw = raw.prevalenceMetric;
  if (pmRaw !== null && pmRaw !== undefined && typeof pmRaw !== "string") {
    return null;
  }
  const pm = typeof pmRaw === "string" ? pmRaw : "";
  if (!Array.isArray(raw.distributorNames)) {
    return null;
  }
  const names: string[] = [];
  for (const n of raw.distributorNames) {
    if (typeof n !== "string") {
      return null;
    }
    names.push(n);
  }
  if (typeof raw.panamacompraCount !== "number") {
    return null;
  }
  if (typeof raw.rawDataDigest !== "string") {
    return null;
  }
  const sr = parseSourceRows(raw.sourceRows);
  if (sr === null) {
    return null;
  }
  const papers = parsePerplexityPapers(raw.perplexityPapers);
  if (papers === null) {
    return null;
  }
  if (typeof raw.perplexitySource !== "string") {
    return null;
  }
  if (typeof raw.dosageForm !== "string" || typeof raw.hsCode !== "string") {
    return null;
  }

  return {
    productId: raw.productId,
    caseGrade: cg,
    caseVerdict: raw.caseVerdict,
    confidence: raw.confidence,
    emlWho: raw.emlWho,
    emlPaho: raw.emlPaho,
    prevalenceMetric: pm,
    distributorNames: names,
    panamacompraCount: raw.panamacompraCount,
    rawDataDigest: raw.rawDataDigest,
    sourceRows: sr,
    perplexityPapers: papers,
    perplexitySource: raw.perplexitySource,
    dosageForm: raw.dosageForm,
    hsCode: raw.hsCode,
  };
}

function parseMinimalPdfBody(raw: unknown): MinimalPdfRequestBody | null {
  if (!isRecord(raw)) {
    return null;
  }
  if (typeof raw.productId !== "string" || raw.productId.trim() === "") {
    return null;
  }
  return { productId: raw.productId };
}

function defaultHsCode(): string {
  return "3004";
}

function defaultDosageForm(inn: string): string {
  const byInn: Record<string, string> = {
    Hydroxyurea: "500mg Capsule",
    Cilostazol: "100mg Tablet",
    Itopride: "50mg Tablet",
    Aceclofenac: "100mg Tablet",
    Rabeprazole: "20mg Tablet",
    Erdosteine: "300mg Capsule",
    "Omega-3-acid ethyl esters": "1000mg Soft capsule",
    Levodropropizine: "90mg/5mL Syrup",
  };
  return byInn[inn] ?? "제형 조회 중";
}

type PriceRowLite = {
  product_id?: string | null;
  pa_source?: string | null;
  pa_price_local?: number | string | null;
  pa_notes?: string | null;
};

function toFiniteNumber(value: number | string | null | undefined): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const n = Number.parseFloat(value.trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function parseNotesObject(notes: string | null | undefined): Record<string, unknown> {
  if (notes === null || notes === undefined || notes.trim() === "") {
    return {};
  }
  try {
    const parsed = JSON.parse(notes) as unknown;
    if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return {};
  } catch {
    return {};
  }
}

function extractPanamaCompraV3Top(
  productId: string,
  rows: readonly PriceRowLite[],
): NonNullable<PdfRequestBody["panamacompraV3Top"]> | null {
  const v3Rows = rows.filter(
    (row) => row.product_id === productId && row.pa_source === "panamacompra_v3",
  );
  if (v3Rows.length === 0) {
    return null;
  }
  const groups = new Map<
    string,
    {
      wins: number;
      fabricante: string;
      paisOrigen: string;
      entidad: string;
      fecha: string;
      price: number | null;
    }
  >();
  for (const row of v3Rows) {
    const notes = parseNotesObject(row.pa_notes);
    const proveedor = String(notes["proveedor"] ?? "").trim();
    const key = proveedor !== "" ? proveedor : "UNKNOWN_PROVEEDOR";
    const current = groups.get(key);
    if (current === undefined) {
      groups.set(key, {
        wins: 1,
        fabricante: String(notes["fabricante"] ?? "").trim(),
        paisOrigen: String(notes["pais_origen"] ?? "").trim(),
        entidad: String(notes["entidad_compradora"] ?? "").trim(),
        fecha: String(notes["fecha_orden"] ?? "").trim(),
        price: toFiniteNumber(row.pa_price_local),
      });
      continue;
    }
    current.wins += 1;
    if (current.fabricante === "") {
      current.fabricante = String(notes["fabricante"] ?? "").trim();
    }
    if (current.paisOrigen === "") {
      current.paisOrigen = String(notes["pais_origen"] ?? "").trim();
    }
    if (current.entidad === "") {
      current.entidad = String(notes["entidad_compradora"] ?? "").trim();
    }
    if (current.fecha === "") {
      current.fecha = String(notes["fecha_orden"] ?? "").trim();
    }
    if (current.price === null) {
      current.price = toFiniteNumber(row.pa_price_local);
    }
  }
  let bestProveedor = "";
  let bestWins = -1;
  let bestMeta:
    | {
        wins: number;
        fabricante: string;
        paisOrigen: string;
        entidad: string;
        fecha: string;
        price: number | null;
      }
    | undefined;
  for (const [proveedor, meta] of groups.entries()) {
    if (meta.wins > bestWins) {
      bestWins = meta.wins;
      bestProveedor = proveedor;
      bestMeta = meta;
    }
  }
  if (bestMeta === undefined) {
    return null;
  }
  return {
    totalCount: v3Rows.length,
    proveedor: bestProveedor,
    proveedorWins: bestMeta.wins,
    fabricante: bestMeta.fabricante,
    paisOrigen: bestMeta.paisOrigen,
    entidadCompradora: bestMeta.entidad,
    fechaOrden: bestMeta.fecha,
    representativePrice: bestMeta.price,
  };
}

async function buildPdfBodyFromProductId(productId: string): Promise<PdfRequestBody> {
  const analyzed = await analyzePanamaProduct(productId);
  const rawDataDigest = buildRawDataDigest(analyzed);
  const prevalenceMetric = extractPrevalenceMetric(
    productId,
    analyzed.priceRows,
    analyzed.macroRows,
  );
  const perplexityInsight = await getPerplexityCacheInsight(analyzed.product.who_inn_en);
  const panamacompraStats = getPanamacompraStats(productId, analyzed.priceRows);
  const cabamedStats = getCabamedStats(productId, analyzed.priceRows);
  const panamacompraV3Top = extractPanamaCompraV3Top(
    productId,
    analyzed.priceRows as PriceRowLite[],
  );
  return {
    productId,
    caseGrade: analyzed.judgment.case,
    caseVerdict: analyzed.judgment.verdict,
    confidence: analyzed.judgment.confidence,
    emlWho: analyzed.emlWho,
    emlPaho: analyzed.emlPaho,
    prevalenceMetric,
    distributorNames: dedupeDistributorNames(
      analyzed.matchedDistributors.map((d) => d.company_name),
    ),
    panamacompraCount: analyzed.panamacompraCount,
    rawDataDigest,
    sourceRows: analyzed.sourceAggregation.map((row) => ({
      source: row.pa_source,
      count: row.count,
      avgConfidence: row.avgConfidence ?? 0,
    })),
    perplexityPapers: perplexityInsight?.papers ?? [],
    perplexitySource: perplexityInsight?.source ?? "cache_miss",
    dosageForm: defaultDosageForm(analyzed.product.who_inn_en),
    hsCode: defaultHsCode(),
    panamacompraStats,
    cabamedStats,
    panamacompraV3Top,
  };
}

function safeFilenameSegment(inn: string): string {
  return inn.replace(/[^\w\-.]+/g, "_").slice(0, 80);
}

export async function POST(req: NextRequest): Promise<Response> {
  let rawJson: unknown;
  try {
    rawJson = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON 본문 오류" }, { status: 400 });
  }

  const body = parsePdfBody(rawJson);
  const minimalBody = body === null ? parseMinimalPdfBody(rawJson) : null;
  if (body === null && minimalBody === null) {
    return NextResponse.json({ error: "요청 본문 스키마 불일치" }, { status: 400 });
  }
  const resolvedBody =
    body !== null
      ? body
      : await buildPdfBodyFromProductId(
          minimalBody !== null ? minimalBody.productId : "",
        );

  const product = findProductById(resolvedBody.productId);
  if (product === undefined) {
    return NextResponse.json({ error: "product not found" }, { status: 404 });
  }

  const generatorInput: GeneratorInput = {
    productId: resolvedBody.productId,
    innEn: product.who_inn_en,
    brandName: product.kr_brand_name,
    caseGrade: resolvedBody.caseGrade,
    caseVerdict: resolvedBody.caseVerdict,
    emlWho: resolvedBody.emlWho,
    emlPaho: resolvedBody.emlPaho,
    prevalenceMetric: resolvedBody.prevalenceMetric,
    pahoRegionalReference: getPahoRegionalReferenceLine(product.who_inn_en),
    distributorNames: resolvedBody.distributorNames,
    panamacompraCount: resolvedBody.panamacompraCount,
    panamacompraStats: resolvedBody.panamacompraStats ?? null,
    panamacompraV3Top: resolvedBody.panamacompraV3Top ?? null,
    cabamedStats: resolvedBody.cabamedStats ?? null,
    rawDataDigest: resolvedBody.rawDataDigest,
  };

  try {
    const llmResult = await generateReport1(generatorInput);

    const pdfProps: Report1PdfProps = {
      brandName: product.kr_brand_name,
      innEn: product.who_inn_en,
      dosageForm: resolvedBody.dosageForm,
      hsCode: resolvedBody.hsCode,
      caseGrade: resolvedBody.caseGrade,
      caseVerdict: resolvedBody.caseVerdict,
      confidence: resolvedBody.confidence,
      llmPayload: llmResult.payload,
      sourceRows: resolvedBody.sourceRows,
      perplexityPapers: resolvedBody.perplexityPapers,
      perplexitySource: resolvedBody.perplexitySource,
      collectedAt: new Date().toISOString().slice(0, 10),
    };

    const buffer = await renderToBuffer(
      React.createElement(
        Report1Document,
        pdfProps,
      ) as React.ReactElement<DocumentProps>,
    );
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const filename = `UPharma_Panama_Report_${today}_${safeFilenameSegment(product.who_inn_en)}.pdf`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "X-LLM-Source": llmResult.source,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
