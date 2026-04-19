"use client";

import { motion } from "framer-motion";

import { getFlagEmojiFromCountryCode } from "@/src/lib/phase3/country-flag";
import type { PartnerWithDynamicPsi } from "@/src/lib/phase3/psi-calculator";
import { getPartnerWebsiteHref } from "@/src/lib/phase3/website-url";

interface Phase3PartnerCardShellProps {
  partner: PartnerWithDynamicPsi;
  tier: "gold" | "standard";
  onOpen: (partner: PartnerWithDynamicPsi) => void;
}

/** Top 10 카드 — 골드(1~5)·일반(6~10), 클릭 시 모달 (접점 링크는 전파 차단) */
export function Phase3PartnerCardShell({ partner, tier, onOpen }: Phase3PartnerCardShellProps) {
  const isGold = tier === "gold";
  const hc = partner.hc_display;
  const displayRank = hc !== undefined ? hc.hc_catalog_rank : 1;
  const flag = getFlagEmojiFromCountryCode(hc?.hc_country_code);
  const groupShort =
    partner.company_type !== null && partner.company_type !== ""
      ? partner.company_type.replace(/\s*\([^)]*\)/u, "").trim()
      : "";
  const countryLine = hc !== undefined ? hc.hc_country_name : "";
  const addressHead =
    partner.address !== null && partner.address !== "" ? partner.address.split(",")[0]?.trim() ?? "" : "";
  const intro = hc !== undefined ? hc.hc_one_line_intro : "";
  const websiteHref = getPartnerWebsiteHref(partner.website);

  return (
    <motion.button
      type="button"
      layoutId={`p3-${partner.id}`}
      onClick={() => {
        onOpen(partner);
      }}
      className={[
          "h-[189px] w-full rounded-xl p-3 text-left",
          "flex flex-col justify-between transition-all",
          isGold
            ? "border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-50 shadow-md hover:shadow-lg"
            : "border border-slate-200 bg-white shadow-sm hover:bg-slate-50/80",
        ].join(" ")}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-700">#{String(displayRank)}</span>
            <span className="text-sm" aria-hidden>
              {flag}
            </span>
            {isGold ? (
              <span className="text-sm" aria-hidden>
                🏅
              </span>
            ) : null}
          </div>
          <span className="text-xs font-semibold text-amber-700">PSI {String(partner.dynamic_psi)}</span>
        </div>

        <div className="min-h-0">
          <div className="line-clamp-1 text-sm font-bold text-slate-900">{partner.company_name}</div>
          <div className="line-clamp-1 text-xs text-slate-500">
            {groupShort}
            {groupShort !== "" && countryLine !== "" ? " · " : ""}
            {countryLine}
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs text-slate-600">
          <span aria-hidden>📍</span>
          <span className="line-clamp-1">{addressHead !== "" ? addressHead : "—"}</span>
        </div>

        <div className="flex items-start gap-1 text-xs font-medium text-slate-700">
          <span className="shrink-0" aria-hidden>
            💡
          </span>
          <span className="line-clamp-1">{intro !== "" ? intro : "—"}</span>
        </div>

        <div className="flex items-center justify-end gap-2">
          {partner.email !== null && partner.email !== "" ? (
            <a
              href={`mailto:${partner.email}`}
              onClick={(e) => {
                e.stopPropagation();
              }}
              className="text-sm text-slate-500 hover:text-blue-600"
              title={partner.email}
            >
              ✉
            </a>
          ) : null}
          {websiteHref !== null ? (
            <a
              href={websiteHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                e.stopPropagation();
              }}
              className="text-sm text-slate-500 hover:text-blue-600"
              title={websiteHref}
            >
              🌐
            </a>
          ) : null}
        </div>
    </motion.button>
  );
}
