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
import { Report1DocumentV3 } from "@/lib/pdf/Report1DocumentV3";
import type { PerplexityPaper } from "@/src/logic/perplexity_insights";
import {
  generateReport1,
  generateReport1V3,
  type GeneratorInput,
} from "@/src/llm/report1_generator";
import {
  parseReport1Payload,
  parseReport1PayloadV3,
  type Report1PayloadV3,
} from "@/src/llm/report1_schema";
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
import type { PanamaRow } from "@/src/logic/fetch_panama_data";
import {
  evaluatePanamaEntryFeasibility,
  feasibilityToReportText,
  type EntryFeasibility,
} from "@/src/llm/logic/panama_entry_feasibility";
import { createSupabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const maxDuration = 120; // Vercel Function timeout 120초 (Haiku 58초 + PDF 렌더링 여유)
const USE_V3 = process.env.USE_REPORT1_V3 === "true";

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
    count: number;
    proveedorWins: number;
    fabricante: string;
    paisOrigen: string;
    nombreComercial: string;
    entidadCompradora: string;
    fechaOrden: string;
    representativePrice: number | null;
  } | null;
  entryFeasibility?: EntryFeasibility;
  entryFeasibilityText?: string;
}

interface MinimalPdfRequestBody {
  productId: string;
}

interface CachedReportRow {
  case_grade: "A" | "B" | "C" | string;
  report_payload: unknown;
  generated_at: string;
  expires_at: string;
  report_version?: string | null;
}

type CachedPdfBuildResult =
  | { version: "v1"; props: Report1PdfProps }
  | {
      version: "v3";
      payload: Report1PayloadV3;
      product: {
        brandName: string;
        innEn: string;
        hsCode: string;
      };
      caseGrade: "A" | "B" | "C";
      caseVerdict: string;
      confidence: number;
      collectedAt: string;
    };

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

