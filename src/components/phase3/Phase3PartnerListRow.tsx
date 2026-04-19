"use client";

import type { PartnerWithDynamicPsi } from "@/src/lib/phase3/psi-calculator";
import { getPartnerWebsiteHref } from "@/src/lib/phase3/website-url";

interface Phase3PartnerListRowProps {
  partner: PartnerWithDynamicPsi;
  onRowClick: (partnerId: string) => void;
}

/** 11~20위 리스트 행 */
export function Phase3PartnerListRow({ partner, onRowClick }: Phase3PartnerListRowProps) {
  const hc = partner.hc_display;
  const displayRank = hc !== undefined ? hc.hc_catalog_rank : 1;
  const code = hc !== undefined ? hc.hc_country_code : "";
  const websiteHref = getPartnerWebsiteHref(partner.website);

  return (
    <div className="flex w-full items-center gap-2">
      <button
        type="button"
        onClick={() => {
          onRowClick(partner.partner_id);
        }}
        className="flex w-full min-w-0 flex-1 items-center justify-between rounded-lg border border-slate-200 bg-white p-3 text-left hover:bg-slate-50"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="shrink-0 text-xs font-bold text-slate-700">#{String(displayRank)}</span>
          <span className="shrink-0 text-xs text-slate-400">· {code !== "" ? code : "—"}</span>
          <span className="truncate font-semibold text-slate-800">{partner.company_name}</span>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <div className="text-right">
            <div className="text-sm font-semibold text-slate-900">{String(partner.dynamic_psi)}</div>
            <div className="text-xs text-slate-500">PSI</div>
          </div>
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
          className="shrink-0 rounded p-1 text-sm text-slate-400 transition-colors hover:text-blue-600"
        >
          🌐
        </a>
      ) : null}
    </div>
  );
}
