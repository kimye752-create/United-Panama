"use client";

import { useMemo, useState } from "react";

import { PartnerSection } from "@/components/main-preview/PartnerSection";
import { PricingSection, type ReportFlowProduct } from "@/components/main-preview/PricingSection";
import { TARGET_PRODUCTS } from "@/src/utils/product-dictionary";

/**
 * 품목 드롭다운 표기 — 지시된 정확한 문구 사용
 * key: product_id
 */
const PRODUCT_DISPLAY_LABELS: Record<string, string> = {
  "bdfc9883-6040-438a-8e7a-df01f1230682":
    "[항암제] Hydrine (Hydroxyurea, 캡슐, 500mg)",
  "fcae4399-aa80-4318-ad55-89d6401c10a9":
    "[혈전+지질 개선 · 개량신약] Ciloduo (Cilostazol + Rosuvastatin, 정제, 100mg + 10mg)",
  "24738c3b-3a5b-40a9-9e8e-889ec075b453":
    "[소화제 · 개량신약] Gastiin CR (Mosapride Citrate, CR 정제, 15mg)",
  "2504d79b-c2ce-4660-9ea7-5576c8bb755f":
    "[고지혈증 · 개량신약] Rosumeg Combigel (Rosuvastatin + Omega-3, 연질캡슐, 5mg + 1g)",
  "859e60f9-8544-43b3-a6a0-f6c7529847eb":
    "[고지혈증 · 개량신약] Atmeg Combigel (Atorvastatin + Omega-3, 연질캡슐, 10mg + 1g)",
  "014fd4d2-dc66-4fc1-8d4f-59695183387f":
    "[천식 흡입기 · 개량신약] Sereterol Activair (Salmeterol + Fluticasone, 흡입기, 50μg + 250μg)",
  "f88b87b8-c0ab-4f6e-ba34-e9330d1d4e18":
    "[고지혈증 · 개량신약] Omethyl Cutielet (Omega-3, Pouch, 2g)",
  "895f49ae-6ce3-44a3-93bd-bb77e027ba59":
    "[MRI 조영제] Gadvoa Inj. (Gadobutrol, 프리필드시린지, 7.5ml)",
};

/**
 * 시장 분석 탭 — 01·02 2열 + 우측 생성 보고서 목록(SG 레퍼런스와 동일 구조)
 * Phase1(시장 조사)은 세션 초기화 시 자동 실행됨. 별도 UI 없음.
 */
export function AnalysisWorkspace() {
  const [sessionId, setSessionId] = useState<string | null>(null);

  const products: ReportFlowProduct[] = useMemo(
    () =>
      TARGET_PRODUCTS.map((p) => ({
        id: p.product_id,
        name: p.kr_brand_name,
        ingredient: p.who_inn_en,
        category: p.therapeutic_area,
        displayLabel: PRODUCT_DISPLAY_LABELS[p.product_id] ?? `${p.kr_brand_name} · ${p.who_inn_en}`,
      })),
    [],
  );

  return (
    <div className="mx-auto w-full max-w-[1280px]">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <PricingSection
          products={products}
          onSessionReady={(sid) => {
            setSessionId(sid);
          }}
        />
        <PartnerSection sessionId={sessionId} />
      </div>
    </div>
  );
}
