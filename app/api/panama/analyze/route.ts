/**
 * POST { productId } — 분석 파이프라인 + W5 generateReport1 (캐시·폴백)
 */
import { NextResponse } from "next/server";

import { analyzePanamaProduct } from "@/src/logic/panama_analysis";
import {
  buildRawDataDigest,
  dedupeDistributorNames,
  extractPrevalenceMetric,
} from "@/src/logic/report1_digest";
import { generateReport1, type GeneratorInput } from "@/src/llm/report1_generator";
import { getCabamedStats, getPanamacompraStats } from "@/src/logic/market_stats";
import { getPahoRegionalReferenceLine } from "@/src/logic/paho_reference_prices";
import { getPerplexityCacheInsight } from "@/src/logic/perplexity_insights";
import { findProductById } from "@/src/utils/product-dictionary";
import type { PanamaRow } from "@/src/logic/fetch_panama_data";
import {
  evaluatePanamaEntryFeasibility,
  feasibilityToReportText,
} from "@/src/llm/logic/panama_entry_feasibility";

export const runtime = "nodejs";

type PriceRowLite = {
  product_id?: string | null;
  pa_source?: string | null;
  pa_price_local?: number | string | null;
  pa_notes?: string | null;
  pa_product_name_local?: string | null;
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
    const entryFeasibility = await evaluatePanamaEntryFeasibility(
      productId,
      result.priceRows as PanamaRow[],
    );
    const entryFeasibilityText = feasibilityToReportText(entryFeasibility);
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
    };
    if (process.env.DEBUG_REPORT1_V3 === "1") {
      console.log(
        "[DEBUG] generatorInput.panamacompraV3Top:",
        JSON.stringify(generatorInput.panamacompraV3Top),
      );
    }

    const llm = await generateReport1(generatorInput);
    const perplexityInsight = await getPerplexityCacheInsight(
      result.product.who_inn_en,
    );

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
      perplexity: {
        source: perplexityInsight?.source ?? "cache_miss",
        papers: perplexityInsight?.papers ?? [],
      },
      perplexityPapers: perplexityInsight?.papers ?? [],
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "분석 실패";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
