"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Card } from "../shared/Card";
import { PanamaReportClient } from "@/components/PanamaReportClient";
import { TARGET_PRODUCTS } from "@/src/utils/product-dictionary";

type ProductUiMeta = {
  categoryLabel: "항암제" | "개량신약" | "일반제";
  displayInn: string;
  displayFormulation: string;
};

const PRODUCT_UI_META_BY_ID: Record<string, ProductUiMeta> = {
  "bdfc9883-6040-438a-8e7a-df01f1230682": {
    categoryLabel: "항암제",
    displayInn: "hydroxyurea 500mg",
    displayFormulation: "Cap",
  },
  "fcae4399-aa80-4318-ad55-89d6401c10a9": {
    categoryLabel: "개량신약",
    displayInn: "cilostazol+rosuvastatin",
    displayFormulation: "Tab",
  },
  "24738c3b-3a5b-40a9-9e8e-889ec075b453": {
    categoryLabel: "개량신약",
    displayInn: "mosapride citrate 15mg",
    displayFormulation: "Tab",
  },
  "2504d79b-c2ce-4660-9ea7-5576c8bb755f": {
    categoryLabel: "개량신약",
    displayInn: "rosuvastatin+omega-3",
    displayFormulation: "Cap",
  },
  "859e60f9-8544-43b3-a6a0-f6c7529847eb": {
    categoryLabel: "개량신약",
    displayInn: "atorvastatin+omega-3",
    displayFormulation: "Cap",
  },
  "014fd4d2-dc66-4fc1-8d4f-59695183387f": {
    categoryLabel: "일반제",
    displayInn: "fluticasone+salmeterol",
    displayFormulation: "Inhaler",
  },
  "f88b87b8-c0ab-4f6e-ba34-e9330d1d4e18": {
    categoryLabel: "개량신약",
    displayInn: "omega-3 ethyl esters 2g",
    displayFormulation: "Pouch",
  },
  "895f49ae-6ce3-44a3-93bd-bb77e027ba59": {
    categoryLabel: "일반제",
    displayInn: "gadobutrol 604.72mg",
    displayFormulation: "PFS",
  },
};

function compressHsCode(hsCode: string): string {
  const segments = hsCode.split(".");
  if (segments.length >= 2) {
    return `${segments[0]}.${segments[1]}`;
  }
  return hsCode;
}

function buildProductOptionLabel(productId: string, brandName: string, hsCode: string): string {
  const uiMeta = PRODUCT_UI_META_BY_ID[productId];
  const categoryLabel = uiMeta?.categoryLabel ?? "일반제";
  const displayInn = uiMeta?.displayInn ?? brandName.toLowerCase();
  const displayFormulation = uiMeta?.displayFormulation ?? "Cap";
  const compactHsCode = compressHsCode(hsCode);
  return `[${categoryLabel}] ${brandName} · ${displayInn} · ${displayFormulation} · HS ${compactHsCode}`;
}

const PROCESS1_INPUT_CLASS =
  "h-[38px] rounded-[8px] border border-[#dbe4f3] bg-[#f3f7ff] px-3 text-[11.5px] font-medium text-[#263a57] placeholder:text-[#8e9bb1] outline-none focus:border-navy2 focus:ring-2 focus:ring-navy/15";

const ANALYSIS_STEP_LABELS = [
  "크롤링 실행",
  "클로드 분석",
  "논문 검색",
  "PDF 보고서 생성",
] as const;

