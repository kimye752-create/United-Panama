/**
 * 클라이언트: 분석 API + LLM → Report1 (웹·PDF 동일 payload)
 * 로딩: 공통 단순 스피너(다국가 UX)
 */
"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { upsertStoredReport } from "@/src/lib/dashboard/reports_store";
import { parseReport1Payload } from "@/src/llm/report1_schema";
import type { Report1Payload } from "@/src/llm/report1_schema";
import type { AnalyzePanamaResult } from "@/src/logic/panama_analysis";
import type { PerplexityPaper } from "@/src/logic/perplexity_insights";
import type { ProductMaster } from "@/src/utils/product-dictionary";

import { AnalysisResultDashboard } from "./panama/AnalysisResultDashboard";
import type { ConfidenceBreakdown, DashboardBundle, SourceBreakdown } from "./panama/types";
import INNTabs from "./INNTabs";
import type { LlmBundle } from "./Report1";

function isRecord(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === "object" && !Array.isArray(x);
}

function parseLlmBundle(raw: unknown): LlmBundle | null {
  if (!isRecord(raw)) {
    return null;
  }
  const s = raw.source;
  /** 레거시: 이전 빌드(opus/sonnet) API 응답도 haiku로 표시 */
  let normalized: LlmBundle["source"];
  if (s === "cache") {
    normalized = "cache";
  } else if (s === "fallback") {
    normalized = "fallback";
  } else if (s === "haiku" || s === "opus" || s === "sonnet") {
    normalized = "haiku";
  } else {
    return null;
  }
  if (typeof raw.modelUsed !== "string") {
    return null;
  }
  const parsed: Report1Payload | null = parseReport1Payload(raw.payload);
  if (parsed === null) {
    return null;
  }
  return { payload: parsed, source: normalized, modelUsed: raw.modelUsed };
}

const EMPTY_SOURCE_BREAKDOWN: SourceBreakdown = {
  panamacompra_v3: {
    count: 0,
    avgPrice: null,
    minPrice: null,
    maxPrice: null,
    topProveedor: null,
  },
  acodeco: {
    count: 0,
    avgPrice: null,
  },
  superxtra: {
    count: 0,
    price: null,
    hasStock: null,
  },
  colombia_secop: {
    count: 0,
    avgPrice: null,
    erpBasis: "WHO 2015 ERP",
  },
};

const EMPTY_CONFIDENCE_BREAKDOWN: ConfidenceBreakdown = {
  publicProcurement: false,
  privatePrice: false,
  eml: false,
  erpReference: false,
  distributors: false,
  regulation: false,
  prevalence: false,
  total: 0,
  max: 7,
  percent: 0,
};

function parseSourceBreakdown(raw: unknown): SourceBreakdown {
  if (!isRecord(raw)) {
    return EMPTY_SOURCE_BREAKDOWN;
  }
  const pickNumberOrNull = (value: unknown): number | null =>
    typeof value === "number" && Number.isFinite(value) ? value : null;
  const panamaRaw = isRecord(raw.panamacompra_v3) ? raw.panamacompra_v3 : {};
  const acodecoRaw = isRecord(raw.acodeco) ? raw.acodeco : {};
  const superxtraRaw = isRecord(raw.superxtra) ? raw.superxtra : {};
  const colombiaRaw = isRecord(raw.colombia_secop) ? raw.colombia_secop : {};

  return {
    panamacompra_v3: {
      count: typeof panamaRaw.count === "number" ? panamaRaw.count : 0,
      avgPrice: pickNumberOrNull(panamaRaw.avgPrice),
      minPrice: pickNumberOrNull(panamaRaw.minPrice),
      maxPrice: pickNumberOrNull(panamaRaw.maxPrice),
      topProveedor:
        typeof panamaRaw.topProveedor === "string" ? panamaRaw.topProveedor : null,
    },
    acodeco: {
      count: typeof acodecoRaw.count === "number" ? acodecoRaw.count : 0,
      avgPrice: pickNumberOrNull(acodecoRaw.avgPrice),
    },
    superxtra: {
      count: typeof superxtraRaw.count === "number" ? superxtraRaw.count : 0,
      price: pickNumberOrNull(superxtraRaw.price),
      hasStock: typeof superxtraRaw.hasStock === "boolean" ? superxtraRaw.hasStock : null,
    },
    colombia_secop: {
      count: typeof colombiaRaw.count === "number" ? colombiaRaw.count : 0,
      avgPrice: pickNumberOrNull(colombiaRaw.avgPrice),
      erpBasis:
        typeof colombiaRaw.erpBasis === "string" && colombiaRaw.erpBasis.trim() !== ""
          ? colombiaRaw.erpBasis
          : "WHO 2015 ERP",
    },
  };
}

