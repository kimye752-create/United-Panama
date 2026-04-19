"use client";

import type { ReactElement } from "react";

import type { ProductId } from "@/src/lib/phase3/partners-data";
import type { PartnerWithDynamicPsi } from "@/src/lib/phase3/psi-calculator";
import { getPartnerWebsiteHref } from "@/src/lib/phase3/website-url";

import { Phase3ProductMatchSection } from "./Phase3ProductMatchSection";

interface Phase3DetailModalProps {
  open: boolean;
  partner: PartnerWithDynamicPsi | null;
  rankHint: number | null;
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

/** 카드·리스트 공통 상세 모달 — 탭 없이 ㅗ자 3블록 + 8제품 매칭 */
export function Phase3DetailModal({
  open,
  partner,
  rankHint,
  selectedProductSlug,
  onClose,
}: Phase3DetailModalProps): ReactElement | null {
  if (!open || partner === null) {
    return null;
  }

  const websiteHref = getPartnerWebsiteHref(partner.website);
  const hc = partner.hc_display;
  const displayRank = hc !== undefined ? hc.hc_catalog_rank : rankHint ?? 1;
  const five = hc?.hc_five_factors;
  const companyDesc = hc !== undefined ? hc.hc_company_description : partner.business_description ?? "";
  const minsa = hc !== undefined ? hc.hc_minsa_license : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="모달 배경 닫기" onClick={onClose} />
      <div className="relative z-[1] max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 p-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="shrink-0 text-sm font-bold text-slate-700">#{String(displayRank)}</span>
            {displayRank <= 5 ? (
              <span className="shrink-0" aria-hidden>
                🏅
              </span>
            ) : null}
            <h2 className="truncate text-lg font-bold text-slate-900">{partner.company_name}</h2>
          </div>
          <div className="flex shrink-0 items-center gap-4">
            <span className="text-base font-semibold text-amber-700">PSI {String(partner.dynamic_psi)}</span>
            <button
              type="button"
              onClick={onClose}
              className="rounded px-2 py-1 text-lg leading-none text-slate-500 hover:bg-slate-100"
              aria-label="닫기"
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
              <InfoRow icon="📋" label="MINSA" value={minsa !== "" ? minsa : null} />
            </div>
          </div>

          <div className="p-4">
            <h3 className="mb-3 text-sm font-bold text-slate-700">📊 5대 요소 현황</h3>
            <div className="space-y-2 text-sm">
              <FactorRow
                icon="💰"
                label="매출규모"
                value={five !== undefined ? five.revenue : "정보 없음"}
              />
              <FactorRow
                icon="🏭"
                label="제조소 보유"
                value={five !== undefined ? five.manufacturing : "정보 없음"}
              />
              <FactorRow
                icon="💊"
                label="약국체인 운영"
                value={five !== undefined ? five.pharmacyChain : "정보 없음"}
              />
              <FactorRow
                icon="📦"
                label="파이프라인"
                value={five !== undefined ? five.pipeline : "정보 없음"}
              />
              <FactorRow
                icon="🌍"
                label="수입 경험"
                value={five !== undefined ? five.importExperience : "정보 없음"}
              />
            </div>
          </div>
        </div>

        <div className="border-b border-slate-200 bg-slate-50 p-4">
          <h3 className="mb-3 text-sm font-bold text-slate-700">📊 PSI 계산식</h3>
          <div className="mb-4 rounded border border-slate-200 bg-white p-3 font-mono text-xs">
            PSI = ({String(partner.revenue_tier_score)} × 35%) + ({String(partner.pipeline_tier_score)} × 28%)
            <br />
            + ({String(partner.manufacturing_score)} × 20%) + ({String(partner.import_experience_score)} × 12%)
            <br />
            + ({String(partner.pharmacy_chain_score)} × 5%)
            <br />
            <strong>= {String(partner.psi_total_default)}</strong>
          </div>

          <h3 className="mb-2 text-sm font-bold text-slate-700">💡 기업 소개</h3>
          <div className="whitespace-pre-line text-sm text-slate-700">{companyDesc !== "" ? companyDesc : "정보 없음"}</div>
        </div>

        <div className="p-4">
          <h3 className="mb-3 text-sm font-bold text-slate-700">💊 8제품 매칭</h3>
          <Phase3ProductMatchSection partner={partner} selectedProductSlug={selectedProductSlug} />
        </div>
      </div>
    </div>
  );
}