export function Process1Workbench() {
  const sortedProducts = useMemo(() => {
    const priorityBrandOrder = [
      "Rosumeg Combigel",
      "Sereterol Activair",
      "Omethyl Cutielet",
    ];
    return [...TARGET_PRODUCTS].sort((a, b) => {
      const aIdx = priorityBrandOrder.indexOf(a.kr_brand_name);
      const bIdx = priorityBrandOrder.indexOf(b.kr_brand_name);
      if (aIdx >= 0 && bIdx >= 0) {
        return aIdx - bIdx;
      }
      if (aIdx >= 0) {
        return -1;
      }
      if (bIdx >= 0) {
        return 1;
      }
      if (a.panama_target !== b.panama_target) {
        return a.panama_target ? -1 : 1;
      }
      return 0;
    });
  }, []);

  const defaultProduct =
    sortedProducts.find((p) => p.kr_brand_name === "Rosumeg Combigel") ??
    sortedProducts[0];
  const [productId, setProductId] = useState(defaultProduct?.product_id ?? "");
  const [activeProductId, setActiveProductId] = useState<string | null>(null);
  const [analysisNonce, setAnalysisNonce] = useState(0);
  const [customTradeName, setCustomTradeName] = useState("");
  const [customInn, setCustomInn] = useState("");
  const [customDosage, setCustomDosage] = useState("");
  const [analysisStep, setAnalysisStep] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const reportAnchorRef = useRef<HTMLElement | null>(null);
  const activeProduct =
    activeProductId === null
      ? null
      : TARGET_PRODUCTS.find((p) => p.product_id === activeProductId) ?? null;

  useEffect(() => {
    if (!isAnalyzing) {
      return;
    }
    if (analysisStep >= 3) {
      return;
    }
    const timer = setTimeout(() => {
      setAnalysisStep((prev) => (prev < 3 ? prev + 1 : prev));
    }, 1200);
    return () => {
      clearTimeout(timer);
    };
  }, [analysisStep, isAnalyzing]);

  const handleReportLoadingChange = useCallback((loading: boolean) => {
    if (loading) {
      setIsAnalyzing(true);
      setAnalysisStep((prev) => (prev === 0 ? 1 : prev));
      return;
    }
    setIsAnalyzing(false);
    setAnalysisStep(4);
  }, []);

  return (
    <div className="space-y-3.5">
      <Card
        title="품목 선택 후 파나마 진출 적합 분석 실행"
        titleClassName="text-[16px] font-extrabold tracking-[-0.028em] text-[#173f78]"
      >
        <p className="mb-2 text-[10px] font-semibold tracking-[0.01em] text-muted">
          등록 제품 분석 실행
        </p>
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className={`flex-1 font-semibold ${PROCESS1_INPUT_CLASS}`}
          >
            {sortedProducts.map((p) => (
              <option key={p.product_id} value={p.product_id}>
                {buildProductOptionLabel(p.product_id, p.kr_brand_name, p.hs_code)}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="inline-flex h-[38px] items-center justify-center rounded-[8px] bg-navy px-5 text-[11.5px] font-bold text-white transition-colors hover:bg-navy2"
            onClick={() => {
              const product = TARGET_PRODUCTS.find((p) => p.product_id === productId);
              if (product === undefined) {
                return;
              }
              setAnalysisStep(1);
              setIsAnalyzing(true);
              setActiveProductId(product.product_id);
              setAnalysisNonce((prev) => prev + 1);
              setTimeout(() => {
                reportAnchorRef.current?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              }, 120);
            }}
          >
            ▶ 진출 적합 분석
          </button>
        </div>
        <div className="mt-4 grid grid-cols-4 gap-2">
          {ANALYSIS_STEP_LABELS.map((label, idx) => {
            const stepNo = idx + 1;
            const isDone = stepNo < analysisStep;
            const isActive = stepNo === analysisStep && isAnalyzing;
            const textClass = isDone
              ? "text-[#2d9870]"
              : isActive
                ? "text-[#173f78]"
                : "text-muted";
            return (
              <div key={label} className="flex flex-col items-center gap-1">
                <div className="relative flex h-6 w-6 items-center justify-center">
                  {isActive ? (
                    <span className="absolute inline-flex h-8 w-8 rounded-full bg-[#9fb5d8]/40 animate-ping" />
                  ) : null}
                  <span
                    className={`relative flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold shadow-sh3 ${
                      isDone
                        ? "bg-[#d9efe7] text-[#2d9870]"
                        : isActive
                          ? "bg-[#d8e3f7] text-[#173f78]"
                          : "bg-inner text-muted"
                    }`}
                  >
                    {isDone ? "✓" : stepNo}
                  </span>
                </div>
                <div className={`text-[10px] font-semibold ${textClass}`}>{label}</div>
              </div>
            );
          })}
        </div>
        <div className="mt-2 h-[2px] w-full overflow-hidden rounded-full bg-[#dfe5ef]">
          <div
            className="h-full bg-[#7dc1ac] transition-all duration-500"
            style={{ width: `${String((analysisStep / 4) * 100)}%` }}
          />
        </div>
      </Card>

      <Card
        title="신약 분석"
        subtitle="다음 단계에서 연결 예정"
        titleClassName="text-[16px] font-extrabold tracking-[-0.02em] text-[#173f78]"
      >
        <p className="mb-2 text-[10px] font-semibold tracking-[0.01em] text-muted">
          미등록 신약 분석 입력
        </p>
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
          <input
            type="text"
            value={customTradeName}
            onChange={(e) => setCustomTradeName(e.target.value)}
            placeholder="약품명 (예: Nexavar)"
            className={PROCESS1_INPUT_CLASS}
          />
          <input
            type="text"
            value={customInn}
            onChange={(e) => setCustomInn(e.target.value)}
            placeholder="성분명 (예: sorafenib)"
            className={PROCESS1_INPUT_CLASS}
          />
          <input
            type="text"
            value={customDosage}
            onChange={(e) => setCustomDosage(e.target.value)}
            placeholder="제형 (예: 200mg tablet)"
            className={PROCESS1_INPUT_CLASS}
          />
          <button
            type="button"
            className="h-[38px] rounded-[8px] bg-navy px-5 text-[11.5px] font-bold text-white transition-colors hover:bg-navy2"
            title="신약 분석은 현재 백엔드 연동 준비 중입니다."
            onClick={() => {
              const hasInput =
                customTradeName.trim() !== "" ||
                customInn.trim() !== "" ||
                customDosage.trim() !== "";
              if (!hasInput) {
                window.alert("약품명, 성분명, 제형 중 최소 1개를 입력해 주세요.");
                return;
              }
              window.alert(
                "신약 분석 버튼 클릭은 정상 동작합니다. 현재는 백엔드 연동 준비 단계라 분석 실행은 다음 단계에서 연결됩니다.",
              );
            }}
          >
            ▶ 신약 분석
          </button>
        </div>
      </Card>

      {activeProduct !== null ? (
        <section ref={reportAnchorRef} className="rounded-[20px] bg-white p-3 shadow-sh">
          <PanamaReportClient
            key={`${activeProduct.product_id}-${String(analysisNonce)}`}
            product={activeProduct}
            currentInn={activeProduct.who_inn_en}
            showBackLink={false}
            showInnTabs={false}
            onLoadingChange={handleReportLoadingChange}
          />
        </section>
      ) : null}
    </div>
  );
}
