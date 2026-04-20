"use client";

import type { ReactElement } from "react";

import type { Partner, ProductId, ProductMatch } from "@/src/lib/phase3/partners-data";

interface Phase3ProductMatchSectionProps {
  partner: Partner;
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
  const sortedMatches = [...partner.productMatches].sort((a, b) => {
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
              <div className="mb-1 text-xs font-bold text-yellow-700">📌 1단계 시장조사 선택 제품</div>
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
