"use client";

import type { PartnerWithDynamicPsi } from "@/src/lib/phase3/psi-calculator";
import { formatPanamaAddress, formatPartnerName } from "@/src/logic/phase3/phase3_partner_card_formatters";
import { getPartnerWebsiteHref } from "@/src/lib/phase3/website-url";

interface Phase3PartnerCardProps {
  partner: PartnerWithDynamicPsi;
  onClick: () => void;
}

/** Top10 카드 — 비율 1:1.4, PSI 원형 게이지, 골드/은 단색 테마 */
export function Phase3PartnerCard({ partner, onClick }: Phase3PartnerCardProps) {
  const hc = partner.hc_display;
  const meta = partner.partner_meta;
  if (hc === undefined || meta === undefined) {
    return null;
  }

  const isTop5 = hc.hc_catalog_rank <= 5;
  const psiRaw = partner.dynamic_psi;
  const psiGauge = Math.min(100, Math.max(0, psiRaw));
  const rank = hc.hc_catalog_rank;
  const homeCountry = meta.countryName;
  const panamaAddress = formatPanamaAddress(meta.address);
  const circumference = 213.6;
  const progress = circumference * (1 - psiGauge / 100);
  const style = isTop5 ? GOLD_STYLE : SILVER_STYLE;
  const websiteHref = getPartnerWebsiteHref(meta.website);

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full cursor-pointer rounded-xl text-left transition-transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2"
      style={{ aspectRatio: "1 / 1.4" }}
    >
      <div
        className="relative flex h-full w-full flex-col overflow-hidden rounded-xl border-[1.5px] p-[14px]"
        style={{
          background: style.bg,
          borderColor: style.border,
        }}
      >
        <div
          className="absolute right-0 top-0 rounded-bl-lg px-2 py-[3px] text-[10px] font-medium"
          style={{
            background: style.badgeBg,
            color: style.badgeText,
          }}
        >
          {isTop5 ? "🏅 TOP5" : `🥈 #${String(rank)}`}
        </div>

        <div className="mb-[6px] text-[10px] font-medium" style={{ color: style.subText }}>
          #{String(rank)} · 본사 {homeCountry}
        </div>

        <div
          className="mb-[3px] whitespace-pre-line text-[22px] font-medium leading-[1.1] tracking-tight"
          style={{ color: style.mainText }}
        >
          {formatPartnerName(meta.partnerName)}
        </div>
        <div className="text-[11px]" style={{ color: style.subText }}>
          {meta.groupName !== null ? meta.groupName.replace(/\s*\([^)]*\)/u, "") : ""}
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="relative h-[82px] w-[82px]">
            <svg
              width="82"
              height="82"
              viewBox="0 0 82 82"
              className="absolute left-0 top-0"
              style={{ transform: "rotate(-90deg)" }}
              aria-hidden
            >
              <circle cx="41" cy="41" r="34" fill="none" stroke={style.gaugeBg} strokeWidth="7" />
              <circle
                cx="41"
                cy="41"
                r="34"
                fill="none"
                stroke={style.gaugeFill}
                strokeWidth="7"
                strokeDasharray={circumference}
                strokeDashoffset={progress}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-[26px] font-medium leading-none" style={{ color: style.mainText }}>
                {String(psiRaw)}
              </div>
              <div className="mt-[2px] text-[9px] font-medium" style={{ color: style.subText }}>
                PSI
              </div>
            </div>
          </div>
        </div>

        <div className="mb-[6px] text-[12px] font-medium leading-[1.45]" style={{ color: style.mainText }}>
          <div className="mb-[3px]">
            📍 {panamaAddress}
          </div>
          <div className="text-[11px] font-normal" style={{ color: style.bodyText }}>
            {meta.oneLineIntro}
          </div>
        </div>

        <div
          className="flex items-center justify-between border-t pt-[6px]"
          style={{ borderColor: style.divider }}
        >
          <span className="text-[10.5px] font-medium" style={{ color: style.subText }}>
            상세 →
          </span>
          <div className="flex gap-[10px]">
            {meta.email !== null && meta.email !== "" ? (
              <a
                href={`mailto:${meta.email}`}
                onClick={(e) => {
                  e.stopPropagation();
                }}
                className="text-[18px] leading-none hover:opacity-70"
                title={meta.email}
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
                className="text-[18px] leading-none hover:opacity-70"
                title={websiteHref}
              >
                🌐
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </button>
  );
}

const GOLD_STYLE = {
  bg: "#FAEEDA",
  border: "#EF9F27",
  badgeBg: "#BA7517",
  badgeText: "#FAEEDA",
  mainText: "#412402",
  subText: "#854F0B",
  bodyText: "#633806",
  gaugeBg: "rgba(132, 79, 11, 0.2)",
  gaugeFill: "#BA7517",
  divider: "rgba(132, 79, 11, 0.3)",
} as const;

const SILVER_STYLE = {
  bg: "#E8E7E1",
  border: "#888780",
  badgeBg: "#5F5E5A",
  badgeText: "#F1EFE8",
  mainText: "#2C2C2A",
  subText: "#444441",
  bodyText: "#5F5E5A",
  gaugeBg: "rgba(68, 68, 65, 0.2)",
  gaugeFill: "#5F5E5A",
  divider: "rgba(44, 44, 42, 0.3)",
} as const;