function parseConfidenceBreakdown(raw: unknown): ConfidenceBreakdown {
  if (!isRecord(raw)) {
    return EMPTY_CONFIDENCE_BREAKDOWN;
  }
  const pickBool = (value: unknown): boolean => value === true;
  const pickNumber = (value: unknown, fallback: number): number =>
    typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return {
    publicProcurement: pickBool(raw.publicProcurement),
    privatePrice: pickBool(raw.privatePrice),
    eml: pickBool(raw.eml),
    erpReference: pickBool(raw.erpReference),
    distributors: pickBool(raw.distributors),
    regulation: pickBool(raw.regulation),
    prevalence: pickBool(raw.prevalence),
    total: pickNumber(raw.total, 0),
    max: pickNumber(raw.max, 7),
    percent: pickNumber(raw.percent, 0),
  };
}

type Props = {
  product: ProductMaster;
  /** URL `?inn=` — INN 탭 활성 표시 */
  currentInn: string;
  /** 대시보드 임베드 시 상단 복귀 링크 숨김 */
  showBackLink?: boolean;
  /** 임베드 모드에서 INN 탭 숨김 */
  showInnTabs?: boolean;
  /** 상위 컴포넌트 단계 표시용 로딩 상태 브리지 */
  onLoadingChange?: (loading: boolean) => void;
};

