"use client";

import { useEffect, useState } from "react";

import { TARGET_PRODUCTS } from "@/src/utils/product-dictionary";
import type { PartnerCandidate } from "@/src/types/phase3_partner";
import { Phase3PartnerDiscovery } from "./Phase3PartnerDiscovery";

interface ReportOption {
  id: string;
  productId: string;
  caseGrade: string;
  generatedAt: string;
}

interface Phase3SectionProps {
  isActive: boolean;
}

export function Phase3Section({ isActive }: Phase3SectionProps) {
  const [expanded, setExpanded] = useState(true);
  const [reports, setReports] = useState<ReportOption[]>([]);
  const [reportId, setReportId] = useState("");
  const [loading, setLoading] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [top10, setTop10] = useState<PartnerCandidate[]>([]);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [analyzedProductId, setAnalyzedProductId] = useState(
    TARGET_PRODUCTS[0]?.product_id ?? "",
  );

  const PROGRESS_LABELS = [
    "1차 수집",
    "2차 심층",
    "프로필 생성",
    "점수화",
  ] as const;

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
        const parsed: ReportOption[] = [];
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

  const runPhase3 = async () => {
    if (!isActive) {
      window.alert("3공정은 1·2공정 완료 후 활성화됩니다.");
      return;
    }
    const selectedReport = reports.find((row) => row.id === reportId);
    if (selectedReport === undefined) {
      window.alert("분석 보고서를 먼저 선택해 주세요.");
      return;
    }
    setLoading(true);
    setProgressStep(1);
    const timer = window.setInterval(() => {
      setProgressStep((prev) => (prev < 4 ? prev + 1 : prev));
    }, 1000);
    try {
      const response = await fetch("/api/panama/phase3", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: selectedReport.productId,
          report_id: selectedReport.id,
        }),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${String(response.status)}`);
      }
      const payload = (await response.json()) as unknown;
      if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
        throw new Error("3공정 응답 형식이 올바르지 않습니다.");
      }
      const rows = Array.isArray((payload as { top10?: unknown[] }).top10)
        ? ((payload as { top10: unknown[] }).top10 as unknown[])
        : [];
      const nextTop10: PartnerCandidate[] = [];
      for (const row of rows) {
        if (row === null || typeof row !== "object" || Array.isArray(row)) {
          continue;
        }
        nextTop10.push(row as PartnerCandidate);
      }
      setTop10(nextTop10);
      setAnalyzedProductId(selectedReport.productId);
      setAnalysisComplete(true);
      setProgressStep(4);
    } catch (error: unknown) {
      window.alert(
        `3공정 분석 실패: ${
          error instanceof Error ? error.message : "알 수 없는 오류"
        }\n해결 방법: 보고서 선택 상태와 API 서버 연결을 확인한 뒤 다시 시도해 주세요.`,
      );
    } finally {
      window.clearInterval(timer);
      setLoading(false);
    }
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
            03
          </span>
          <div>
            <h3 className="text-[16px] font-extrabold text-[#1f3e64]">3공정 · 바이어 발굴</h3>
            <p className="text-[11px] text-[#7a8ba1]">
              Top 10 바이어 리스트 · 시장조사·수출가격전략 완료 후 활성화
            </p>
          </div>
        </div>
        <span className="text-[14px] text-[#516882]">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded ? (
        <div className="space-y-3 border-t border-[#edf1f6] px-4 pb-4 pt-3">
          <div>
            <p className="mb-1 text-[10.5px] font-semibold text-[#667b95]">
              분석 보고서 선택 (1·2공정 완료본)
            </p>
            <div className="grid gap-2 md:grid-cols-[1fr_auto]">
              <select
                value={reportId}
                onChange={(event) => setReportId(event.target.value)}
                className="h-[40px] rounded-[10px] border border-[#dce4f0] bg-[#edf2f9] px-3 text-[12px] font-semibold text-[#273f60] outline-none focus:ring-2 focus:ring-[#1E3A5F]/20"
              >
                <option value="">분석 보고서를 선택하세요</option>
                {reports.map((report) => (
                  <option key={report.id} value={report.id}>
                    {`보고서 · ${
                      TARGET_PRODUCTS.find((p) => p.product_id === report.productId)?.kr_brand_name ??
                      report.productId
                    } · Case ${report.caseGrade}`}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  void runPhase3();
                }}
                disabled={!isActive || loading}
                className="h-[40px] rounded-[10px] bg-[#1E4E8C] px-5 text-[12px] font-extrabold text-white hover:bg-[#1a4378] disabled:opacity-60"
              >
                ▶ 파트너 발굴 실행
              </button>
            </div>
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
          <Phase3PartnerDiscovery
            productId={analyzedProductId}
            top10Initial={top10}
            isAnalysisComplete={analysisComplete}
          />
        </div>
      ) : null}
    </section>
  );
}

