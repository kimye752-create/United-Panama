"use client";

import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import type { Partner, ProductId } from "@/src/lib/phase3/partners-data";
import { getPartnerWebsiteHref } from "@/src/lib/phase3/website-url";

import { EmailPopup } from "./EmailPopup";
import { Phase3ProductMatchSection } from "./Phase3ProductMatchSection";

interface Phase3DetailModalProps {
  partner: Partner | null;
  currentRank: number;
  selectedProductSlug: ProductId | null;
  onClose: () => void;
}

/** 파트너 적합 판정 표시용 — Tier 숫자 접두어만 제거 (점수 산출 내역 서술은 그대로 유지) */
function stripTierPrefix(text: string): string {
  return text.replace(/^Tier\s+\d+\s*[\(·.]?\s*/i, "").trim();
}

function InfoRow({
  icon,
  label,
  value,
  isLink,
  href,
}: {
  icon: string;
  label: string;
  value: string | null;
  isLink?: boolean;
  href?: string | null;
}): ReactElement {
  return (
    <div className="flex items-start gap-2">
      <span className="shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-xs text-slate-500">{label}</div>
        {isLink === true && href !== null && href !== undefined && href !== "" ? (
          <a
            href={href}
            target={href.startsWith("mailto:") ? undefined : "_blank"}
            rel={href.startsWith("mailto:") ? undefined : "noopener noreferrer"}
            className="break-all text-blue-600 hover:underline"
          >
            {value !== null && value !== "" ? value : "정보 없음"}
          </a>
        ) : (
          <div className="break-all text-slate-700">{value !== null && value !== "" ? value : "정보 없음"}</div>
        )}
      </div>
    </div>
  );
}

function FactorRow({ icon, label, value }: { icon: string; label: string; value: string }): ReactElement {
  return (
    <div className="flex items-start gap-2">
      <span className="shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-xs text-slate-500">{label}</div>
        <div className="text-slate-700">{value}</div>
      </div>
    </div>
  );
}

/** partners-data 원본 — document.body 포털·z-[9999] (모달은 Phase3Container에서 dynamic ssr:false) */
export function Phase3DetailModal({
  partner,
  currentRank,
  selectedProductSlug,
  onClose,
}: Phase3DetailModalProps): ReactElement | null {
  const [isProductMatchOpen, setIsProductMatchOpen] = useState(false);
  const [isTierCriteriaOpen, setIsTierCriteriaOpen] = useState(false);
  const [isScoreBreakdownOpen, setIsScoreBreakdownOpen] = useState(true);
  const [emailPopupOpen, setEmailPopupOpen] = useState(false);

  useEffect(() => {
    if (partner === null) {
      return;
    }

    const handleEsc = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEsc);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = originalOverflow;
    };
  }, [partner, onClose]);

  if (partner === null) {
    return null;
  }

  const isTop5 = currentRank > 0 && currentRank <= 5;
  const isRankCard = currentRank > 0 && currentRank <= 10;

  const theme = isTop5
    ? {
        bodyBg: "#FFFFFF",
        headerBg: "#FAEEDA",
        border: "#BA7517",
        shadow: "0 20px 60px rgba(186, 117, 23, 0.25)",
        badge: "🏅 TOP5",
        badgeBg: "#BA7517",
        badgeText: "#FAEEDA",
        accent: "#412402",
      }
    : isRankCard
      ? {
          bodyBg: "#FFFFFF",
          headerBg: "#D3D1C7",
          border: "#5F5E5A",
          shadow: "0 20px 60px rgba(44, 44, 42, 0.25)",
          badge: `🥈 #${String(currentRank)}`,
          badgeBg: "#2C2C2A",
          badgeText: "#F1EFE8",
          accent: "#2C2C2A",
        }
      : {
          bodyBg: "#FFFFFF",
          headerBg: "#F8FAFC",
          border: "#CBD5E1",
          shadow: "0 20px 60px rgba(15, 23, 42, 0.15)",
          badge: `#${String(currentRank)}`,
          badgeBg: "#64748B",
          badgeText: "#FFFFFF",
          accent: "#475569",
        };

  const scores = [
    {
      label: "매출규모 (Revenue)",
      value: partner.revenueScore,
      weight: 0.35,
      qualitative: partner.fiveFactorsDescription.revenue,
    },
    {
      label: "파이프라인 (Pipeline)",
      value: partner.pipelineAvgScore,
      weight: 0.28,
      qualitative: partner.fiveFactorsDescription.pipeline,
    },
    {
      label: "제조소 보유 (Manufacturing)",
      value: partner.manufacturingScore,
      weight: 0.2,
      qualitative: partner.fiveFactorsDescription.manufacturing,
    },
    {
      label: "수입 경험 (Import Exp.)",
      value: partner.importExperienceScore,
      weight: 0.12,
      qualitative: partner.fiveFactorsDescription.importExperience,
    },
    {
      label: "약국체인 운영 (Pharmacy)",
      value: partner.pharmacyChainScore,
      weight: 0.05,
      qualitative: partner.fiveFactorsDescription.pharmacyChain,
    },
  ];

  const websiteHref = getPartnerWebsiteHref(partner.website);

  const modalContent = (
    <div
      className="flex items-center justify-center bg-black/60 p-3"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
      }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="phase3-modal-title"
    >
      <div
        className="overflow-y-auto rounded-2xl"
        style={{
          background: theme.bodyBg,
          border: `2px solid ${theme.border}`,
          boxShadow: theme.shadow,
          maxWidth: "800px",
          width: "100%",
          maxHeight: "85vh",
        }}
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <div
          className="sticky top-0 z-10 flex items-center justify-between border-b p-3"
          style={{
            background: theme.headerBg,
            borderBottomColor: theme.border,
          }}
        >
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="shrink-0 rounded-md px-2.5 py-1 text-[11px] font-semibold"
              style={{
                background: theme.badgeBg,
                color: theme.badgeText,
              }}
            >
              {theme.badge}
            </span>
            <h2
              id="phase3-modal-title"
              className="truncate text-lg font-bold"
              style={{ color: theme.accent }}
            >
              {partner.partnerName}
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-4">
            <span className="text-base font-semibold text-amber-700">PSI {String(partner.basePSI)}</span>
            <button
              type="button"
              onClick={onClose}
              aria-label="닫기"
              className="flex h-8 w-8 items-center justify-center rounded text-xl leading-none text-slate-500 hover:bg-white/50 hover:text-slate-900"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="grid border-b border-slate-200 max-md:grid-cols-1 md:grid-cols-2">
          <div className="border-slate-200 p-3 max-md:border-b md:border-r">
            <h3 className="mb-2 text-sm font-bold text-slate-700">🏢 기본 정보</h3>
            <div className="space-y-2 text-sm">
              <InfoRow icon="📍" label="소재지" value={partner.address} />
              <div className="flex items-start gap-2">
                <span className="shrink-0">✉</span>
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-slate-500">이메일</div>
                  {partner.email !== null && partner.email !== "" ? (
                    <button
                      type="button"
                      onClick={() => {
                        setEmailPopupOpen(true);
                      }}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      이메일 보기
                    </button>
                  ) : (
                    <div className="break-all text-slate-700">정보 없음</div>
                  )}
                </div>
              </div>
              <InfoRow icon="📞" label="연락처" value={partner.phone} />
              <InfoRow
                icon="🌐"
                label="웹사이트"
                value={websiteHref}
                isLink={websiteHref !== null}
                href={websiteHref}
              />
              <InfoRow icon="📋" label="MINSA" value={partner.minsaLicense} />
            </div>
          </div>

          <div className="p-3">
            <h3 className="mb-2 text-sm font-bold text-slate-700">📊 파트너 적합 판정</h3>
            <div className="space-y-2 text-sm">
              <FactorRow icon="💰" label="매출규모" value={stripTierPrefix(partner.fiveFactorsDescription.revenue)} />
              <FactorRow
                icon="🏭"
                label="제조소 보유"
                value={stripTierPrefix(partner.fiveFactorsDescription.manufacturing)}
              />
              <FactorRow
                icon="💊"
                label="약국체인 운영"
                value={stripTierPrefix(partner.fiveFactorsDescription.pharmacyChain)}
              />
              <FactorRow icon="📦" label="파이프라인" value={stripTierPrefix(partner.fiveFactorsDescription.pipeline)} />
              <FactorRow
                icon="🌍"
                label="수입 경험"
                value={stripTierPrefix(partner.fiveFactorsDescription.importExperience)}
              />
            </div>
          </div>
        </div>

        <div className="border-b border-slate-200 p-3">
          <h3 className="mb-2 text-sm font-bold text-slate-700">💡 기업 소개</h3>
          <div className="whitespace-pre-line text-sm text-slate-700">{partner.companyDescription}</div>
        </div>

        <div className="border-b border-slate-200 px-3 pb-3">
          <button
            type="button"
            onClick={() => {
              setIsScoreBreakdownOpen(!isScoreBreakdownOpen);
            }}
            className="flex w-full items-center justify-between rounded-lg border bg-slate-50 p-3 transition-colors hover:bg-slate-100"
            style={{ borderColor: theme.border }}
          >
            <span className="text-sm font-bold text-slate-700">📊 점수 산출 내역</span>
            <span className="text-xs font-medium text-slate-500">
              {isScoreBreakdownOpen ? "▲ 접기" : "▼ 펼치기"}
            </span>
          </button>

          {isScoreBreakdownOpen ? (
            <div className="mt-2">
              <div className="mb-3 rounded border border-slate-200 bg-white p-3 font-mono text-xs">
                <div className="space-y-1.5">
                  {scores.map((s) => (
                    <div key={s.label} className="space-y-1 border-b border-slate-100 pb-2 last:border-0">
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-slate-900 font-semibold">{s.label}</span>
                        <span className="shrink-0 text-right font-mono text-xs">
                          <span className="font-medium text-slate-900">
                            {String(s.value)}점 × {(s.weight * 100).toFixed(0)}% ={" "}
                          </span>
                          <strong className="font-bold text-amber-700">{(s.value * s.weight).toFixed(1)}</strong>
                        </span>
                      </div>
                      <div className="pl-1 text-[11px] font-medium text-slate-700">{s.qualitative}</div>
                    </div>
                  ))}
                  <div className="my-2 border-t border-slate-300" />
                  <div className="flex justify-between font-bold text-slate-900">
                    <span>총점 (PSI)</span>
                    <span className="text-base text-amber-700">{String(partner.basePSI)}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="border-b border-slate-200 px-3 pb-3">
          <button
            type="button"
            onClick={() => {
              setIsTierCriteriaOpen(!isTierCriteriaOpen);
            }}
            className="flex w-full items-center justify-between rounded-lg border bg-slate-50 p-3 transition-colors hover:bg-slate-100"
            style={{ borderColor: theme.border }}
          >
            <span className="text-sm font-bold text-slate-700">📘 파트너 판단 기준 - 5개항</span>
            <span className="text-xs font-medium text-slate-500">
              {isTierCriteriaOpen ? "▲ 접기" : "▼ 펼치기"}
            </span>
          </button>

          {isTierCriteriaOpen ? (
            <div className="mt-2 space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs">
              <div>
                <div className="mb-2 font-bold text-slate-800">💰 매출 규모 (35%)</div>
                <div className="space-y-1 pl-2 text-slate-600">
                  <div>
                    <strong className="text-slate-800">Tier 1: USD 10억+</strong> → 100점 · Hetero, GSK, Pfizer, Roche 등
                    글로벌 MNC
                  </div>
                  <div>
                    <strong className="text-slate-800">Tier 2: USD 3억 ~ 10억</strong> → 85점 · Tecnoquímicas, PiSA, Guerbet 등
                    중견
                  </div>
                  <div>
                    <strong className="text-slate-800">Tier 3: USD 5천만 ~ 3억</strong> → 70점 · Unipharm 등 국가별 Top
                  </div>
                  <div>
                    <strong className="text-slate-800">Tier 4: USD 1천만 ~ 5천만</strong> → 55점 · Medipan, Haseth 등 로컬
                    중견
                  </div>
                  <div>
                    <strong className="text-slate-800">Tier 5: USD 1천만 미만</strong> → 30점 · Sequisa 등 소규모
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-2 font-bold text-slate-800">💊 파이프라인 (28%)</div>
                <div className="space-y-1 pl-2 text-slate-600">
                  <div>
                    <strong>High (85~100점)</strong>: 복합제 다수 + ATC 중복 풍부
                  </div>
                  <div>
                    <strong>Mid-High (70~85점)</strong>: 유사 단일제 경험, 인접 카테고리
                  </div>
                  <div>
                    <strong>Mid (55~70점)</strong>: 단일 카테고리 특화
                  </div>
                  <div>
                    <strong>Low (30~50점)</strong>: 겹침 적음
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-2 font-bold text-slate-800">🏭 제조소 보유 (20%)</div>
                <div className="space-y-1 pl-2 text-slate-600">
                  <div>
                    <strong>직영 GMP (100점)</strong>: 자체 제조 + GMP 인증
                  </div>
                  <div>
                    <strong>창고 허브 (70점)</strong>: ZLC · 창고 · 재수출
                  </div>
                  <div>
                    <strong>순수 유통 (40점)</strong>: 수입→유통만
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-2 font-bold text-slate-800">🌐 수입 경험 (12%)</div>
                <div className="space-y-1 pl-2 text-slate-600">
                  <div>
                    <strong>글로벌+WHO PQ (90~100점)</strong>: 100개국+ 수출
                  </div>
                  <div>
                    <strong>다국가 (70~85점)</strong>: 10~100개국
                  </div>
                  <div>
                    <strong>지역 (50~70점)</strong>: LATAM 또는 인접 권역
                  </div>
                  <div>
                    <strong>내수 (30~50점)</strong>: 파나마 단독
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-2 font-bold text-slate-800">🏪 약국체인 운영 (5%)</div>
                <div className="space-y-1 pl-2 text-slate-600">
                  <div>
                    <strong>대형 체인 (80~100점)</strong>: 100개+ 소매점
                  </div>
                  <div>
                    <strong>중형 (50~80점)</strong>: 10~100개
                  </div>
                  <div>
                    <strong>소형 (20~50점)</strong>: 10개 미만
                  </div>
                  <div>
                    <strong>미보유 (0점)</strong>: B2B 전문
                  </div>
                </div>
              </div>

              <div className="border-t border-blue-200 pt-2 text-[10px] text-slate-500">
                ※ 모든 매출은 USD 환산 기준 (2025년 평균 환율 적용)
              </div>
            </div>
          ) : null}
        </div>

        <div className="p-3">
          <button
            type="button"
            onClick={() => {
              setIsProductMatchOpen((prev) => !prev);
            }}
            className="flex w-full items-center justify-between rounded-lg border bg-slate-50 p-3 transition-colors hover:bg-slate-100"
            style={{ borderColor: theme.border }}
          >
            <span className="text-sm font-bold text-slate-700">💊 8제품 매칭 상세</span>
            <span className="text-xs font-medium text-slate-500">
              {isProductMatchOpen ? "▲ 접기" : "▼ 펼치기"}
            </span>
          </button>

          {isProductMatchOpen ? (
            <div className="mt-2">
              <Phase3ProductMatchSection partner={partner} selectedProductSlug={selectedProductSlug} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {createPortal(modalContent, document.body)}
      {emailPopupOpen && partner.email !== null && partner.email !== "" ? (
        <EmailPopup
          email={partner.email}
          onClose={() => {
            setEmailPopupOpen(false);
          }}
        />
      ) : null}
    </>
  );
}
