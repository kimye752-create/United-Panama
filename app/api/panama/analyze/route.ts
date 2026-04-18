/**
 * POST { productId } — 분석 파이프라인 + W5 generateReport1 (캐시·폴백)
 */
import { NextResponse } from "next/server";
import React from "react";
import type { DocumentProps } from "@react-pdf/renderer";
import { renderToBuffer } from "@react-pdf/renderer";

import { analyzePanamaProduct } from "@/src/logic/panama_analysis";
import {
  buildRawDataDigest,
  dedupeDistributorNames,
  extractPrevalenceMetric,
} from "@/src/logic/report1_digest";
import {
  generateReport1,
  generateReport1V3,
  type GeneratorInput,
} from "@/src/llm/report1_generator";
import { getCabamedStats, getPanamacompraStats } from "@/src/logic/market_stats";
import { getPahoRegionalReferenceLine } from "@/src/logic/paho_reference_prices";
import { getPerplexityCacheInsight } from "@/src/logic/perplexity_insights";
import { findProductById } from "@/src/utils/product-dictionary";
import { getSupabaseClient } from "@/src/utils/db_connector";
import type { PanamaRow } from "@/src/logic/fetch_panama_data";
import type { Report1PayloadV3 } from "@/src/llm/report1_schema";
import type { Report1Payload } from "@/src/llm/report1_schema";
import {
  evaluatePanamaEntryFeasibility,
  feasibilityToReportText,
} from "@/src/llm/logic/panama_entry_feasibility";
import { Report1Document, type SourceRow } from "@/lib/pdf/Report1Document";
import { Report1DocumentV3 } from "@/lib/pdf/Report1DocumentV3";

export const runtime = "nodejs";

type PriceRowLite = {
  product_id?: string | null;
  pa_source?: string | null;
  pa_price_local?: number | string | null;
  pa_notes?: string | null;
  pa_product_name_local?: string | null;
  pa_stock_status?: string | null;
};

type SourceBreakdown = {
  panamacompra_v3: {
    count: number;
    avgPrice: number | null;
    minPrice: number | null;
    maxPrice: number | null;
    topProveedor: string | null;
  };
  acodeco: {
    count: number;
    avgPrice: number | null;
  };
  superxtra: {
    count: number;
    price: number | null;
    hasStock: boolean | null;
  };
  colombia_secop: {
    count: number;
    avgPrice: number | null;
    erpBasis: string;
  };
};

type ConfidenceBreakdown = {
  publicProcurement: boolean;
  privatePrice: boolean;
  eml: boolean;
  erpReference: boolean;
  distributors: boolean;
  regulation: boolean;
  prevalence: boolean;
  total: number;
  max: number;
  percent: number;
};

type PanamaCompraV3Top = {
  totalCount: number;
  proveedor: string;
  count: number;
  proveedorWins: number;
  fabricante: string;
  paisOrigen: string;
  nombreComercial: string;
  entidadCompradora: string;
  fechaOrden: string;
  representativePrice: number | null;
};

