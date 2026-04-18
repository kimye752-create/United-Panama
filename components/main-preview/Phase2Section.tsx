"use client";

import { useEffect, useMemo, useState } from "react";

import { TARGET_PRODUCTS } from "@/src/utils/product-dictionary";
import {
  Phase2ResultTabs,
  type Phase2ResultPayload,
} from "./Phase2ResultTabs";
import { buildPhase2ReportText } from "@/lib/phase2_pdf_template";

interface Phase2SectionProps {
  onCompleted: () => void;
}

interface Phase2ReportOption {
  id: string;
  productId: string;
  caseGrade: string;
  generatedAt: string;
}

interface CalculateResponse {
  finalPricePab: number;
  public_market: Phase2ResultPayload["public_market"];
  private_market: Phase2ResultPayload["private_market"];
  generatedAt: string;
}

function resolveBrand(productId: string): string {
  const hit = TARGET_PRODUCTS.find((product) => product.product_id === productId);
  return hit?.kr_brand_name ?? productId;
}

export function Phase2Section({ onCompleted }: Phase2SectionProps) {
  const [expanded, setExpanded] = useState(true);
  const [reports, setReports] = useState<Phase2ReportOption[]>([]);
  const [reportId, setReportId] = useState("");
  const [loading, setLoading] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [result, setResult] = useState<Phase2ResultPayload | null>(null);

  useEffect(() => {
    const loadReports = async () => {
      try {
        const response = await fetch("/api/panama/phase2/report");
        if (!response.ok) {
          return;
        }
        const payload = (await response.json()) as unknown;
        if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
          return;
        }
        const rows = Array.isArray((payload as { reports?: unknown[] }).reports)
          ? ((payload as { reports: unknown[] }).reports as unknown[])
          : [];
        const parsed: Phase2ReportOption[] = [];
        for (const row of rows) {
          if (row === null || typeof row !== "object" || Array.isArray(row)) {
            continue;
          }
          const item = row as Record<string, unknown>;
          if (
            typeof item.id === "string" &&
            typeof item.product_id === "string" &&
            typeof item.case_grade === "string" &&
            typeof item.generated_at === "string"
          ) {
            parsed.push({
              id: item.id,
              productId: item.product_id,
              caseGrade: item.case_grade,
              generatedAt: item.generated_at,
            });
          }
        }
        setReports(parsed);
      } catch {
        setReports([]);
      }
    };
    void loadReports();
  }, []);

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
    setProgressStep(1);
    const progressTimer = window.setInterval(() => {
      setProgressStep((prev) => (prev < 4 ? prev + 1 : prev));
    }, 900);
    try {
      const response = await fetch("/api/panama/phase2/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          finalPricePab: 19.8,
        }),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${String(response.status)}`);
      }
      const payload = (await response.json()) as CalculateResponse;
      setResult({
        finalPricePab: payload.finalPricePab,
        public_market: payload.public_market,
        private_market: payload.private_market,
        generatedAt: payload.generatedAt,
      });
      setProgressStep(4);
      onCompleted();
    } catch (error: unknown) {
      window.alert(
        `2공정 분석 실패: ${
          error instanceof Error ? error.message : "알 수 없는 오류"
        }\n해결 방법: 보고서 선택 상태와 서버 연결을 확인한 뒤 다시 시도해 주세요.`,
      );
    } finally {
      window.clearInterval(progressTimer);
      setLoading(false);
    }
  };

  const downloadReport = () => {
    if (selectedReport === null || result === null) {
      return;
    }
    const text = buildPhase2ReportText({
      productName: resolveBrand(selectedReport.productId),
      caseGrade: selectedReport.caseGrade,
      generatedAt: result.generatedAt ?? new Date().toISOString(),
      result,
    });
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `phase2_report_${selectedReport.productId}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
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
            <select
              value={reportId}
              onChange={(event) => setReportId(event.target.value)}
              className="h-[40px] w-full rounded-[10px] border border-[#dce4f0] bg-[#edf2f9] px-3 text-[12px] font-semibold text-[#273f60] outline-none focus:ring-2 focus:ring-[#1E3A5F]/20"
            >
              <option value="">보고서를 선택하세요</option>
              {reports.map((report) => (
                <option key={report.id} value={report.id}>
                  {`1공정 보고서 · ${resolveBrand(report.productId)} · Case ${report.caseGrade}`}
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
          </div>
          {result !== null ? (
            <Phase2ResultTabs result={result} />
          ) : null}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={downloadReport}
              disabled={result === null}
              className="inline-flex h-[36px] items-center rounded-[10px] border border-[#d9e1ed] bg-[#f5f8fc] px-4 text-[12px] font-bold text-[#1f3e64] disabled:cursor-not-allowed disabled:text-[#9aa9bc]"
            >
              📄 수출가격전략 보고서 다운로드
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

