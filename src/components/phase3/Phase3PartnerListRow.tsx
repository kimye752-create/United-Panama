"use client";

import { motion } from "framer-motion";

import type { PartnerWithDynamicPsi } from "@/src/lib/phase3/psi-calculator";
import { getPartnerWebsiteHref } from "@/src/lib/phase3/website-url";

interface Phase3PartnerListRowProps {
  partner: PartnerWithDynamicPsi;
  /** 동적 정렬 후 화면 순위(11~20) */
  currentRank: number;
  onRowClick: (partnerId: string) => void;
}

/** 동적 PSI 숫자 표기 */
function formatDynamicPsiDisplay(psi: number): string {
  return psi.toFixed(1).replace(/\.0$/u, "");
}

/** 11~20위 리스트 행 — layoutId는 리스트 전용 네임스페이스(p3-list-*) */
export function Phase3PartnerListRow({ partner, currentRank, onRowClick }: Phase3PartnerListRowProps) {
  const meta = partner.partner_meta;
  const code = meta !== undefined ? meta.countryCode : "";
  const displayName = meta !== undefined ? meta.partnerName : partner.company_name;
  const websiteHref = getPartnerWebsiteHref(partner.website);

  return (
    <div className="flex w-full items-center gap-2">
      <motion.button
        type="button"
        layout
        layoutId={`p3-list-${partner.partner_id}`}
        transition={{ layout: { duration: 0.4, ease: "easeOut" } }}
        onClick={() => {
          onRowClick(partner.partner_id);
        }}
        className="flex w-full min-w-0 flex-1 items-center justify-between rounded-lg border border-slate-200 bg-white p-3 text-left hover:bg-slate-50"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="shrink-0 text-xs font-bold text-slate-700">#{String(currentRank)}</span>
          <span className="shrink-0 text-xs text-slate-400">· {code !== "" ? code : "—"}</span>
          <span className="truncate font-semibold text-slate-800">{displayName}</span>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <div className="text-right">
            <div className="text-sm font-semibold text-slate-900">{formatDynamicPsiDisplay(partner.dynamic_psi)}</div>
            <div className="text-xs text-slate-500">PSI</div>
          </div>
        </div>
      </motion.button>
      {websiteHref !== null ? (
        <a
          href={websiteHref}
          target="_blank"
          rel="noopener noreferrer"
          title="공식 웹사이트"
          onClick={(e) => {
            e.stopPropagation();
          }}
          className="shrink-0 rounded p-1 text-sm text-slate-400 transition-colors hover:text-blue-600"
        >
          🌐
        </a>
      ) : null}
    </div>
  );
}
