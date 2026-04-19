"use client";

import type { PartnerWithDynamicPsi } from "@/src/lib/phase3/psi-calculator";

import { Phase3PartnerCard } from "./Phase3PartnerCard";

interface Phase3Top10GridProps {
  partners: PartnerWithDynamicPsi[];
  onCardClick: (partnerId: string) => void;
}

/** Top 10 — 5열·gap-2, 배열 인덱스 기준 currentRank(1~10) 전달 */
export function Phase3Top10Grid({ partners, onCardClick }: Phase3Top10GridProps) {
  if (partners.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h4 className="text-[12px] font-extrabold text-[#1f3e64]">Top 10 · 파트너 카드</h4>
      <div className="grid max-[640px]:grid-cols-1 max-[1023px]:grid-cols-2 grid-cols-5 gap-2">
        {partners.map((p, index) => (
          <Phase3PartnerCard
            key={p.partner_id}
            partner={p}
            currentRank={index + 1}
            onClick={() => onCardClick(p.partner_id)}
          />
        ))}
      </div>
    </div>
  );
}