export function PanamaReportClient({
  product,
  currentInn,
  showBackLink = true,
  showInnTabs = true,
  onLoadingChange,
}: Props) {
  const [data, setData] = useState<AnalyzePanamaResult | null>(null);
  const [llm, setLlm] = useState<LlmBundle | null>(null);
  const [dashboard, setDashboard] = useState<DashboardBundle | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    setData(null);
    setLlm(null);
    setDashboard(null);
    try {
      const res = await fetch("/api/panama/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.product_id }),
      });
      const raw: unknown = await res.json();
      if (!res.ok) {
        const msg =
          isRecord(raw) && typeof raw.error === "string"
            ? raw.error
            : "분석 요청 실패";
        setError(msg);
        return;
      }
      if (!isRecord(raw)) {
        setError("응답 형식 오류");
        return;
      }

      const lb = parseLlmBundle(raw.llm);
      if (lb === null) {
        setError("LLM 응답 파싱 실패");
        return;
      }

      const dr = raw.rawDataDigest;
      const pmRaw = raw.prevalenceMetric;
      if (typeof dr !== "string") {
        setError("rawDataDigest 누락");
        return;
      }
      if (
        pmRaw !== undefined &&
        pmRaw !== null &&
        typeof pmRaw !== "string"
      ) {
        setError("prevalenceMetric 형식 오류");
        return;
      }
      const pm = typeof pmRaw === "string" ? pmRaw : "";
      const perplexityRaw = raw.perplexity;
      let perplexityPapers: PerplexityPaper[] = [];
      let perplexitySource = "cache_miss";
      if (
        isRecord(perplexityRaw) &&
        Array.isArray(perplexityRaw.papers) &&
        typeof perplexityRaw.source === "string"
      ) {
        perplexityPapers = perplexityRaw.papers.filter((paper): paper is PerplexityPaper => {
          if (!isRecord(paper)) {
            return false;
          }
          return (
            typeof paper.title === "string" &&
            typeof paper.url === "string" &&
            (typeof paper.published_at === "string" || paper.published_at === null) &&
            typeof paper.summary === "string" &&
            typeof paper.source === "string"
          );
        });
        perplexitySource = perplexityRaw.source;
      }

      if (
        raw.judgment === null ||
        typeof raw.judgment !== "object" ||
        raw.product === null ||
        typeof raw.product !== "object" ||
        !Array.isArray(raw.macroRows) ||
        !Array.isArray(raw.distributors) ||
        !Array.isArray(raw.matchedDistributors) ||
        !Array.isArray(raw.priceRows) ||
        !Array.isArray(raw.sourceAggregation) ||
        !Array.isArray(raw.sandCleaned) ||
        typeof raw.emlWho !== "boolean" ||
        typeof raw.emlPaho !== "boolean" ||
        typeof raw.emlMinsa !== "boolean" ||
        typeof raw.panamacompraCount !== "number" ||
        typeof raw.privateRetailCount !== "number"
      ) {
        setError("분석 응답 스키마 불일치");
        return;
      }

      const analyze: AnalyzePanamaResult = {
        product: raw.product as ProductMaster,
        judgment: raw.judgment as AnalyzePanamaResult["judgment"],
        macroRows: raw.macroRows as AnalyzePanamaResult["macroRows"],
        distributors: raw.distributors as AnalyzePanamaResult["distributors"],
        matchedDistributors:
          raw.matchedDistributors as AnalyzePanamaResult["matchedDistributors"],
        priceRows: raw.priceRows as AnalyzePanamaResult["priceRows"],
        sandCleaned: raw.sandCleaned as AnalyzePanamaResult["sandCleaned"],
        emlWho: raw.emlWho,
        emlPaho: raw.emlPaho,
        emlMinsa: raw.emlMinsa,
        sourceAggregation:
          raw.sourceAggregation as AnalyzePanamaResult["sourceAggregation"],
        panamacompraCount: raw.panamacompraCount,
        privateRetailCount: raw.privateRetailCount,
      };

      setData(analyze);
      setLlm(lb);
      setDashboard({
        product: analyze.product,
        caseGrade: analyze.judgment.case,
        confidence: analyze.judgment.confidence,
        verdict: analyze.judgment.verdict,
        llmPayload: lb.payload,
        sourceBreakdown: parseSourceBreakdown(raw.sourceBreakdown),
        confidenceBreakdown: parseConfidenceBreakdown(raw.confidenceBreakdown),
        perplexityPapers,
        perplexitySource,
        collectedAt: new Date().toISOString().slice(0, 10),
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "네트워크 오류";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [product.product_id]);

  useEffect(() => {
    void run();
  }, [run]);

  useEffect(() => {
    if (data === null || llm === null || error !== null) {
      return;
    }
    upsertStoredReport({
      productId: data.product.product_id,
      brand: data.product.kr_brand_name,
      inn: data.product.who_inn_en,
      caseGrade: data.judgment.case,
    });
  }, [data, llm, error]);

  useEffect(() => {
    onLoadingChange?.(loading);
  }, [loading, onLoadingChange]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      {showBackLink ? (
        <Link
          href="/panama"
          className="mb-6 inline-block rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
        >
          ← 파나마 국가 개요
        </Link>
      ) : null}

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-lg text-gray-700">파나마 시장 분석 중...</p>
          <p className="text-sm text-gray-500">
            DB 조회 + 보고서 생성 (최대 3분 소요)
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
              disabled={loading}
              onClick={() => {
                void run();
              }}
            >
              재분석
            </button>
            {error !== null ? (
              <p className="text-sm text-red-600">{error}</p>
            ) : null}
          </div>

          {showInnTabs ? <INNTabs currentInn={currentInn} /> : null}

          {data !== null && llm !== null && dashboard !== null && error === null ? (
            <div className="space-y-6">
              <AnalysisResultDashboard
                dashboard={dashboard}
                onReanalyze={() => {
                  void run();
                }}
                loading={loading}
              />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
