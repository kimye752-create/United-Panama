/**
 * 클라이언트: 분석 API + LLM → Report1 (웹·PDF 동일 payload)
 */
"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { parseReport1Payload } from "@/src/llm/report1_schema";
import type { Report1Payload } from "@/src/llm/report1_schema";
import type { AnalyzePanamaResult } from "@/src/logic/panama_analysis";
import type { ProductMaster } from "@/src/utils/product-dictionary";

import INNTabs from "./INNTabs";
import { Report1, type LlmBundle } from "./Report1";

function isRecord(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === "object" && !Array.isArray(x);
}

function parseLlmBundle(raw: unknown): LlmBundle | null {
  if (!isRecord(raw)) {
    return null;
  }
  const s = raw.source;
  if (
    s !== "cache" &&
    s !== "opus" &&
    s !== "sonnet" &&
    s !== "fallback"
  ) {
    return null;
  }
  if (typeof raw.modelUsed !== "string") {
    return null;
  }
  const parsed: Report1Payload | null = parseReport1Payload(raw.payload);
  if (parsed === null) {
    return null;
  }
  return { payload: parsed, source: s, modelUsed: raw.modelUsed };
}

type DigestState = {
  rawDataDigest: string;
  prevalenceMetric: string;
};

type Props = {
  product: ProductMaster;
  /** `/panama?inn=` 값 — 탭 하이라이트용 */
  currentInn: string;
};

export function PanamaReportClient({ product, currentInn }: Props) {
  const [data, setData] = useState<AnalyzePanamaResult | null>(null);
  const [llm, setLlm] = useState<LlmBundle | null>(null);
  const [digest, setDigest] = useState<DigestState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
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
      setDigest({
        rawDataDigest: dr,
        prevalenceMetric: pm,
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

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Link
          href="/panama"
          className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
        >
          ← 파나마 국가 개요
        </Link>
        <button
          type="button"
          className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
          disabled={loading}
          onClick={() => {
            void run();
          }}
        >
          {loading ? "분석 중…" : "재분석"}
        </button>
        {error !== null ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : null}
      </div>

      <INNTabs currentInn={currentInn} />

      {loading ? (
        <p className="text-slate-600">분석 및 LLM 본문 생성 중…</p>
      ) : null}
      {data !== null && llm !== null && digest !== null ? (
        <Report1
          data={data}
          llm={llm}
          rawDataDigest={digest.rawDataDigest}
          prevalenceMetric={digest.prevalenceMetric}
        />
      ) : null}
    </div>
  );
}
