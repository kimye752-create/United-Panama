"use client";

import { motion } from "framer-motion";

import { getCountryFlagEmoji } from "@/src/lib/phase3/country-flag";
import type { PartnerWithDynamicPsi } from "@/src/lib/phase3/psi-calculator";
import { getPartnerWebsiteHref } from "@/src/lib/phase3/website-url";

interface Phase3PartnerListRowProps {
  partner: PartnerWithDynamicPsi;
  rank: number;
  onOpen: (partner: PartnerWithDynamicPsi) => void;
}

/** 11~20위 리스트 행 — 카드와 동일 layoutId로 전환 시 morphing */
export function Phase3PartnerListRow({ partner, rank, onOpen }: Phase3PartnerListRowProps) {
  const flag = getCountryFlagEmoji(partner.company_type, partner.company_name);
  const websiteHref = getPartnerWebsiteHref(partner.website);

  return (
    <motion.div
      layoutId={`p3-${partner.id}`}
      className="flex w-full items-center gap-2 rounded-[10px] border border-[#e8edf4] bg-[#fafbfd] px-2 py-2 hover:bg-[#f4f7fc]"
    >
      <button
        type="button"
        onClick={() => {
          onOpen(partner);
        }}
        className="flex min-w-0 flex-1 items-center justify-between gap-3 px-1 text-left"
      >
        <div className="min-w-0 flex-1">
          <span className="text-[10px] text-[#8b97aa]">
            #{String(rank)} · {flag}
          </span>
          <div className="truncate text-[12px] font-bold text-[#1f3e64]">{partner.company_name}</div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-[16px] font-black text-[#1E4E8C]">{String(partner.dynamic_psi)}</div>
          <div className="text-[9px] text-[#8b97aa]">PSI</div>
        </div>
      </button>
      {websiteHref !== null ? (
        <a
          href={websiteHref}
          target="_blank"
          rel="noopener noreferrer"
          title="공식 웹사이트"
          onClick={(e) => {
            e.stopPropagation();
          }}
          className="shrink-0 rounded p-1 text-[14px] text-[#8b97aa] transition-colors hover:text-[#1E4E8C]"
        >
          🌐
        </a>
      ) : null}
    </motion.div>
  );
}