type CachedPdfRow = {
  pdf_base64: unknown;
  pdf_filename: unknown;
  report_version?: unknown;
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

function calculatePriceSummary(rows: readonly PriceRowLite[]): {
  avgPrice: number | null;
  minPrice: number | null;
  maxPrice: number | null;
} {
  const values = rows
    .map((row) => toFiniteNumber(row.pa_price_local))
    .filter((value): value is number => value !== null);
  if (values.length === 0) {
    return { avgPrice: null, minPrice: null, maxPrice: null };
  }
  const total = values.reduce((sum, value) => sum + value, 0);
  return {
    avgPrice: Math.round((total / values.length) * 100) / 100,
    minPrice: Math.min(...values),
    maxPrice: Math.max(...values),
  };
}

function buildSourceBreakdown(
  productId: string,
  rows: readonly PriceRowLite[],
  v3Top: PanamaCompraV3Top | null,
): SourceBreakdown {
  const productRows = rows.filter((row) => row.product_id === productId);
  const panamacompraRows = productRows.filter(
    (row) => row.pa_source === "panamacompra_v3",
  );
  const acodecoRows = productRows.filter((row) => {
    const source = row.pa_source ?? "";
    return source === "acodeco" || source === "acodeco_cabamed_competitor";
  });
  const superxtraRows = productRows.filter(
    (row) => row.pa_source === "superxtra_vtex",
  );
  const colombiaRows = productRows.filter((row) => row.pa_source === "datos_gov_co");
  const panamacompraSummary = calculatePriceSummary(panamacompraRows);
  const acodecoSummary = calculatePriceSummary(acodecoRows);
  const colombiaSummary = calculatePriceSummary(colombiaRows);
  const superxtraPrice = toFiniteNumber(superxtraRows[0]?.pa_price_local ?? null);
  const superxtraStock = superxtraRows[0]?.pa_stock_status;

  return {
    panamacompra_v3: {
      count: panamacompraRows.length,
      avgPrice: panamacompraSummary.avgPrice,
      minPrice: panamacompraSummary.minPrice,
      maxPrice: panamacompraSummary.maxPrice,
      topProveedor: v3Top?.proveedor ?? null,
    },
    acodeco: {
      count: acodecoRows.length,
      avgPrice: acodecoSummary.avgPrice,
    },
    superxtra: {
      count: superxtraRows.length,
      price: superxtraPrice,
      hasStock:
        superxtraStock === undefined || superxtraStock === null
          ? null
          : superxtraStock.toLowerCase().includes("in"),
    },
    colombia_secop: {
      count: colombiaRows.length,
      avgPrice: colombiaSummary.avgPrice,
      erpBasis: "WHO 2015 ERP",
    },
  };
}

function buildConfidenceBreakdown(
  result: Awaited<ReturnType<typeof analyzePanamaProduct>>,
  prevalenceMetric: string,
  sourceBreakdown: SourceBreakdown,
): ConfidenceBreakdown {
  const publicProcurement = sourceBreakdown.panamacompra_v3.count > 0;
  const privatePrice =
    sourceBreakdown.acodeco.count > 0 || sourceBreakdown.superxtra.count > 0;
  const eml = result.emlWho;
  const erpReference = sourceBreakdown.colombia_secop.count > 0;
  const distributors = result.matchedDistributors.length > 0;
  const regulation = result.sourceAggregation.some((row) => {
    const source = row.pa_source.toLowerCase();
    return source.includes("minsa") || source.includes("dnfd") || source.includes("wla");
  });
  const prevalence = prevalenceMetric.trim() !== "";
  const checks = [
    publicProcurement,
    privatePrice,
    eml,
    erpReference,
    distributors,
    regulation,
    prevalence,
  ];
  const total = checks.filter(Boolean).length;
  const max = checks.length;

  return {
    publicProcurement,
    privatePrice,
    eml,
    erpReference,
    distributors,
    regulation,
    prevalence,
    total,
    max,
    percent: Math.round((total / max) * 100),
  };
}

function extractPanamaCompraV3Top(
  productId: string,
  rows: readonly PriceRowLite[],
): PanamaCompraV3Top | null {
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
  const topRow = v3Rows.find((row) => {
    if (row.pa_source !== "panamacompra_v3") {
      return false;
    }
    const notes = parseNotesObject(row.pa_notes);
    const fabricante = String(notes["fabricante"] ?? "").trim();
    const proveedor = String(notes["proveedor"] ?? "").trim();
    return fabricante === bestMeta.fabricante && proveedor === bestProveedor;
  });
  const nombreComercial =
    typeof topRow?.pa_product_name_local === "string" &&
    topRow.pa_product_name_local.trim() !== ""
      ? topRow.pa_product_name_local.trim()
      : "?";

  return {
    totalCount: v3Rows.length,
    proveedor: bestProveedor,
    count: bestMeta.wins,
    proveedorWins: bestMeta.wins,
    fabricante: bestMeta.fabricante,
    paisOrigen: bestMeta.paisOrigen,
    nombreComercial,
    entidadCompradora: bestMeta.entidad,
    fechaOrden: bestMeta.fecha,
    representativePrice: bestMeta.price,
  };
}

function safeFilenameSegment(raw: string): string {
  const normalized = raw.trim().replace(/[^A-Za-z0-9._-]+/g, "_");
  const squashed = normalized.replace(/_+/g, "_").replace(/^_+|_+$/g, "");
  return squashed === "" ? "UNKNOWN" : squashed;
}

function toPdfSourceRows(raw: unknown): SourceRow[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const rows: SourceRow[] = [];
  for (const entry of raw) {
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
      continue;
    }
    const row = entry as Record<string, unknown>;
    if (typeof row.pa_source !== "string" || typeof row.count !== "number") {
      continue;
    }
    const rawAvg = row.avg_confidence;
    const avgConfidence =
      typeof rawAvg === "number"
        ? rawAvg
        : typeof rawAvg === "string"
          ? Number.parseFloat(rawAvg)
          : 0;
    rows.push({
      source: row.pa_source,
      count: row.count,
      avgConfidence: Number.isFinite(avgConfidence) ? avgConfidence : 0,
    });
  }
  return rows;
}

