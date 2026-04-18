"use client";

import { useEffect, useMemo, useState } from "react";

import { removeStoredReport, type StoredReportItem } from "@/src/lib/dashboard/reports_store";
import type { CompetitorPricesPayload } from "@/src/logic/phase2/competitor_prices";
import {
  Phase2ResultTabs,
  type Phase2ResultPayload,
} from "./Phase2ResultTabs";

interface Phase2SectionProps {
  onCompleted: () => void;
  reports: StoredReportItem[];
  /** 세션에서 보고서 제거 후 목록 재동기화 */
  onReportsChanged?: () => void;
}

interface AnalyzeApiResponse {
  ok?: boolean;
  error?: string;
  message?: string;
  finalPricePab: number;
  public_market: Phase2ResultPayload["public_market"];
  private_market: Phase2ResultPayload["private_market"];
  competitorPrices: CompetitorPricesPayload;
  pdfBase64?: string | null;
  pdfFilename?: string | null;
  generatedAt: string;
}

function formatReportLabel(item: StoredReportItem): string {
  const date = new Date(item.analyzedAt);
  if (Number.isNaN(date.getTime())) {
    return `1공정 보고서 · ${item.productBrandName} · 날짜 미상`;
  }
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `1공정 보고서 · ${item.productBrandName} · ${y}-${m}-${d} ${hh}:${mm}`;
}

function formatPriceCell(value: number | null): string {
  if (value === null) {
    return "미수집";
  }
  return `$${value.toFixed(4)}`;
}

