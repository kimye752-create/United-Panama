"use client";

import { useEffect, useMemo, useState } from "react";

import type { ScenarioRow } from "@/src/logic/phase2/price_scenario_generator";
import { TARGET_PRODUCTS } from "@/src/utils/product-dictionary";

interface Phase2SectionProps {
  onCompleted: () => void;
}

type MarketSegment = "public" | "private";

interface Phase2ReportOption {
  id: string;
  productId: string;
  caseGrade: string;
  generatedAt: string;
}

interface CalculateResponse {
  baseline: ScenarioRow;
  scenarios: ScenarioRow[];
}

function resolveBrand(productId: string): string {
  const hit = TARGET_PRODUCTS.find((product) => product.product_id === productId);
  return hit?.kr_brand_name ?? productId;
}

export function Phase2Section({ onCompleted }: Phase2SectionProps) {
  const [expanded, setExpanded] = useState(true);
  const [reports, setReports] = useState<Phase2ReportOption[]>([]);
  const [reportId, setReportId] = useState("");
  const [segment, setSegment] = useState<MarketSegment>("public");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CalculateResponse | null>(null);

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

  const runPhase2 = async () => {
    if (selectedReport === null) {
      window.alert("먼저 1공정 보고서를 선택해 주세요.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/panama/phase2/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          finalPricePab: 19.8,
          segment,
        }),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${String(response.status)}`);
      }
      const payload = (await response.json()) as CalculateResponse;
      setResult(payload);
      onCompleted();
    } catch (error: unknown) {
      window.alert(
        `2공정 분석 실패: ${
          error instanceof Error ? error.message : "알 수 없는 오류"
        }\n해결 방법: 보고서 선택 상태와 서버 연결을 확인한 뒤 다시 시도해 주세요.`,
      );
    } finally {
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
          <div className="grid gap-2 md:grid-cols-[auto_auto_1fr_auto] md:items-center">
            <p className="text-[10.5px] font-semibold text-[#667b95] md:col-span-4">시장 선택 및 분석 실행</p>
            <button
              type="button"
              onClick={() => setSegment("public")}
              className={`h-[34px] rounded-[10px] px-4 text-[12px] font-bold ${
                segment === "public"
                  ? "bg-[#1E4E8C] text-white"
                  : "border border-[#cfd9e8] bg-white text-[#1f3e64]"
              }`}
            >
              공공 시장
            </button>
            <button
              type="button"
              onClick={() => setSegment("private")}
              className={`h-[34px] rounded-[10px] px-4 text-[12px] font-bold ${
                segment === "private"
                  ? "bg-[#1E4E8C] text-white"
                  : "border border-[#cfd9e8] bg-white text-[#1f3e64]"
              }`}
            >
              민간 시장
            </button>
            <p className="text-[11px] text-[#6f8299]">
              {segment === "public"
                ? "공공 시장: PanamaCompra V3 · MINSA/CSS 조달 기준"
                : "민간 시장: SuperXtra · ACODECO 약국 소비자가 기준"}
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
          {result !== null ? (
            <div className="rounded-[12px] bg-[#f4f7fc] p-3">
              <p className="text-[11px] font-bold text-[#1f3e64]">
                축약 결과 · 기준 FOB ${result.baseline.fob.fobUsd.toFixed(2)}
              </p>
              <div className="mt-2 grid gap-2 md:grid-cols-3">
                {result.scenarios.map((scenario) => (
                  <div key={scenario.scenario} className="rounded-[10px] bg-white px-3 py-2 shadow-sh3">
                    <p className="text-[11px] font-bold text-[#28466d]">{scenario.title}</p>
                    <p className="text-[10.5px] text-[#6f8299]">
                      FOB ${scenario.fob.fobUsd.toFixed(2)} · 포지셔닝 ${scenario.fob.positioningPricePab.toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

