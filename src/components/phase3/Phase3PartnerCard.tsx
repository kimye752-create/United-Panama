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

/** 동적 PSI 숫자 표기(정수면 소수 제거) */
function formatDynamicPsiDisplay(psi: number): string {
  return psi.toFixed(1).replace(/\.0$/u, "");
}

/** Top10 카드 — LayoutGroup용 layoutId, currentRank 기준 골드/실버 */
export function Phase3PartnerCard({ partner, currentRank, onClick }: Phase3PartnerCardProps) {
  const meta = partner.partner_meta;
  if (meta === undefined) {
    return null;
  }

  const isTop5 = currentRank <= 5;
  const psiRaw = partner.dynamic_psi;
  const psiGauge = Math.min(100, Math.max(0, psiRaw));
  const homeCountry = meta.countryName;
  const panamaAddress = formatPanamaAddress(meta.address);
  const circumference = 213.6;
  const progress = circumference * (1 - psiGauge / 100);
  const style = isTop5 ? GOLD_STYLE : SILVER_STYLE;
  const websiteHref = getPartnerWebsiteHref(meta.website);

  return (
    <motion.button
      type="button"
      layout
      layoutId={`p3-${partner.id}`}
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
              <motion.circle
                cx="41"
                cy="41"
                r="34"
                fill="none"
                stroke={style.gaugeFill}
                strokeWidth="7"
                strokeDasharray={circumference}
                strokeLinecap="round"
                initial={false}
                animate={{ strokeDashoffset: progress }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.div
                key={psiRaw}
                initial={{ opacity: 0.5, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="text-[26px] font-medium leading-none"
                style={{ color: style.mainText }}
              >
                {formatDynamicPsiDisplay(psiRaw)}
              </motion.div>
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
