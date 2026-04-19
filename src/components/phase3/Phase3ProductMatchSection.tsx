"use client";

import type { ReactElement } from "react";

import type { PartnerWithDynamicPsi } from "@/src/lib/phase3/psi-calculator";
import { PARTNERS, type ProductId, type ProductMatch } from "@/src/lib/phase3/partners-data";

interface Phase3ProductMatchSectionProps {
  partner: PartnerWithDynamicPsi;
  selectedProductSlug: ProductId | null;
}

function getConflictIcon(level: ProductMatch["conflictLevel"]): string {
  switch (level) {
    case "upgrade_opportunity":
      return "🟡";
    case "direct_competition":
      return "🔴";
    case "adjacent_category":
      return "🟢";
    case "none":
      return "✅";
    default:
      return "✅";
  }
}

/** 모달 하단 — 8제품 매칭(선택 제품 노란 강조·상단 정렬) */
export function Phase3ProductMatchSection({
  partner,
  selectedProductSlug,
}: Phase3ProductMatchSectionProps): ReactElement {
  const full = PARTNERS.find((row) => row.id === partner.partner_id);

  if (full === undefined) {
    return (
      <div className="space-y-2 text-sm text-slate-600">
        {partner.pipeline_matched_products !== null && partner.pipeline_matched_products.length > 0 ? (
          <p className="font-semibold text-slate-800">{partner.pipeline_matched_products.join(", ")}</p>
        ) : (
          <p className="text-xs">등록된 동일 제품 매칭 정보가 없습니다.</p>
        )}
        {partner.conflict_level !== "none" && partner.conflict_insight !== null && partner.conflict_insight !== "" ? (
          <p className="text-xs text-slate-700">{partner.conflict_insight}</p>
        ) : null}
      </div>
    );
  }

  const sortedMatches = [...full.productMatches].sort((a, b) => {
    if (selectedProductSlug === null) {
      return 0;
    }
    if (a.productId === selectedProductSlug) {
      return -1;
    }
    if (b.productId === selectedProductSlug) {
      return 1;
    }
    return 0;
  });

  return (
    <div className="space-y-2">
      {sortedMatches.map((match) => {
        const isSelected = selectedProductSlug !== null && match.productId === selectedProductSlug;
        return (
          <div
            key={match.productId}
            className={[
              "rounded-lg border p-3",
              isSelected ? "border-yellow-400 bg-yellow-50 ring-2 ring-yellow-200" : "border-slate-200 bg-white",
            ].join(" ")}
          >
            {isSelected ? (
              <div className="mb-1 text-xs font-bold text-yellow-700">📌 1공정 선택 제품</div>
            ) : null}
            <div className="flex items-start gap-2">
              <span aria-hidden>{getConflictIcon(match.conflictLevel)}</span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-slate-900">
                  {match.productName} · Tier {String(match.pipelineTier)}
                </div>
                <div className="mt-1 text-xs text-slate-600">{match.shortInsight}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
