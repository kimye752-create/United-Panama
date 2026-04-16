"use client";

import { useState } from "react";

import { Card } from "@/components/dashboard/shared/Card";
import { Phase2FinalPriceBlock } from "./Phase2FinalPriceBlock";
import { Phase2FormulaBlock } from "./Phase2FormulaBlock";
import { Phase2MarketSegment } from "./Phase2MarketSegment";
import { Phase2ScenarioCards } from "./Phase2ScenarioCards";
import { TARGET_PRODUCTS } from "@/src/utils/product-dictionary";
import type { ScenarioRow } from "@/src/logic/phase2/price_scenario_generator";
import type { Phase2MarketSegment as MarketSegment } from "@/src/logic/phase2/margin_policy_resolver";
import type { Phase2ReportPayload } from "@/src/llm/phase2/phase2_schema";

interface CalculateResponse {
  baseline: ScenarioRow;
  scenarios: ScenarioRow[];
}

export function Phase2ManualInput() {
  const preferredProducts = TARGET_PRODUCTS.filter(
    (product) =>
      product.kr_brand_name === "Rosumeg Combigel" || product.kr_brand_name === "Omethyl Cutielet",
  );
  const [productId, setProductId] = useState(preferredProducts[0]?.product_id ?? "");
  const [segment, setSegment] = useState<MarketSegment>("private");
  const [finalPricePab, setFinalPricePab] = useState("24.5");
  const [result, setResult] = useState<CalculateResponse | null>(null);
  const [report, setReport] = useState<Phase2ReportPayload | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  const onRun = async () => {
    const price = Number.parseFloat(finalPricePab);
    if (!Number.isFinite(price) || price <= 0) {
      window.alert("최종 소비자가(PAB)를 숫자로 입력해 주세요.");
      return;
    }
    const res = await fetch("/api/panama/phase2/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        finalPricePab: price,
        segment,
      }),
    });
    if (!res.ok) {
      setResult(null);
      return;
    }
    const data = (await res.json()) as CalculateResponse;
    setResult(data);
    setReport(null);
  };

  const onGenerateReport = async () => {
    if (result === null) {
      return;
    }
    const selectedProduct = TARGET_PRODUCTS.find((product) => product.product_id === productId);
    if (selectedProduct === undefined) {
      window.alert("제품 선택 정보가 올바르지 않습니다.");
      return;
    }
    const price = Number.parseFloat(finalPricePab);
    if (!Number.isFinite(price)) {
      window.alert("최종 소비자가(PAB)를 먼저 입력해 주세요.");
      return;
    }
    setReportLoading(true);
    try {
      const response = await fetch("/api/panama/phase2/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProduct.product_id,
          productName: selectedProduct.kr_brand_name,
          inn: selectedProduct.who_inn_en,
          market: segment,
          referencePricePab: price,
          baselineFormula: result.baseline.fob.formulaText,
          scenarios: result.scenarios,
        }),
      });
      if (!response.ok) {
        window.alert("2공정 보고서 생성에 실패했습니다.");
        return;
      }
      const data = (await response.json()) as { report?: Phase2ReportPayload };
      setReport(data.report ?? null);
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <div className="space-y-3.5">
      <Card title="직접 입력 계산기" subtitle="소비자가를 입력하면 FOB를 역산합니다.">
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto_auto] md:items-end">
          <label className="space-y-1">
            <span className="text-[10px] font-bold tracking-[0.02em] text-muted">제품</span>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="h-[40px] w-full rounded-[12px] bg-white px-3 text-[12px] font-semibold text-[#253753] shadow-sh2 outline-none focus:ring-2 focus:ring-navy/20"
            >
              {preferredProducts.map((product) => (
                <option key={product.product_id} value={product.product_id}>
                  {product.kr_brand_name} ({product.who_inn_en})
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-[10px] font-bold tracking-[0.02em] text-muted">최종 소비자가 (PAB)</span>
            <input
              value={finalPricePab}
              onChange={(e) => setFinalPricePab(e.target.value)}
              className="h-[40px] w-full rounded-[12px] bg-white px-3 text-[12px] font-semibold text-[#253753] shadow-sh2 outline-none focus:ring-2 focus:ring-navy/20"
              placeholder="예: 24.50"
            />
          </label>
          <Phase2MarketSegment value={segment} onChange={setSegment} />
          <button
            type="button"
            onClick={() => void onRun()}
            className="h-[40px] rounded-[10px] bg-navy px-5 text-[12px] font-extrabold text-white shadow-sh2 transition-colors hover:bg-navy2"
          >
            FOB 계산
          </button>
        </div>
      </Card>

      {result !== null ? (
        <>
          <Phase2FinalPriceBlock
            priceUsd={result.baseline.fob.fobUsd}
            caption="직접 입력값 기준 역산 FOB"
          />
          <Phase2FormulaBlock
            formulaText={result.baseline.fob.formulaText}
            reasonText="현재는 기업 실거래 데이터 미수령 상태로 기본 추정 버퍼(공격/기준/보수)를 적용합니다."
          />
          <Card title="2공정 보고서 생성" subtitle="계산 결과를 5블록 보고서로 변환합니다.">
            <button
              type="button"
              onClick={() => void onGenerateReport()}
              disabled={reportLoading}
              className="rounded-[10px] bg-navy px-4 py-2 text-[12px] font-extrabold text-white shadow-sh2 transition-colors hover:bg-navy2 disabled:cursor-not-allowed disabled:bg-navy/40"
            >
              {reportLoading ? "보고서 생성 중..." : "2공정 보고서 생성"}
            </button>
          </Card>
          {report !== null ? (
            <Card title="2공정 보고서 결과" subtitle="LLM 5블록 출력">
              <div className="space-y-2">
                <section className="rounded-[12px] bg-inner p-3 shadow-sh2">
                  <p className="text-[10px] font-extrabold text-muted">BLOCK 1 · 입력 요약</p>
                  <p className="mt-1 text-[12px] text-[#253753]">{report.block1_input_summary}</p>
                </section>
                <section className="rounded-[12px] bg-inner p-3 shadow-sh2">
                  <p className="text-[10px] font-extrabold text-muted">BLOCK 2 · FOB 계산</p>
                  <p className="mt-1 text-[12px] text-[#253753]">{report.block2_fob_calculation}</p>
                </section>
                <section className="rounded-[12px] bg-inner p-3 shadow-sh2">
                  <p className="text-[10px] font-extrabold text-muted">BLOCK 3 · 시나리오</p>
                  <p className="mt-1 whitespace-pre-line text-[12px] text-[#253753]">{report.block3_scenarios}</p>
                </section>
                <section className="rounded-[12px] bg-inner p-3 shadow-sh2">
                  <p className="text-[10px] font-extrabold text-muted">BLOCK 4 · Incoterms</p>
                  <p className="mt-1 text-[12px] text-[#253753]">{report.block4_incoterms}</p>
                </section>
                <section className="rounded-[12px] bg-inner p-3 shadow-sh2">
                  <p className="text-[10px] font-extrabold text-muted">BLOCK 5 · 리스크/권고</p>
                  <p className="mt-1 text-[12px] text-[#253753]">
                    {report.block5_risk_and_recommendation}
                  </p>
                </section>
              </div>
            </Card>
          ) : null}
          <Phase2ScenarioCards scenarios={result.scenarios} />
        </>
      ) : null}
    </div>
  );
}
