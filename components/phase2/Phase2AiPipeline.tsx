"use client";

import { useEffect, useState } from "react";

import { Card } from "@/components/dashboard/shared/Card";
import { Phase2FinalPriceBlock } from "./Phase2FinalPriceBlock";
import { Phase2FormulaBlock } from "./Phase2FormulaBlock";
import { Phase2MarketSegment } from "./Phase2MarketSegment";
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
    <div className="space-y-4">
      <Card
        title="보고서 선택"
        titleClassName="text-[26px] font-black tracking-[-0.03em] text-[#173f78]"
        className="border border-[#e6ebf2] bg-[#f8fafd] shadow-sh2"
      >
        <div className="space-y-4">
          <Phase2ReportSelector
            options={reports}
            value={selectedReportId}
            onChange={setSelectedReportId}
          />
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-[#e3e8f1]" />
            <p className="text-[12px] font-bold text-[#7b8699]">또는 PDF 직접 업로드</p>
            <div className="h-px flex-1 bg-[#e3e8f1]" />
          </div>
          <Phase2UploadArea onMockUpload={() => setSelectedReportId("pdf-manual")} />
        </div>
      </Card>

      <Card
        title="시장 선택 및 분석 실행"
        titleClassName="text-[26px] font-black tracking-[-0.03em] text-[#173f78]"
        className="border border-[#e6ebf2] bg-[#f8fafd] shadow-sh2"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Phase2MarketSegment value={segment} onChange={setSegment} />
            <p className="mt-3 text-[12px] text-[#667a96]">
              공공 시장: PBS 공급금여 채널 · 주별 병원조달단(HealthShare NSW 등) 기준
            </p>
          </div>
          <button
            type="button"
            onClick={() => void onRun()}
            disabled={loading}
            className="inline-flex h-[42px] items-center rounded-[12px] bg-navy px-7 text-[13px] font-extrabold text-white shadow-sh2 transition-colors hover:bg-navy2 disabled:cursor-not-allowed disabled:bg-navy/40"
          >
            ▶ AI 가격 분석 실행
          </button>
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
