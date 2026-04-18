"use client";

import { motion } from "framer-motion";

import { getCountryFlagEmoji } from "@/src/lib/phase3/country-flag";
import type { PartnerWithDynamicPsi } from "@/src/lib/phase3/psi-calculator";
import { getPartnerWebsiteHref } from "@/src/lib/phase3/website-url";

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
  const websiteHref = getPartnerWebsiteHref(partner.website);

  return (
    <motion.div
      layoutId={`p3-${partner.id}`}
      className={`w-full overflow-hidden rounded-[14px] border text-left shadow-sh3 transition hover:brightness-[1.02] ${
        isGold
          ? "border-amber-300/80 bg-gradient-to-br from-amber-50 via-white to-amber-50/50 ring-1 ring-amber-200/60"
          : "border-[#dce4ef] bg-white"
      }`}
    >
      <button
        type="button"
        onClick={() => {
          onOpen(partner);
        }}
        className="w-full p-3 text-left"
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
      </button>
      {websiteHref !== null ? (
        <div className="border-t border-[#e8edf4] px-3 pb-3 pt-2">
          <a
            href={websiteHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              e.stopPropagation();
            }}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1E4E8C] transition-colors hover:text-[#163a6b] hover:underline"
          >
            🌐 공식 웹사이트 ↗
          </a>
        </div>
      ) : null}
    </motion.div>
  );
}
