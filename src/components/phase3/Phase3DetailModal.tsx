"use client";

import { useEffect, useState } from "react";

import type { ProductId } from "@/src/lib/phase3/partners-data";
import type { Phase3ModalTabId } from "@/src/lib/phase3/types";
import type { PSICheckedState } from "@/src/lib/phase3/types";
import type { PartnerWithDynamicPsi } from "@/src/lib/phase3/psi-calculator";

import { Phase3TabBasicInfo } from "./Phase3TabBasicInfo";
import { Phase3TabPsiAnalysis } from "./Phase3TabPsiAnalysis";
import { Phase3TabProductMatch } from "./Phase3TabProductMatch";
import { Phase3TabRecommendReason } from "./Phase3TabRecommendReason";

interface Phase3DetailModalProps {
  open: boolean;
  partner: PartnerWithDynamicPsi | null;
  checked: PSICheckedState;
  rankHint: number | null;
  /** 1공정 선택 제품 슬러그 — 제품매칭 탭 하이라이트 */
  selectedProductSlug: ProductId | null;
  onClose: () => void;
}

const TABS: { id: Phase3ModalTabId; label: string }[] = [
  { id: "basic", label: "기본정보" },
  { id: "psi", label: "PSI 분석" },
  { id: "products", label: "제품매칭" },
  { id: "reason", label: "추천사유" },
];

/** 카드·리스트 공통 상세 모달 — 4탭 */
export function Phase3DetailModal({
  open,
  partner,
  checked,
  rankHint,
  selectedProductSlug,
  onClose,
}: Phase3DetailModalProps) {
  const [tab, setTab] = useState<Phase3ModalTabId>("basic");

  useEffect(() => {
    if (partner !== null) {
      setTab("basic");
    }
  }, [partner]);

  if (!open || partner === null) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="모달 닫기"
        onClick={onClose}
      />
      <div className="relative z-[81] m-2 max-h-[90vh] w-full max-w-lg overflow-hidden rounded-[16px] border border-[#dce4ef] bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-2 border-b border-[#edf1f6] px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-[14px] font-extrabold text-[#1f3e64]">{partner.company_name}</p>
            <p className="text-[10px] text-[#8b97aa]">동적 PSI {String(partner.dynamic_psi)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full px-2 py-1 text-[18px] leading-none text-[#516882] hover:bg-[#f1f5f9]"
          >
            ×
          </button>
        </div>
        <div className="flex flex-wrap gap-1 border-b border-[#edf1f6] px-2 py-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTab(t.id);
              }}
              className={`rounded-[8px] px-2.5 py-1.5 text-[11px] font-bold ${
                tab === t.id ? "bg-[#1E3A5F] text-white" : "bg-[#f4f7fc] text-[#516882]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="max-h-[min(60vh,480px)] overflow-y-auto px-4 py-3">
          {tab === "basic" ? <Phase3TabBasicInfo partner={partner} /> : null}
          {tab === "psi" ? <Phase3TabPsiAnalysis partner={partner} checked={checked} /> : null}
          {tab === "products" ? (
            <Phase3TabProductMatch partner={partner} selectedProductSlug={selectedProductSlug} />
          ) : null}
          {tab === "reason" ? <Phase3TabRecommendReason partner={partner} rankHint={rankHint} /> : null}
        </div>
      </div>
    </div>
  );
}