async function tryLoadCachedPdf(
  productId: string,
  reportVersion: "v1" | "v3",
): Promise<{ pdfBase64: string; pdfFilename: string } | null> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("panama_report_cache")
      .select("pdf_base64, pdf_filename, report_version")
      .eq("product_id", productId)
      .eq("report_version", reportVersion)
      .maybeSingle();
    if (error !== null) {
      const legacy = await supabase
        .from("panama_report_cache")
        .select("pdf_base64, pdf_filename")
        .eq("product_id", productId)
        .maybeSingle();
      if (legacy.error !== null || legacy.data === null) {
        return null;
      }
      const legacyRow = legacy.data as CachedPdfRow;
      if (typeof legacyRow.pdf_filename !== "string") {
        return null;
      }
      const name = legacyRow.pdf_filename.toLowerCase();
      const expectedToken = reportVersion === "v3" ? "_v3" : "_v1";
      if (!name.includes(expectedToken)) {
        return null;
      }
      if (typeof legacyRow.pdf_base64 !== "string" || legacyRow.pdf_base64.trim() === "") {
        return null;
      }
      return {
        pdfBase64: legacyRow.pdf_base64,
        pdfFilename: legacyRow.pdf_filename,
      };
    }
    if (data === null) {
      return null;
    }
    const row = data as CachedPdfRow;
    if (typeof row.pdf_base64 !== "string" || row.pdf_base64.trim() === "") {
      return null;
    }
    if (typeof row.pdf_filename !== "string" || row.pdf_filename.trim() === "") {
      return null;
    }
    return {
      pdfBase64: row.pdf_base64,
      pdfFilename: row.pdf_filename,
    };
  } catch {
    return null;
  }
}

async function savePdfCache(
  productId: string,
  pdfBase64: string,
  pdfFilename: string,
  reportVersion: "v1" | "v3",
): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("panama_report_cache")
      .update({
        pdf_base64: pdfBase64,
        pdf_filename: pdfFilename,
        report_version: reportVersion,
      })
      .eq("product_id", productId);
    if (error !== null) {
      const legacy = await supabase
        .from("panama_report_cache")
        .update({ pdf_base64: pdfBase64, pdf_filename: pdfFilename })
        .eq("product_id", productId);
      if (legacy.error !== null) {
        process.stderr.write(
          `[analyze] PDF cache update 실패: ${legacy.error.message}\n`,
        );
      }
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`[analyze] PDF cache update 예외: ${message}\n`);
  }
}

