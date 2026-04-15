"use client";

import { useMemo, useRef, useState } from "react";

import { Card } from "../shared/Card";
import { PanamaReportClient } from "@/components/PanamaReportClient";
import { TARGET_PRODUCTS } from "@/src/utils/product-dictionary";

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
  const reportAnchorRef = useRef<HTMLElement | null>(null);
  const activeProduct =
    activeProductId === null
      ? null
      : TARGET_PRODUCTS.find((p) => p.product_id === activeProductId) ?? null;

  return (
    <div className="space-y-3.5">
      <Card title="품목 선택 후 파나마 진출 적합 분석 실행">
        <p className="mb-2 text-[12px] font-bold text-muted">
          등록 제품 분석 실행
        </p>
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="h-11 flex-1 rounded-[10px] bg-white px-3.5 text-[13px] font-semibold text-text shadow-sh2 outline-none focus:ring-2 focus:ring-navy/20"
          >
            {sortedProducts.map((p) => (
              <option key={p.product_id} value={p.product_id}>
                {p.kr_brand_name} — {p.who_inn_en}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="inline-flex h-11 items-center justify-center rounded-[10px] bg-navy px-6 text-[14px] font-bold text-white transition-colors hover:bg-navy2"
            onClick={() => {
              const product = TARGET_PRODUCTS.find((p) => p.product_id === productId);
              if (product === undefined) {
                return;
              }
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
          {["DB 조회", "Claude 분석", "논문 검색", "PDF 생성"].map((label, idx) => (
            <div key={label} className="flex flex-col items-center gap-1">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-inner text-[11px] font-bold text-muted shadow-sh2">
                {idx + 1}
              </div>
              <div className="text-[11px] text-muted">{label}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="신약 분석" subtitle="다음 단계에서 연결 예정">
        <p className="mb-2 text-[12px] font-bold text-muted">미등록 신약 분석 입력</p>
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
          <input
            type="text"
            value={customTradeName}
            onChange={(e) => setCustomTradeName(e.target.value)}
            placeholder="약품명 (예: Nexavar)"
            className="h-11 rounded-[10px] bg-white px-3.5 text-[13px] font-medium text-text placeholder:text-muted shadow-sh2 outline-none focus:ring-2 focus:ring-navy/20"
          />
          <input
            type="text"
            value={customInn}
            onChange={(e) => setCustomInn(e.target.value)}
            placeholder="성분명 (예: sorafenib)"
            className="h-11 rounded-[10px] bg-white px-3.5 text-[13px] font-medium text-text placeholder:text-muted shadow-sh2 outline-none focus:ring-2 focus:ring-navy/20"
          />
          <input
            type="text"
            value={customDosage}
            onChange={(e) => setCustomDosage(e.target.value)}
            placeholder="제형 (예: 200mg tablet)"
            className="h-11 rounded-[10px] bg-white px-3.5 text-[13px] font-medium text-text placeholder:text-muted shadow-sh2 outline-none focus:ring-2 focus:ring-navy/20"
          />
          <button
            type="button"
            className="h-11 rounded-[10px] bg-navy px-6 text-[14px] font-bold text-white transition-colors hover:bg-navy2"
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
          />
        </section>
      ) : null}
    </div>
  );
}
