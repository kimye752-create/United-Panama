"use client";

import { useMemo, useState } from "react";

import { PartnerSection } from "@/components/main-preview/PartnerSection";
import { PricingSection, type ReportFlowProduct } from "@/components/main-preview/PricingSection";
import { TARGET_PRODUCTS } from "@/src/utils/product-dictionary";

/**
 * 시장 분석 탭 — 수출가격 전략(01) + 바이어 발굴(02) 2열 레이아웃
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
      })),
    [],
  );

  return (
    <div className="space-y-3.5">
      {/* 안내 배너 */}
      <div className="rounded-lg border border-[#e8eef5] bg-[#f8fafc] px-4 py-2.5 text-xs text-[#4a5a6f]">
        <strong className="text-[#273f60]">시장조사 분석</strong>
        {" — "}품목 선택 후 <strong className="text-[#273f60]">▶ 시장 조사</strong>를 실행하세요.
        이후 저장된 보고서를 선택하여 <strong className="text-[#273f60]">AI 가격 산출</strong> →{" "}
        <strong className="text-[#273f60]">바이어 발굴</strong> 순으로 진행하면
        우하단 <strong className="text-[#273f60]">보고서 탭</strong>에서 최종 PDF를 다운로드할 수 있습니다.
        {sessionId !== null && (
          <span className="ml-2 font-mono text-[11px] text-navy">
            session={sessionId.slice(0, 8)}…
          </span>
        )}
      </div>

      {/* 2열 메인 패널 */}
      <div className="grid gap-3.5 lg:grid-cols-2">
        {/* 01 수출가격 전략 */}
        <PricingSection
          products={products}
          onSessionReady={(sid) => {
            setSessionId(sid);
          }}
        />

        {/* 02 바이어 발굴 */}
        <PartnerSection sessionId={sessionId} />
      </div>
    </div>
  );
}