export async function POST(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "JSON 본문을 파싱할 수 없습니다." },
      { status: 400 },
    );
  }

  if (
    body === null ||
    typeof body !== "object" ||
    !("productId" in body) ||
    typeof (body as { productId: unknown }).productId !== "string"
  ) {
    return NextResponse.json(
      { error: "productId(string)가 필요합니다." },
      { status: 400 },
    );
  }

  const productId = (body as { productId: string }).productId;
  const useV3 = process.env.USE_REPORT1_V3 === "true";
  const reportVersion: "v1" | "v3" = useV3 ? "v3" : "v1";
  if (findProductById(productId) === undefined) {
    return NextResponse.json(
      { error: "등록되지 않은 product_id입니다." },
      { status: 400 },
    );
  }

  try {
    const result = await analyzePanamaProduct(productId);
    const rawDataDigest = buildRawDataDigest(result);
    const prevalenceMetric = extractPrevalenceMetric(
      productId,
      result.priceRows,
      result.macroRows,
    );
    const distributorNames = dedupeDistributorNames(
      result.matchedDistributors.map((d) => d.company_name),
    );
    const panamacompraStats = getPanamacompraStats(productId, result.priceRows);
    const cabamedStats = getCabamedStats(productId, result.priceRows);
    const panamacompraV3Top = extractPanamaCompraV3Top(
      productId,
      result.priceRows as PriceRowLite[],
    );
    const sourceBreakdown = buildSourceBreakdown(
      productId,
      result.priceRows as PriceRowLite[],
      panamacompraV3Top,
    );
    const confidenceBreakdown = buildConfidenceBreakdown(
      result,
      prevalenceMetric,
      sourceBreakdown,
    );
    const entryFeasibility = await evaluatePanamaEntryFeasibility(
      productId,
      result.priceRows as PanamaRow[],
    );
    const entryFeasibilityText = feasibilityToReportText(entryFeasibility);
    const perplexityInsight = await getPerplexityCacheInsight(
      result.product.who_inn_en,
    );
    if (process.env.DEBUG_REPORT1_V3 === "1") {
      console.log(
        "[DEBUG] panamacompraV3Top:",
        JSON.stringify({ productId, panamacompraV3Top }),
      );
    }

    const generatorInput: GeneratorInput = {
      productId,
      innEn: result.product.who_inn_en,
      brandName: result.product.kr_brand_name,
      caseGrade: result.judgment.case,
      caseVerdict: result.judgment.verdict,
      emlWho: result.emlWho,
      emlPaho: result.emlPaho,
      prevalenceMetric,
      pahoRegionalReference: getPahoRegionalReferenceLine(
        result.product.who_inn_en,
      ),
      distributorNames,
      panamacompraCount: result.panamacompraCount,
      panamacompraStats,
      panamacompraV3Top,
      cabamedStats,
      rawDataDigest,
      entryFeasibility,
      entryFeasibilityText,
      perplexityPapers: perplexityInsight?.papers ?? [],
    };
    if (process.env.DEBUG_REPORT1_V3 === "1") {
      console.log(
        "[DEBUG] generatorInput.panamacompraV3Top:",
        JSON.stringify(generatorInput.panamacompraV3Top),
      );
    }

    const llm = useV3
      ? await generateReport1V3(generatorInput)
      : await generateReport1(generatorInput);
    const sourceRowsForPdf = toPdfSourceRows(result.sourceAggregation);
    const confidenceRaw = (result.judgment as { confidence?: unknown }).confidence;
    const confidence =
      typeof confidenceRaw === "number" && Number.isFinite(confidenceRaw)
        ? confidenceRaw
        : 0.75;
    const caseGrade = result.judgment.case;
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    let pdfBase64: string | null = null;
    let pdfFilename: string | null = null;
    const cachedPdf = await tryLoadCachedPdf(productId, reportVersion);
    if (cachedPdf !== null) {
      pdfBase64 = cachedPdf.pdfBase64;
      pdfFilename = cachedPdf.pdfFilename;
    } else {
      try {
        const pdfElement = useV3
          ? React.createElement(Report1DocumentV3, {
              brandName: result.product.kr_brand_name,
              innEn: result.product.who_inn_en,
              hsCode: result.product.hs_code ?? "3004",
              caseGrade,
              caseVerdict: result.judgment.verdict,
              confidence,
              payload: llm.payload as Report1PayloadV3,
              collectedAt: new Date().toISOString().slice(0, 10),
            })
          : React.createElement(Report1Document, {
              brandName: result.product.kr_brand_name,
              innEn: result.product.who_inn_en,
              dosageForm: result.product.formulation,
              hsCode: result.product.hs_code,
              caseGrade,
              caseVerdict: result.judgment.verdict,
              confidence,
              llmPayload: llm.payload as Report1Payload,
              sourceRows: sourceRowsForPdf,
              perplexityPapers: perplexityInsight?.papers ?? [],
              perplexitySource: perplexityInsight?.source ?? "cache_miss",
              collectedAt: new Date().toISOString().slice(0, 10),
            });
        const pdfBuffer = await renderToBuffer(
          pdfElement as React.ReactElement<DocumentProps>,
        );
        if (pdfBuffer.length > 4_500_000) {
          process.stderr.write("[analyze] PDF too large, skipping base64\n");
        } else {
          pdfBase64 = Buffer.from(pdfBuffer).toString("base64");
          const versionSuffix = reportVersion === "v3" ? "_v3" : "_v1";
          pdfFilename = `UPharma_Panama_Report_${today}_${safeFilenameSegment(result.product.who_inn_en)}${versionSuffix}.pdf`;
          await savePdfCache(productId, pdfBase64, pdfFilename, reportVersion);
        }
      } catch (pdfErr: unknown) {
        const message = pdfErr instanceof Error ? pdfErr.message : String(pdfErr);
        process.stderr.write(`[analyze] PDF render failed: ${message}\n`);
      }
    }

    return NextResponse.json({
      judgment: result.judgment,
      macroRows: result.macroRows,
      distributors: result.distributors,
      matchedDistributors: result.matchedDistributors,
      priceRows: result.priceRows,
      emlWho: result.emlWho,
      emlPaho: result.emlPaho,
      emlMinsa: result.emlMinsa,
      emlStatus: {
        emlWho: result.emlWho,
        emlPaho: result.emlPaho,
        emlMinsa: result.emlMinsa,
      },
      sourceAggregation: result.sourceAggregation,
      sandCleaned: result.sandCleaned,
      product: result.product,
      panamacompraCount: result.panamacompraCount,
      privateRetailCount: result.privateRetailCount,
      rawDataDigest,
      prevalenceMetric,
      llm: {
        payload: llm.payload,
        source: llm.source,
        modelUsed: llm.modelUsed,
      },
      marketStats: {
        panamacompra: panamacompraStats,
        cabamed: cabamedStats,
      },
      entryFeasibility,
      entryFeasibilityText,
      sourceBreakdown,
      confidenceBreakdown,
      perplexity: {
        source: perplexityInsight?.source ?? "cache_miss",
        papers: perplexityInsight?.papers ?? [],
      },
      perplexityPapers: perplexityInsight?.papers ?? [],
      pdfBase64,
      pdfFilename,
      reportVersion,
    }, {
      headers: {
        "X-Report-Version": reportVersion,
        "X-LLM-Source": llm.source,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "분석 실패";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