function parseEntryFeasibility(raw: unknown): EntryFeasibility | null {
  if (!isRecord(raw)) {
    return null;
  }
  const grade = raw.grade;
  const verdict = raw.verdict;
  const durationDays = raw.duration_days;
  const costUsd = raw.cost_usd;
  const path = raw.path;
  const evidence = raw.evidence;
  const allowedGrades: EntryFeasibility["grade"][] = [
    "A_immediate",
    "B_short_term",
    "C_mid_term",
    "D_long_term",
    "F_blocked",
    "unknown",
  ];
  if (
    typeof grade !== "string" ||
    !allowedGrades.includes(grade as EntryFeasibility["grade"])
  ) {
    return null;
  }
  if (typeof verdict !== "string" || typeof path !== "string" || !isRecord(evidence)) {
    return null;
  }
  if (
    durationDays !== null &&
    durationDays !== undefined &&
    typeof durationDays !== "number"
  ) {
    return null;
  }
  if (costUsd !== null && costUsd !== undefined && typeof costUsd !== "number") {
    return null;
  }
  return {
    grade: grade as EntryFeasibility["grade"],
    verdict,
    duration_days:
      typeof durationDays === "number" && Number.isFinite(durationDays)
        ? durationDays
        : null,
    cost_usd:
      typeof costUsd === "number" && Number.isFinite(costUsd) ? costUsd : null,
    path,
    evidence,
  };
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

  const parsed: PdfRequestBody = {
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
  if (
    "entryFeasibilityText" in raw &&
    typeof raw.entryFeasibilityText === "string" &&
    raw.entryFeasibilityText.trim() !== ""
  ) {
    parsed.entryFeasibilityText = raw.entryFeasibilityText;
  }
  if ("entryFeasibility" in raw) {
    const parsedFeasibility = parseEntryFeasibility(raw.entryFeasibility);
    if (parsedFeasibility !== null) {
      parsed.entryFeasibility = parsedFeasibility;
    }
  }
  return parsed;
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

function resolveCaseVerdict(caseGrade: "A" | "B" | "C"): string {
  if (caseGrade === "A") {
    return "즉시 진입 가능";
  }
  if (caseGrade === "B") {
    return "조건부 진입 가능";
  }
  return "추가 검토 필요";
}

function resolveConfidence(caseGrade: "A" | "B" | "C"): number {
  if (caseGrade === "A") {
    return 0.9;
  }
  if (caseGrade === "B") {
    return 0.78;
  }
  return 0.64;
}

function parseCaseGrade(raw: unknown): "A" | "B" | "C" | null {
  if (raw === "A" || raw === "B" || raw === "C") {
    return raw;
  }
  return null;
}

async function tryBuildPdfPropsFromCache(
  productId: string,
): Promise<CachedPdfBuildResult | null> {
  const product = findProductById(productId);
  if (product === undefined) {
    return null;
  }
  const sb = createSupabaseServer();
  let row: CachedReportRow | null = null;
  if (USE_V3) {
    const current = await sb
      .from("panama_report_cache")
      .select("case_grade, report_payload, generated_at, expires_at, report_version")
      .eq("product_id", productId)
      .eq("report_version", "v3")
      .maybeSingle();
    if (current.error !== null || current.data === null) {
      return null;
    }
    row = current.data as CachedReportRow;
  } else {
    const current = await sb
      .from("panama_report_cache")
      .select("case_grade, report_payload, generated_at, expires_at, report_version")
      .eq("product_id", productId)
      .eq("report_version", "v1")
      .maybeSingle();
    if (current.error === null && current.data !== null) {
      row = current.data as CachedReportRow;
    } else {
      const legacy = await sb
        .from("panama_report_cache")
        .select("case_grade, report_payload, generated_at, expires_at")
        .eq("product_id", productId)
        .maybeSingle();
      if (legacy.error !== null || legacy.data === null) {
        return null;
      }
      row = legacy.data as CachedReportRow;
    }
  }
  if (row === null) {
    return null;
  }
  if (new Date(row.expires_at) < new Date()) {
    return null;
  }
  const caseGrade = parseCaseGrade(row.case_grade) ?? "B";
  const collectedAt = (() => {
    const iso = row.generated_at;
    if (typeof iso !== "string" || iso.trim() === "") {
      return new Date().toISOString().slice(0, 10);
    }
    return iso.slice(0, 10);
  })();
  if (USE_V3) {
    const llmPayload = parseReport1PayloadV3(row.report_payload);
    if (llmPayload === null) {
      return null;
    }
    return {
      version: "v3",
      payload: llmPayload,
      product: {
        brandName: product.kr_brand_name,
        innEn: product.who_inn_en,
        hsCode: product.hs_code ?? defaultHsCode(),
      },
      caseGrade,
      caseVerdict: resolveCaseVerdict(caseGrade),
      confidence: resolveConfidence(caseGrade),
      collectedAt,
    };
  }
  const llmPayload = parseReport1Payload(row.report_payload);
  if (llmPayload === null) {
    return null;
  }
  return {
    version: "v1",
    props: {
      brandName: product.kr_brand_name,
      innEn: product.who_inn_en,
      dosageForm: defaultDosageForm(product.who_inn_en),
      hsCode: defaultHsCode(),
      caseGrade,
      caseVerdict: resolveCaseVerdict(caseGrade),
      confidence: resolveConfidence(caseGrade),
      llmPayload,
      sourceRows: [
        {
          source: "panama_report_cache",
          count: 1,
          avgConfidence: resolveConfidence(caseGrade),
        },
      ],
      perplexityPapers: [],
      perplexitySource: "cache_only",
      collectedAt,
    },
  };
}

async function saveReportPayloadCache(
  productId: string,
  caseGrade: "A" | "B" | "C",
  reportPayload: unknown,
  llmModel: string,
): Promise<void> {
  const sb = createSupabaseServer();
  const generatedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const withVersion = await sb.from("panama_report_cache").upsert(
    {
      product_id: productId,
      case_grade: caseGrade,
      report_payload: reportPayload,
      llm_model: llmModel,
      report_version: USE_V3 ? "v3" : "v1",
      generated_at: generatedAt,
      expires_at: expiresAt,
    },
    { onConflict: "product_id" },
  );
  if (withVersion.error === null) {
    return;
  }
  const legacy = await sb.from("panama_report_cache").upsert(
    {
      product_id: productId,
      case_grade: caseGrade,
      report_payload: reportPayload,
      llm_model: llmModel,
      generated_at: generatedAt,
      expires_at: expiresAt,
    },
    { onConflict: "product_id" },
  );
  if (legacy.error !== null) {
    process.stderr.write(
      `[pdf-route] 캐시 저장 실패: ${legacy.error.message}\n`,
    );
  }
}

type PriceRowLite = {
  product_id?: string | null;
  pa_source?: string | null;
  pa_price_local?: number | string | null;
  pa_notes?: string | null;
  pa_product_name_local?: string | null;
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
  const entryFeasibility = await evaluatePanamaEntryFeasibility(
    productId,
    analyzed.priceRows as PanamaRow[],
  );
  const entryFeasibilityText = feasibilityToReportText(entryFeasibility);
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
    entryFeasibility,
    entryFeasibilityText,
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
  if (body === null && minimalBody !== null) {
    try {
      const cachedProps = await tryBuildPdfPropsFromCache(minimalBody.productId);
      if (cachedProps !== null) {
        const cachedBuffer =
          cachedProps.version === "v3"
            ? await renderToBuffer(
                React.createElement(Report1DocumentV3, {
                  brandName: cachedProps.product.brandName,
                  innEn: cachedProps.product.innEn,
                  hsCode: cachedProps.product.hsCode,
                  caseGrade: cachedProps.caseGrade,
                  caseVerdict: cachedProps.caseVerdict,
                  confidence: cachedProps.confidence,
                  payload: cachedProps.payload,
                  collectedAt: cachedProps.collectedAt,
                }) as React.ReactElement<DocumentProps>,
              )
            : await renderToBuffer(
                React.createElement(
                  Report1Document,
                  cachedProps.props,
                ) as React.ReactElement<DocumentProps>,
              );
        const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        const cachedInn =
          cachedProps.version === "v3"
            ? cachedProps.product.innEn
            : cachedProps.props.innEn;
        const versionSuffix = cachedProps.version === "v3" ? "_v3" : "_v1";
        const filename = `UPharma_Panama_Report_${today}_${safeFilenameSegment(cachedInn)}${versionSuffix}.pdf`;
        return new NextResponse(new Uint8Array(cachedBuffer), {
          status: 200,
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${filename}"`,
            "X-LLM-Source": "cache",
            "X-PDF-Path": "fast-cache",
            "X-Report-Version": cachedProps.version,
          },
        });
      }
    } catch {
      // 캐시 경로 실패 시 기존 전체 분석 경로로 자동 폴백합니다.
    }
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
  const analyzedForEntry =
    resolvedBody.entryFeasibility === undefined
      ? await analyzePanamaProduct(resolvedBody.productId)
      : null;
  const entryFeasibility =
    resolvedBody.entryFeasibility ??
    (await evaluatePanamaEntryFeasibility(
      resolvedBody.productId,
      (analyzedForEntry?.priceRows ?? []) as PanamaRow[],
    ));
  const entryFeasibilityText =
    resolvedBody.entryFeasibilityText ?? feasibilityToReportText(entryFeasibility);

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
    entryFeasibility,
    entryFeasibilityText,
    perplexityPapers: resolvedBody.perplexityPapers,
  };

  try {
    const llmResult = USE_V3
      ? await generateReport1V3(generatorInput)
      : await generateReport1(generatorInput);

    await saveReportPayloadCache(
      resolvedBody.productId,
      resolvedBody.caseGrade,
      llmResult.payload,
      llmResult.modelUsed,
    );

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

    const pdfElement = USE_V3
      ? React.createElement(Report1DocumentV3, {
          brandName: product.kr_brand_name,
          innEn: product.who_inn_en,
          hsCode: product.hs_code ?? "3004",
          caseGrade: resolvedBody.caseGrade,
          caseVerdict: resolvedBody.caseVerdict,
          confidence: resolvedBody.confidence,
          payload: llmResult.payload as Report1PayloadV3,
          collectedAt: new Date().toISOString().slice(0, 10),
        })
      : React.createElement(Report1Document, pdfProps);
    const buffer = await renderToBuffer(
      pdfElement as React.ReactElement<DocumentProps>,
    );
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const versionSuffix = USE_V3 ? "_v3" : "_v1";
    const filename = `UPharma_Panama_Report_${today}_${safeFilenameSegment(product.who_inn_en)}${versionSuffix}.pdf`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "X-LLM-Source": llmResult.source,
        "X-Report-Version": USE_V3 ? "v3" : "v1",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
