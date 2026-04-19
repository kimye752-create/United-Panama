"use client";

import type { ReactElement } from "react";
import { useEffect } from "react";
import { createPortal } from "react-dom";

import type { Partner, ProductId } from "@/src/lib/phase3/partners-data";
import { getPartnerWebsiteHref } from "@/src/lib/phase3/website-url";

import { Phase3ProductMatchSection } from "./Phase3ProductMatchSection";

interface Phase3DetailModalProps {
  partner: Partner | null;
  selectedProductSlug: ProductId | null;
  onClose: () => void;
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
  selectedProductSlug,
  onClose,
}: Phase3DetailModalProps): ReactElement | null {
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

  const scores = [
    { label: "매출규모 (Revenue)", value: partner.revenueScore, weight: 0.35 },
    { label: "파이프라인 (Pipeline)", value: partner.pipelineAvgScore, weight: 0.28 },
    { label: "제조소 보유 (Manufacturing)", value: partner.manufacturingScore, weight: 0.2 },
    { label: "수입 경험 (Import Exp.)", value: partner.importExperienceScore, weight: 0.12 },
    { label: "약국체인 운영 (Pharmacy)", value: partner.pharmacyChainScore, weight: 0.05 },
  ] as const;

  const websiteHref = getPartnerWebsiteHref(partner.website);

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="phase3-modal-title"
    >
      <div
        className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white p-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="shrink-0 text-sm font-bold text-slate-700">#{String(partner.rank)}</span>
            {partner.rank <= 5 ? (
              <span className="shrink-0" aria-hidden>
                🏅
              </span>
            ) : null}
            <h2 id="phase3-modal-title" className="truncate text-lg font-bold text-slate-900">
              {partner.partnerName}
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-4">
            <span className="text-base font-semibold text-amber-700">PSI {String(partner.basePSI)}</span>
            <button
              type="button"
              onClick={onClose}
              aria-label="닫기"
              className="flex h-8 w-8 items-center justify-center rounded text-xl leading-none text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="grid border-b border-slate-200 max-md:grid-cols-1 md:grid-cols-2">
          <div className="border-slate-200 p-4 max-md:border-b md:border-r">
            <h3 className="mb-3 text-sm font-bold text-slate-700">🏢 기본 정보</h3>
            <div className="space-y-2 text-sm">
              <InfoRow icon="📍" label="소재지" value={partner.address} />
              <InfoRow
                icon="✉"
                label="이메일"
                value={partner.email}
                isLink={partner.email !== null && partner.email !== ""}
                href={partner.email !== null && partner.email !== "" ? `mailto:${partner.email}` : null}
              />
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

          <div className="p-4">
            <h3 className="mb-3 text-sm font-bold text-slate-700">📊 5대 요소 현황</h3>
            <div className="space-y-2 text-sm">
              <FactorRow icon="💰" label="매출규모" value={partner.fiveFactorsDescription.revenue} />
              <FactorRow icon="🏭" label="제조소 보유" value={partner.fiveFactorsDescription.manufacturing} />
              <FactorRow icon="💊" label="약국체인 운영" value={partner.fiveFactorsDescription.pharmacyChain} />
              <FactorRow icon="📦" label="파이프라인" value={partner.fiveFactorsDescription.pipeline} />
              <FactorRow icon="🌍" label="수입 경험" value={partner.fiveFactorsDescription.importExperience} />
            </div>
          </div>
        </div>

        <div className="border-b border-slate-200 bg-slate-50 p-4">
          <h3 className="mb-3 text-sm font-bold text-slate-700">📊 PSI 배점</h3>

          <div className="mb-4 rounded border border-slate-200 bg-white p-4 font-mono text-xs">
            <div className="space-y-1.5">
              {scores.map((s) => (
                <div key={s.label} className="flex justify-between gap-2">
                  <span className="text-slate-600">{s.label}</span>
                  <span className="text-right text-slate-900">
                    {String(s.value)}점 × {(s.weight * 100).toFixed(0)}% ={" "}
                    <strong>{(s.value * s.weight).toFixed(1)}</strong>
                  </span>
                </div>
              ))}
              <div className="my-2 border-t border-slate-300" />
              <div className="flex justify-between font-bold text-slate-900">
                <span>총점 (PSI)</span>
                <span className="text-base text-amber-700">{String(partner.basePSI)}</span>
              </div>
            </div>
          </div>

          <h3 className="mb-2 text-sm font-bold text-slate-700">💡 기업 소개</h3>
          <div className="whitespace-pre-line text-sm text-slate-700">{partner.companyDescription}</div>
        </div>

        <div className="p-4">
          <h3 className="mb-3 text-sm font-bold text-slate-700">💊 8제품 매칭</h3>
          <Phase3ProductMatchSection partner={partner} selectedProductSlug={selectedProductSlug} />
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
