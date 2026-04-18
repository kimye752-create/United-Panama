"use client";

import type { PartnerWithDynamicPsi } from "@/src/lib/phase3/psi-calculator";

import { Phase3PartnerListRow } from "./Phase3PartnerListRow";

interface Phase3RankListProps {
  partners: PartnerWithDynamicPsi[];
  startRank: number;
  onOpen: (partner: PartnerWithDynamicPsi) => void;
}

/** 11~20위 리스팅 */
export function Phase3RankList({ partners, startRank, onOpen }: Phase3RankListProps) {
  if (partners.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h4 className="text-[12px] font-extrabold text-[#516882]">11~20위 · 후보 리스트</h4>
      <div className="flex max-h-[320px] flex-col gap-1.5 overflow-y-auto pr-1">
        {partners.map((p, i) => (
          <Phase3PartnerListRow key={p.id} partner={p} rank={startRank + i} onOpen={onOpen} />
        ))}
      </div>
    </div>
  );
}
