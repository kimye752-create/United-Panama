import type { PartnerWithDynamicPsi } from "@/src/lib/phase3/psi-calculator";
import { getPartnerWebsiteHref } from "@/src/lib/phase3/website-url";

interface Phase3TabBasicInfoProps {
  partner: PartnerWithDynamicPsi;
}

/** 모달 탭 1 — 기본정보 */
export function Phase3TabBasicInfo({ partner }: Phase3TabBasicInfoProps) {
  const websiteHref = getPartnerWebsiteHref(partner.website);

  return (
    <div className="space-y-2 text-[12px] text-[#2b4568]">
      <div>
        <span className="text-[10px] text-[#8b97aa]">회사명</span>
        <p className="font-bold">{partner.company_name}</p>
      </div>
      {partner.company_type !== null && partner.company_type !== "" ? (
        <div>
          <span className="text-[10px] text-[#8b97aa]">유형</span>
          <p>{partner.company_type}</p>
        </div>
      ) : null}
      {partner.city !== null && partner.city !== "" ? (
        <div>
          <span className="text-[10px] text-[#8b97aa]">도시</span>
          <p>{partner.city}</p>
        </div>
      ) : null}
      {partner.address !== null && partner.address !== "" ? (
        <div>
          <span className="text-[10px] text-[#8b97aa]">주소</span>
          <p className="whitespace-pre-wrap">{partner.address}</p>
        </div>
      ) : null}
      {partner.phone !== null && partner.phone !== "" ? (
        <div>
          <span className="text-[10px] text-[#8b97aa]">전화</span>
          <p>{partner.phone}</p>
        </div>
      ) : null}
      {partner.email !== null && partner.email !== "" ? (
        <div>
          <span className="text-[10px] text-[#8b97aa]">이메일</span>
          <p>{partner.email}</p>
        </div>
      ) : null}
      <div className="grid grid-cols-[100px_1fr] gap-2 border-b border-[#edf1f6] py-2">
        <div className="text-[10px] font-semibold text-[#667b95]">웹사이트</div>
        <div className="min-w-0">
          {websiteHref !== null ? (
            <a
              href={websiteHref}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all text-[12px] font-semibold text-[#1E4E8C] hover:text-[#163a6b] hover:underline"
            >
              {websiteHref} ↗
            </a>
          ) : (
            <span className="text-[12px] text-[#8b97aa]">정보 없음</span>
          )}
        </div>
      </div>
      {partner.business_description !== null && partner.business_description !== "" ? (
        <div>
          <span className="text-[10px] text-[#8b97aa]">사업 개요</span>
          <p className="leading-relaxed">{partner.business_description}</p>
        </div>
      ) : null}
    </div>
  );
}
