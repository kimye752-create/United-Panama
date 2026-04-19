"use client";

import type { PartnerWithDynamicPsi } from "@/src/lib/phase3/psi-calculator";

import { Phase3PartnerCardShell } from "./Phase3PartnerCardShell";

interface Phase3Top10GridProps {
  partners: PartnerWithDynamicPsi[];
  onOpen: (partner: PartnerWithDynamicPsi) => void;
}

/** Top 10 — 2행×5열(반응형: lg 이하 2열·모바일 1열) */
export function Phase3Top10Grid({ partners, onOpen }: Phase3Top10GridProps) {
  if (partners.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h4 className="text-[12px] font-extrabold text-[#1f3e64]">Top 10 · 파트너 카드</h4>
      <div className="grid max-[640px]:grid-cols-1 max-[1023px]:grid-cols-2 grid-cols-5 gap-3">
        {partners.map((p, i) => (
          <Phase3PartnerCardShell
            key={p.id}
            partner={p}
            tier={i < 5 ? "gold" : "standard"}
            onOpen={onOpen}
          />
        ))}
      </div>
    </div>
  );
}
