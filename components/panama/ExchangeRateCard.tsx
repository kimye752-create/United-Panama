"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Card, IRow } from "@/components/dashboard/shared/Card";

interface ExchangeRateData {
  krwPerUsd: number;
  source: "api_success" | "db_fallback";
  asOf: string;
}

const REFRESH_COOLDOWN_SECONDS = 30;

function formatRate(value: number): string {
  return value.toLocaleString("ko-KR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatAsOf(asOf: string): string {
  const parsed = new Date(`${asOf}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return asOf;
  }
  return parsed.toLocaleDateString("ko-KR");
}

export function ExchangeRateCard() {
  const [data, setData] = useState<ExchangeRateData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldownLeft, setCooldownLeft] = useState(0);

  const loadRate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/panama/exchange-rate", {
        method: "GET",
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(`환율 조회 실패: HTTP ${String(response.status)}`);
      }
      const json = (await response.json()) as unknown;
      if (
        json === null ||
        typeof json !== "object" ||
        Array.isArray(json) ||
        typeof (json as { krwPerUsd?: unknown }).krwPerUsd !== "number" ||
        ((json as { source?: unknown }).source !== "api_success" &&
          (json as { source?: unknown }).source !== "db_fallback") ||
        typeof (json as { asOf?: unknown }).asOf !== "string"
      ) {
        throw new Error("환율 API 응답 형식이 올바르지 않습니다.");
      }
      const parsed = json as ExchangeRateData;
      setData(parsed);
      setCooldownLeft(REFRESH_COOLDOWN_SECONDS);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "환율 정보를 불러올 수 없습니다.";
      setError(message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRate();
  }, [loadRate]);

  useEffect(() => {
    if (cooldownLeft <= 0) {
      return;
    }
    const timer = window.setTimeout(() => {
      setCooldownLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => {
      window.clearTimeout(timer);
    };
  }, [cooldownLeft]);

  const sourceLabel = useMemo(() => {
    if (data === null) {
      return "";
    }
    if (data.source === "api_success") {
      return "실시간";
    }
    return `최근 저장값 (${formatAsOf(data.asOf)})`;
  }, [data]);

  return (
    <Card title="관세 · 환율 현황">
      <IRow>
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="mb-1 text-[13px] font-extrabold text-navy">HS 3004.90 — 개량신약 · 일반제 · 항암제</div>
            <div className="text-[11.5px] text-muted">KAFTA(한-호주 FTA) · MFN 동일 0% 적용</div>
          </div>
          <span className="text-[32px] font-black text-green">0%</span>
        </div>
      </IRow>
      <IRow>
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="mb-1 text-[13px] font-extrabold text-navy">HS 3006.30 — 조영제 (Gadvoa Inj.)</div>
            <div className="text-[11.5px] text-muted">Gadobutrol 604.72mg · KAFTA 0%</div>
          </div>
          <span className="text-[32px] font-black text-green">0%</span>
        </div>
      </IRow>
      <IRow>
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="mb-1 text-[13px] font-extrabold text-navy">GST · 처방의약품 (GST-free, 부가세 면제)</div>
            <div className="text-[11.5px] text-muted">Hydrine · Sereterol · Gadvoa · Rosumeg · Atmeg · Ciloduo · Gastiin CR</div>
          </div>
          <span className="text-[32px] font-black text-green">0%</span>
        </div>
      </IRow>
      <IRow>
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="mb-1 text-[13px] font-extrabold text-navy">GST · OTC·건강기능식품 (부가가치세 과세)</div>
            <div className="text-[11.5px] text-muted">Omethyl (Omega-3) — 민간 유통 시 표시가에 포함</div>
          </div>
          <span className="text-[32px] font-black text-warn">10%</span>
        </div>
      </IRow>

      <div className="mt-4">
        <p className="text-[11px] font-bold text-muted">KRW / USD</p>
        {error !== null ? (
          <p className="mt-2 text-[12px] text-red-600">{error}</p>
        ) : data !== null ? (
          <>
            <div className="leading-none tracking-[-0.03em] text-[#1E3A5F]">
              <span className="text-2xl font-bold">{formatRate(data.krwPerUsd)}</span>
              <span className="ml-1 text-lg text-gray-500">원</span>
              <span
                className={`ml-2 text-xs ${
                  data.source === "api_success" ? "text-emerald-600" : "text-orange-400"
                }`}
              >
                ({sourceLabel})
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-500">USD / KRW</p>
                <p className="text-lg font-semibold text-[#1E3A5F]">{formatRate(data.krwPerUsd)}</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-500">USD / PAB</p>
                <p className="text-lg font-semibold text-[#1E3A5F]">
                  1.00 <span className="ml-1 text-sm text-gray-400">(고정)</span>
                </p>
              </div>
            </div>
          </>
        ) : (
          <p className="mt-2 text-[12px] text-muted">환율 정보를 불러오는 중...</p>
        )}

        <p className="mt-3 text-xs leading-relaxed text-gray-400">
          💡 파나마 발보아(PAB)는 1904년부터 USD와 1:1 고정 환율(Pegged). 실거래에서 USD를 직접 사용하므로
          환율 변환이 불필요합니다.
        </p>
        <p className="mt-1 text-[11px] text-muted">조회: {data !== null ? formatAsOf(data.asOf) : "-"}</p>

        <button
          type="button"
          disabled={loading || cooldownLeft > 0}
          onClick={() => {
            void loadRate();
          }}
          className="mt-3 inline-flex h-[36px] items-center rounded-lg border px-4 py-2 text-sm text-[#1E3A5F] disabled:cursor-not-allowed disabled:opacity-50"
        >
          ↻ 환율 새로고침
          {cooldownLeft > 0 ? ` (${String(cooldownLeft)}초)` : ""}
        </button>
      </div>
    </Card>
  );
}
