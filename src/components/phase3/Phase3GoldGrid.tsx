"use client";

import type { PartnerWithDynamicPsi } from "@/src/lib/phase3/psi-calculator";

import { Phase3PartnerCardShell } from "./Phase3PartnerCardShell";

interface Phase3GoldGridProps {
  partners: PartnerWithDynamicPsi[];
  onOpen: (partner: PartnerWithDynamicPsi) => void;
}

/** 1~5위 골드 카드 */
export function Phase3GoldGrid({ partners, onOpen }: Phase3GoldGridProps) {
  if (partners.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h4 className="text-[12px] font-extrabold text-amber-800">Top 5 · 골드 파트너</h4>
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {partners.map((p, i) => (
          <Phase3PartnerCardShell key={p.id} partner={p} rank={i + 1} tier="gold" onOpen={onOpen} />
        ))}
      </div>
    </div>
  );
}
