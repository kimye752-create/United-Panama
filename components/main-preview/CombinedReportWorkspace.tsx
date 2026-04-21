"use client";

import { useMemo, useState } from "react";

import { PartnerSection } from "@/components/main-preview/PartnerSection";
import { PricingSection, type ReportFlowProduct } from "@/components/main-preview/PricingSection";
import { ReportListPanel } from "@/components/reports/ReportListPanel";
import { TARGET_PRODUCTS } from "@/src/utils/product-dictionary";

/**
 * 결합 보고서 세션 UI — 품목 선택부터 바이어·목록까지 sessionId 공유
 */
export function CombinedReportWorkspace() {
  const [sessionId, setSessionId] = useState<string | null>(null);

  const products: ReportFlowProduct[] = useMemo(
    () =>
      TARGET_PRODUCTS.map((p) => ({
        id: p.product_id,
        name: p.kr_brand_name,
        ingredient: p.who_inn_en,
        category: p.therapeutic_area,
      })),
    [],
  );

  return (
    <div className="space-y-3.5">
      <div className="rounded-lg border border-[#e8eef5] bg-[#f8fafc] px-3 py-2 text-xs text-[#4a5a6f]">
        <strong className="text-[#273f60]">결합 보고서(베타)</strong> — 품목 선택 시 시장조사 세션이
        생성되고, 가격·파트너 단계를 순서대로 실행하면 최종 PDF를 내려받을 수 있습니다.
        {sessionId !== null && (
          <span className="ml-2 font-mono text-[11px] text-navy">session={sessionId.slice(0, 8)}…</span>
        )}
      </div>

      <div className="grid gap-3.5 lg:grid-cols-[1fr_280px]">
        <div className="space-y-3.5">
          <PricingSection
            products={products}
            onSessionReady={(sid) => {
              setSessionId(sid);
            }}
          />
          <PartnerSection sessionId={sessionId} />
        </div>
        <ReportListPanel sessionId={sessionId} />
      </div>
    </div>
  );
}
