"use client";

import { motion } from "framer-motion";

import { getCountryFlagEmoji } from "@/src/lib/phase3/country-flag";
import type { PartnerWithDynamicPsi } from "@/src/lib/phase3/psi-calculator";

interface Phase3PartnerCardShellProps {
  partner: PartnerWithDynamicPsi;
  rank: number;
  tier: "gold" | "standard";
  onOpen: (partner: PartnerWithDynamicPsi) => void;
}

/** Top 5 골드 / 6~10 일반 카드 공통 래퍼 — layoutId로 리스트와 morphing */
export function Phase3PartnerCardShell({ partner, rank, tier, onOpen }: Phase3PartnerCardShellProps) {
  const flag = getCountryFlagEmoji(partner.company_type, partner.company_name);
  const isGold = tier === "gold";

  return (
    <motion.button
      type="button"
      layoutId={`p3-${partner.id}`}
      onClick={() => {
        onOpen(partner);
      }}
      className={`w-full rounded-[14px] border p-3 text-left shadow-sh3 transition hover:brightness-[1.02] ${
        isGold
          ? "border-amber-300/80 bg-gradient-to-br from-amber-50 via-white to-amber-50/50 ring-1 ring-amber-200/60"
          : "border-[#dce4ef] bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-[10px] text-[#8b97aa]">
            #{String(rank)} · {flag}
          </span>
          <h5 className="text-[14px] font-extrabold text-[#1f3e64]">{partner.company_name}</h5>
          <p className="text-[10px] text-[#6f8299]">{[partner.company_type, partner.city].filter(Boolean).join(" · ")}</p>
        </div>
        <div className="text-right">
          <div className={`text-[22px] font-black ${isGold ? "text-amber-700" : "text-[#1E4E8C]"}`}>
            {String(partner.dynamic_psi)}
          </div>
          <div className="text-[9px] text-[#8b97aa]">동적 PSI</div>
        </div>
      </div>
    </motion.button>
  );
}
