"use client";

import { motion } from "framer-motion";
import { Fragment, useState } from "react";

import type { PartnerWithDynamicPsi } from "@/src/lib/phase3/psi-calculator";
import { formatPanamaAddress, formatPartnerName } from "@/src/logic/phase3/phase3_partner_card_formatters";
import { getPartnerWebsiteHref } from "@/src/lib/phase3/website-url";

import { EmailPopup } from "./EmailPopup";

interface Phase3PartnerCardProps {
  partner: PartnerWithDynamicPsi;
  /** 동적 정렬 후 화면 순위(1~10) — 카탈로그 rank와 별개 */
  currentRank: number;
  onClick: () => void;
}

/** 회사명 길이·줄바꿈에 따른 동적 폰트 크기 */
function getPartnerNameFontSize(name: string): string {
  const cleaned = name.replace(/,?\s*S\.?A\.?$/iu, "").trim();
  const hasLineBreak = cleaned.length > 18 && cleaned.includes(" ");

  if (hasLineBreak) {
    return "20px";
  }
  if (cleaned.length > 14) {
    return "22px";
  }
  return "26px";
}

/** Top10 카드 — LayoutGroup용 layoutId, currentRank 기준 골드/실버 */
export function Phase3PartnerCard({ partner, currentRank, onClick }: Phase3PartnerCardProps) {
  const meta = partner.partner_meta;
  const [emailPopupOpen, setEmailPopupOpen] = useState(false);

  if (meta === undefined) {
    return null;
  }

  const isTop5 = currentRank > 0 && currentRank <= 5;
  const isRankCard = currentRank > 5 && currentRank <= 10;
  const psi = partner.dynamic_psi;
  const psiGauge = Math.min(100, Math.max(0, psi));
  const homeCountry = meta.countryName;
  const panamaAddress = formatPanamaAddress(meta.address);
  const ringCircumference = 314.16;
  const strokeDashoffset = ringCircumference * (1 - psiGauge / 100);
  const style = isTop5 ? GOLD_STYLE : SILVER_STYLE;
  const websiteHref = getPartnerWebsiteHref(meta.website);

  return (
    <Fragment>
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
          <div className="mb-[6px]" style={{ color: style.subText }}>
            <span className="text-[11px] font-medium">
              {isTop5 ? "🏅 " : isRankCard ? "🥈 " : ""}#{String(currentRank)} · 본사 {homeCountry}
            </span>
          </div>

          <div className="min-h-[50px]">
            <div
              className="mb-[3px] font-medium leading-[1.1] tracking-tight whitespace-pre-line"
              style={{
                color: style.mainText,
                fontSize: getPartnerNameFontSize(meta.partnerName),
              }}
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
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEmailPopupOpen(true);
                  }}
                  className="text-[18px] leading-none hover:opacity-70"
                  title="이메일 보기"
                >
                  ✉
                </button>
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

      {emailPopupOpen && meta.email !== null && meta.email !== "" ? (
        <EmailPopup
          email={meta.email}
          onClose={() => {
            setEmailPopupOpen(false);
          }}
        />
      ) : null}
    </Fragment>
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
  bg: "#EDEAE0",
  border: "#7D7B74",
  badgeBg: "#3A3936",
  badgeText: "#F5F2EA",
  mainText: "#2C2C2A",
  subText: "#54524E",
  bodyText: "#6B6964",
  gaugeBg: "rgba(60, 58, 54, 0.15)",
  gaugeFill: "#3A3936",
  divider: "rgba(60, 58, 54, 0.3)",
} as const;
