"use client";

import { useEffect, useMemo, useState } from "react";

import { Card } from "@/components/dashboard/shared/Card";
import { Phase2FinalPriceBlock } from "./Phase2FinalPriceBlock";
import { Phase2FormulaBlock } from "./Phase2FormulaBlock";
import { Phase2MarketSegment } from "./Phase2MarketSegment";
import { Phase2ProgressSteps } from "./Phase2ProgressSteps";
import { Phase2ScenarioCards } from "./Phase2ScenarioCards";
import { Phase2UploadArea } from "./Phase2UploadArea";
import {
  Phase2ReportSelector,
  type Phase2ReportOption,
} from "./report_selector/Phase2ReportSelector";
import type { ScenarioRow } from "@/src/logic/phase2/price_scenario_generator";
import type { Phase2MarketSegment as MarketSegment } from "@/src/logic/phase2/margin_policy_resolver";

interface CalculateResponse {
  baseline: ScenarioRow;
  scenarios: ScenarioRow[];
}

export function Phase2AiPipeline() {
  const [reports, setReports] = useState<Phase2ReportOption[]>([]);
  const [selectedReportId, setSelectedReportId] = useState("");
  const [segment, setSegment] = useState<MarketSegment>("public");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CalculateResponse | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/panama/phase2/report");
        if (!res.ok) {
          return;
        }
        const data = (await res.json()) as { reports?: Array<Record<string, unknown>> };
        const parsed = (data.reports ?? []).flatMap((row) => {
          if (
            typeof row.id !== "string" ||
            typeof row.product_id !== "string" ||
            typeof row.case_grade !== "string" ||
            typeof row.generated_at !== "string"
          ) {
            return [];
          }
          return [
            {
              id: row.id,
              productId: row.product_id,
              caseGrade: row.case_grade,
              generatedAt: row.generated_at,
            },
          ];
        });
        setReports(parsed);
      } catch {
        setReports([]);
      }
    };
    void load();
  }, []);

  const currentStep = useMemo(() => {
    if (loading) {
      return 3;
    }
    if (result !== null) {
      return 4;
    }
    return 0;
  }, [loading, result]);

  const onRun = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/panama/phase2/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          finalPricePab: 19.8,
          segment,
        }),
      });
      if (!res.ok) {
        setResult(null);
        return;
      }
      const data = (await res.json()) as CalculateResponse;
      setResult(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3.5">
      <Card title="AI 파이프라인" subtitle="보고서 선택 또는 PDF 입력 후 자동 계산">
        <div className="space-y-3">
          <div className="space-y-2">
            <p className="text-[10px] font-bold tracking-[0.02em] text-muted">STEP 1 · 보고서 선택</p>
            <Phase2ReportSelector
              options={reports}
              value={selectedReportId}
              onChange={setSelectedReportId}
            />
            <p className="text-center text-[10px] text-muted">또는 PDF 직접 업로드</p>
            <Phase2UploadArea onMockUpload={() => setSelectedReportId("pdf-manual")} />
          </div>

          <div className="flex items-center justify-between gap-3 rounded-[12px] bg-inner p-3 shadow-sh2">
            <div>
              <p className="text-[10px] font-bold tracking-[0.02em] text-muted">
                STEP 2 · 시장 세그먼트 선택 및 실행
              </p>
              <p className="mt-1 text-[10px] text-muted">공공/민간 시장 기준으로 FOB를 역산합니다.</p>
            </div>
            <Phase2MarketSegment value={segment} onChange={setSegment} />
            <button
              type="button"
              onClick={() => void onRun()}
              className="rounded-[10px] bg-navy px-4 py-2 text-[12px] font-extrabold text-white shadow-sh2 transition-colors hover:bg-navy2"
            >
              ▶ AI 가격 분석 실행
            </button>
          </div>

          <Phase2ProgressSteps currentStep={currentStep} />
        </div>
      </Card>

      {result !== null ? (
        <>
          <Phase2FinalPriceBlock
            priceUsd={result.baseline.fob.fobUsd}
            caption="기준 시나리오 FOB 산출값"
          />
          <Phase2FormulaBlock
            formulaText={result.baseline.fob.formulaText}
            reasonText="관세 0%, ITBMS 0% 가정으로 공공/민간 유통 마진을 역산했습니다."
          />
          <Phase2ScenarioCards scenarios={result.scenarios} />
        </>
      ) : null}
    </div>
  );
}
