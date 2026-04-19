"use client";

import { motion } from "framer-motion";

import type { PartnerWithDynamicPsi } from "@/src/lib/phase3/psi-calculator";
import { formatPanamaAddress, formatPartnerName } from "@/src/logic/phase3/phase3_partner_card_formatters";
import { getPartnerWebsiteHref } from "@/src/lib/phase3/website-url";

interface Phase3PartnerCardProps {
  partner: PartnerWithDynamicPsi;
  /** 동적 정렬 후 화면 순위(1~10) — 카탈로그 rank와 별개 */
  currentRank: number;
  onClick: () => void;
}

/** Top10 카드 — LayoutGroup용 layoutId, currentRank 기준 골드/실버 */
export function Phase3PartnerCard({ partner, currentRank, onClick }: Phase3PartnerCardProps) {
  const meta = partner.partner_meta;
  if (meta === undefined) {
    return null;
  }

  const isTop5 = currentRank <= 5;
  const psi = partner.dynamic_psi;
  const psiGauge = Math.min(100, Math.max(0, psi));
  const homeCountry = meta.countryName;
  const panamaAddress = formatPanamaAddress(meta.address);
  const ringCircumference = 314.16;
  const strokeDashoffset = ringCircumference * (1 - psiGauge / 100);
  const style = isTop5 ? GOLD_STYLE : SILVER_STYLE;
  const websiteHref = getPartnerWebsiteHref(meta.website);

  return (
    <motion.button
      type="button"
      layout
      layoutId={`p3-card-${partner.partner_id}`}
      transition={{ layout: { duration: 0.4, ease: "easeOut" } }}
      onClick={onClick}
      className="w-full cursor-pointer rounded-xl text-left focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2"
      style={{ aspectRatio: "1 / 1.4" }}
      whileHover={{ scale: 1.02 }}
    >
      <div
        className="flex h-full w-full flex-col overflow-hidden rounded-xl border-[1.5px] p-[14px]"
        style={{
          background: style.bg,
          borderColor: style.border,
        }}
      >
        {/* 상단: 본사·순위(좌) / 배지(우) — absolute 배지 제거로 겹침 방지 */}
        <div className="-mx-[4px] -mt-[4px] mb-[6px] flex items-start justify-between gap-1">
          <div className="min-w-0 flex-1 pl-[4px] pt-[4px] text-[10px] font-medium" style={{ color: style.subText }}>
            #{String(currentRank)} · 본사 {homeCountry}
          </div>
          <div
            className="shrink-0 rounded-bl-md rounded-tr-lg px-[6px] py-[3px] text-[9px] font-medium"
            style={{
              background: style.badgeBg,
              color: style.badgeText,
            }}
          >
            {isTop5 ? "🏅 TOP5" : `🥈 #${String(currentRank)}`}
          </div>
        </div>

        <div className="min-h-[50px]">
          <div
            className="mb-[3px] whitespace-pre-line text-[20px] font-medium leading-[1.1] tracking-tight"
            style={{ color: style.mainText }}
          >
            {formatPartnerName(meta.partnerName)}
          </div>
          <div className="text-[11px]" style={{ color: style.subText }}>
            {meta.groupName !== null ? meta.groupName.replace(/\s*\([^)]*\)/u, "") : ""}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 items-center justify-center">
          <svg width="120" height="120" viewBox="0 0 120 120" aria-hidden>
            <g transform="rotate(-90 60 60)">
              <circle cx="60" cy="60" r="50" fill="none" stroke={style.gaugeBg} strokeWidth="9" />
              <motion.circle
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke={style.gaugeFill}
                strokeWidth="9"
                strokeDasharray={ringCircumference}
                strokeLinecap="round"
                initial={false}
                animate={{ strokeDashoffset }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </g>
            <text
              x="60"
              y="58"
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="30"
              fontWeight="500"
              fill={style.mainText}
            >
              {typeof psi === "number" ? psi.toFixed(1).replace(/\.0$/u, "") : String(psi)}
            </text>
            <text
              x="60"
              y="82"
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="10"
              fontWeight="500"
              fill={style.subText}
            >
              PSI
            </text>
          </svg>
        </div>

        <div className="mb-[6px] text-[12px] font-medium leading-[1.45]" style={{ color: style.mainText }}>
          <div className="mb-[3px]">
            📍 {panamaAddress}
          </div>
          <div className="line-clamp-1 text-[11px] font-normal" style={{ color: style.bodyText }}>
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
    </motion.button>
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
  bg: "#D3D1C7",
  border: "#5F5E5A",
  badgeBg: "#2C2C2A",
  badgeText: "#F1EFE8",
  mainText: "#2C2C2A",
  subText: "#444441",
  bodyText: "#5F5E5A",
  gaugeBg: "rgba(44, 44, 42, 0.2)",
  gaugeFill: "#2C2C2A",
  divider: "rgba(44, 44, 42, 0.4)",
} as const;