export function Phase2Section({ onCompleted, reports, onReportsChanged }: Phase2SectionProps) {
  const [expanded, setExpanded] = useState(true);
  const [reportId, setReportId] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysisStarted, setAnalysisStarted] = useState(false);
  const [analysisCompleted, setAnalysisCompleted] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [result, setResult] = useState<Phase2ResultPayload | null>(null);
  const [competitorPrices, setCompetitorPrices] = useState<CompetitorPricesPayload | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfFilename, setPdfFilename] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (pdfBlobUrl !== null) {
        URL.revokeObjectURL(pdfBlobUrl);
      }
    };
  }, [pdfBlobUrl]);

  useEffect(() => {
    setErrorMessage(null);
  }, [reportId]);

  const selectedReport = useMemo(
    () => reports.find((report) => report.id === reportId) ?? null,
    [reports, reportId],
  );

  const PROGRESS_LABELS = [
    "PDF 추출",
    "가격 추출",
    "AI 분석",
    "보고서 생성",
  ] as const;

  const runPhase2 = async () => {
    if (selectedReport === null) {
      window.alert("먼저 1공정 보고서를 선택해 주세요.");
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    setAnalysisStarted(true);
    setAnalysisCompleted(false);
    setResult(null);
    setCompetitorPrices(null);
    setPdfBlobUrl((prev) => {
      if (prev !== null) {
        URL.revokeObjectURL(prev);
      }
      return null;
    });
    setPdfFilename(null);
    setProgressStep(1);

    const timer1 = window.setTimeout(() => {
      setProgressStep(2);
    }, 3000);
    const timer2 = window.setTimeout(() => {
      setProgressStep(3);
    }, 6000);

    try {
      const response = await fetch("/api/panama/phase2/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedReport.productId,
          reportId: selectedReport.id,
          market: "public",
        }),
      });
      const payload = (await response.json()) as AnalyzeApiResponse;
      if (response.status === 404 && payload.error === "product_not_found") {
        removeStoredReport(selectedReport.id);
        onReportsChanged?.();
        setReportId("");
        setErrorMessage(
          typeof payload.message === "string" && payload.message.trim() !== ""
            ? payload.message
            : "해당 보고서는 유효하지 않습니다. 1공정에서 새로 생성해주세요.",
        );
        setAnalysisStarted(false);
        setProgressStep(0);
        return;
      }
      if (!response.ok || payload.ok !== true) {
        const msg =
          typeof payload.error === "string" && payload.error.trim() !== ""
            ? payload.error
            : `HTTP ${String(response.status)}`;
        throw new Error(msg);
      }

      setProgressStep(4);
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, 2000);
      });
      setProgressStep(5);

      setResult({
        finalPricePab: payload.finalPricePab,
        public_market: payload.public_market,
        private_market: payload.private_market,
        generatedAt: payload.generatedAt,
      });
      setCompetitorPrices(payload.competitorPrices);

      if (
        typeof payload.pdfBase64 === "string" &&
        payload.pdfBase64.trim() !== "" &&
        typeof payload.pdfFilename === "string" &&
        payload.pdfFilename.trim() !== ""
      ) {
        try {
          const binary = window.atob(payload.pdfBase64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i += 1) {
            bytes[i] = binary.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: "application/pdf" });
          setPdfBlobUrl(URL.createObjectURL(blob));
          setPdfFilename(payload.pdfFilename);
        } catch {
          window.alert(
            "PDF 데이터 변환에 실패했습니다. 네트워크 상태를 확인한 뒤 다시 시도해 주세요.",
          );
        }
      }

      setAnalysisCompleted(true);
      onCompleted();
    } catch (error: unknown) {
      window.alert(
        `2공정 분석 실패: ${
          error instanceof Error ? error.message : "알 수 없는 오류"
        }\n해결 방법: 보고서 선택 상태와 서버 연결을 확인한 뒤 다시 시도해 주세요.`,
      );
      setAnalysisStarted(false);
      setProgressStep(0);
    } finally {
      window.clearTimeout(timer1);
      window.clearTimeout(timer2);
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (pdfBlobUrl === null || pdfFilename === null) {
      return;
    }
    const anchor = document.createElement("a");
    anchor.href = pdfBlobUrl;
    anchor.download = pdfFilename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  return (
    <section className="rounded-[16px] border border-[#e3e9f2] bg-white shadow-sh2">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#1E3A5F] text-[11px] font-black text-white">
            02
          </span>
          <div>
            <h3 className="text-[16px] font-extrabold text-[#1f3e64]">2공정 · 수출가격 전략</h3>
            <p className="text-[11px] text-[#7a8ba1]">AI 가격 분석 · 3가지 시나리오 · PDF 보고서</p>
          </div>
        </div>
        <span className="text-[14px] text-[#516882]">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded ? (
        <div className="space-y-3 border-t border-[#edf1f6] px-4 pb-4 pt-3">
          <div>
            <p className="mb-1 text-[10.5px] font-semibold text-[#667b95]">1공정 보고서 선택</p>
            {errorMessage !== null ? (
              <p className="mb-2 text-[11px] font-medium text-[#c0392b]">{errorMessage}</p>
            ) : null}
            <select
              value={reportId}
              onChange={(event) => setReportId(event.target.value)}
              className="h-[40px] w-full rounded-[10px] border border-[#dce4f0] bg-[#edf2f9] px-3 text-[12px] font-semibold text-[#273f60] outline-none focus:ring-2 focus:ring-[#1E3A5F]/20"
            >
              <option value="">보고서를 선택하세요</option>
              {reports.map((report) => (
                <option key={report.id} value={report.id}>
                  {formatReportLabel(report)}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2 md:grid-cols-[1fr_auto] md:items-center">
            <p className="text-[10.5px] font-semibold text-[#667b95]">
              단일 실행으로 공공(Logic A)·민간(Logic B) 시장을 동시에 분석합니다.
            </p>
            <button
              type="button"
              onClick={() => {
                void runPhase2();
              }}
              disabled={loading}
              className="h-[38px] rounded-[10px] bg-[#1E4E8C] px-5 text-[12px] font-extrabold text-white hover:bg-[#1a4378] disabled:opacity-60"
            >
              ▶ AI 가격 분석 실행
            </button>
          </div>
          {analysisStarted ? (
            <div className="pt-1">
              <div className="grid grid-cols-4 gap-2">
                {PROGRESS_LABELS.map((label, index) => {
                  const current = index + 1;
                  const done = progressStep > current;
                  const active = progressStep === current && loading;
                  return (
                    <div key={label} className="text-center">
                      <div
                        className={`mx-auto mb-1 flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
                          done
                            ? "bg-[#dff2ea] text-[#2a9a71]"
                            : active
                              ? "bg-[#dbe6f8] text-[#1f3e64]"
                              : "bg-[#eef2f8] text-[#8ea0b7]"
                        }`}
                      >
                        {done ? "✓" : current}
                      </div>
                      <p className="text-[10px] text-[#6c809a]">{label}</p>
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 h-[2px] w-full rounded-full bg-[#dfe7f2]">
                <div
                  className="h-full rounded-full bg-[#69b89d] transition-all duration-300"
                  style={{
                    width: `${(Math.min(Math.max(progressStep, 0), 4) / 4) * 100}%`,
                  }}
                />
              </div>
            </div>
          ) : null}
          {analysisCompleted && result !== null ? (
            <>
              {competitorPrices !== null ? (
                <div className="rounded-[12px] border border-[#dce4ef] bg-white p-3 shadow-sh3">
                  <h3 className="mb-2 text-[13px] font-extrabold text-[#1f3e64]">경쟁사 가격 참조</h3>
                  <div className="mb-3">
                    <div className="mb-1 text-[12px] font-semibold text-[#3e5574]">
                      공공조달 (PanamaCompra V3)
                    </div>
                    <table className="w-full border-collapse border border-[#dce4ef] text-[11px]">
                      <thead className="bg-[#f4f7fc]">
                        <tr>
                          <th className="border border-[#dce4ef] p-2 text-left font-bold text-[#1f3e64]">
                            평균
                          </th>
                          <th className="border border-[#dce4ef] p-2 text-left font-bold text-[#1f3e64]">
                            최고
                          </th>
                          <th className="border border-[#dce4ef] p-2 text-left font-bold text-[#1f3e64]">
                            최저
                          </th>
                          <th className="border border-[#dce4ef] p-2 text-left font-bold text-[#1f3e64]">
                            건수
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-[#dce4ef] p-2">
                            {formatPriceCell(competitorPrices.publicProcurement.avg)}
                          </td>
                          <td className="border border-[#dce4ef] p-2">
                            {formatPriceCell(competitorPrices.publicProcurement.max)}
                          </td>
                          <td className="border border-[#dce4ef] p-2">
                            {formatPriceCell(competitorPrices.publicProcurement.min)}
                          </td>
                          <td className="border border-[#dce4ef] p-2">
                            {competitorPrices.publicProcurement.count}건
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <p className="mt-1 text-[10px] text-[#8b97aa]">
                      {competitorPrices.publicProcurement.source}
                    </p>
                  </div>
                  <div>
                    <div className="mb-1 text-[12px] font-semibold text-[#3e5574]">
                      민간 소매 (ACODECO CABAMED)
                    </div>
                    <table className="w-full border-collapse border border-[#dce4ef] text-[11px]">
                      <thead className="bg-[#f4f7fc]">
                        <tr>
                          <th className="border border-[#dce4ef] p-2 text-left font-bold text-[#1f3e64]">
                            평균
                          </th>
                          <th className="border border-[#dce4ef] p-2 text-left font-bold text-[#1f3e64]">
                            최고
                          </th>
                          <th className="border border-[#dce4ef] p-2 text-left font-bold text-[#1f3e64]">
                            최저
                          </th>
                          <th className="border border-[#dce4ef] p-2 text-left font-bold text-[#1f3e64]">
                            건수
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-[#dce4ef] p-2">
                            {formatPriceCell(competitorPrices.privateRetail.avg)}
                          </td>
                          <td className="border border-[#dce4ef] p-2">
                            {formatPriceCell(competitorPrices.privateRetail.max)}
                          </td>
                          <td className="border border-[#dce4ef] p-2">
                            {formatPriceCell(competitorPrices.privateRetail.min)}
                          </td>
                          <td className="border border-[#dce4ef] p-2">
                            {competitorPrices.privateRetail.count}건
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <p className="mt-1 text-[10px] text-[#8b97aa]">
                      {competitorPrices.privateRetail.source}
                    </p>
                  </div>
                </div>
              ) : null}
              <Phase2ResultTabs result={result} />
            </>
          ) : null}
          <div className="flex justify-end">
            {analysisCompleted && pdfBlobUrl !== null && pdfFilename !== null ? (
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex h-[36px] items-center rounded-[10px] border border-[#d9e1ed] bg-[#f5f8fc] px-4 text-[12px] font-bold text-[#1f3e64]"
              >
                📄 수출전략보고서 다운로드
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
