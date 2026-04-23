"use client";

import type { PartnerCandidate } from "@/src/types/phase3_partner";

interface Props {
  rank: number;
  partner: PartnerCandidate;
  onClose: () => void;
}

function dash(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  return String(v);
}

function fmtRevenue(usd: number | null): string {
  if (usd === null) return "—";
  if (usd >= 1_000_000_000) return `USD ${(usd / 1_000_000_000).toFixed(1)}B`;
  if (usd >= 1_000_000)     return `USD ${(usd / 1_000_000).toFixed(1)}M`;
  return `USD ${usd.toLocaleString("en-US")}`;
}

function fmtList(items: string[] | null): string {
  if (!items || items.length === 0) return "—";
  return items.join(", ");
}

/** 기업 개요 — 실제 DB 필드만 조합하여 할루시네이션 방지 */
function buildOverview(p: PartnerCandidate): string {
  const parts: string[] = [];
  parts.push(`${p.company_name}은(는) ${p.address ?? "파나마"}에 소재한 의약품 유통 기업입니다.`);
  if (p.revenue_usd !== null)    parts.push(`연매출 ${fmtRevenue(p.revenue_usd)}.`);
  if (p.employee_count !== null) parts.push(`임직원 ${p.employee_count}명.`);
  if (p.founded_year !== null)   parts.push(`${p.founded_year}년 설립.`);
  if (p.gmp_certified === true)  parts.push("자체 제조소·GMP 인증 보유.");
  if (p.import_history === true) {
    const detail = p.import_history_detail ? ` (${p.import_history_detail})` : "";
    parts.push(`의약품 수입 이력 보유${detail}.`);
  }
  if (p.mah_capable === true)    parts.push("MAH(Marketing Authorization Holder) 역량 보유.");
  if (p.therapeutic_areas && p.therapeutic_areas.length > 0) {
    parts.push(`주요 치료 영역: ${p.therapeutic_areas.join(", ")}.`);
  }
  return parts.join(" ");
}

/** 카테고리 태그용 요약 (도시 · 사업유형) */
function buildCategoryTag(p: PartnerCandidate): string {
  const parts: string[] = [];
  // 주소에서 도시 추출 (Panama City 등)
  if (p.address !== null) {
    const cityMatch = p.address.match(/(Panama City|Ciudad de Panam\u00e1|Colon|Col\u00f3n|Chiriqui|David)/i);
    if (cityMatch) parts.push(cityMatch[0]);
  }
  if (p.therapeutic_areas && p.therapeutic_areas.length > 0) {
    parts.push(p.therapeutic_areas[0]);
  } else if (p.cphi_category !== null) {
    parts.push(p.cphi_category);
  }
  return parts.join(" · ");
}

export function PartnerDetailModal({ rank, partner: p, onClose }: Props) {
  const overview = buildOverview(p);
  const categoryTag = buildCategoryTag(p);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[640px] rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => { e.stopPropagation(); }}
      >
        {/* 닫기 */}
        <button
          type="button"
          className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          onClick={onClose}
          aria-label="닫기"
        >
          ×
        </button>

        {/* 헤더: 순번 + 기업명 */}
        <div className="mb-3">
          <div className="flex items-baseline gap-3">
            <span className="text-[22px] font-extrabold text-[#4a5a6f]">{rank}</span>
            <h2 className="text-[18px] font-extrabold tracking-[-0.02em] text-navy">
              {p.company_name}
            </h2>
          </div>

          {/* 카테고리 태그 + 국가 뱃지 */}
          <div className="mt-1.5 flex items-center gap-2 text-[11px]">
            {categoryTag !== "" && (
              <span className="text-[#6b7a8f]">{categoryTag}</span>
            )}
            <span className="rounded-full bg-[#1e3a8a] px-2 py-0.5 font-bold text-white">
              Panama
            </span>
          </div>
        </div>

        <div className="space-y-5">
          {/* ── 기업 개요 ── */}
          <div>
            <h3 className="mb-1.5 text-[13px] font-extrabold text-navy">기업 개요</h3>
            <p className="text-[13px] leading-relaxed text-[#4a5a6f]">{overview}</p>
          </div>

          {/* ── 채택 이유 (제품 연관성 — LLM 생성) ── */}
          {p.product_relevance_reason !== null && p.product_relevance_reason !== "" && (
            <div>
              <h3 className="mb-1.5 text-[13px] font-extrabold text-navy">채택 이유</h3>
              <p className="text-[13px] leading-relaxed text-[#4a5a6f]">
                {p.product_relevance_reason}
              </p>
            </div>
          )}

          {/* ── 연락처 ── */}
          <div>
            <h3 className="mb-2 text-[13px] font-extrabold text-navy">연락처</h3>
            <dl className="grid grid-cols-[80px_1fr] gap-x-3 gap-y-1.5 text-[13px]">
              <dt className="font-semibold text-[#273f60]">주소</dt>
              <dd className="text-[#4a5a6f]">{dash(p.address)}</dd>

              <dt className="font-semibold text-[#273f60]">전화</dt>
              <dd className="text-[#4a5a6f]">{dash(p.phone)}</dd>

              <dt className="font-semibold text-[#273f60]">팩스</dt>
              <dd className="text-[#4a5a6f]">{dash(p.fax)}</dd>

              <dt className="font-semibold text-[#273f60]">이메일</dt>
              <dd className="break-all text-[#4a5a6f]">{dash(p.email)}</dd>

              <dt className="font-semibold text-[#273f60]">웹사이트</dt>
              <dd>
                {p.website !== null ? (
                  <a
                    href={p.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all text-blue-600 underline underline-offset-2"
                  >
                    {p.website}
                  </a>
                ) : (
                  <span className="text-[#4a5a6f]">—</span>
                )}
              </dd>

              <dt className="font-semibold text-[#273f60]">부스</dt>
              <dd className="text-[#4a5a6f]">{dash(p.booth)}</dd>
            </dl>
          </div>

          {/* ── 기업 규모 ── */}
          <div>
            <h3 className="mb-2 text-[13px] font-extrabold text-navy">기업 규모</h3>
            <dl className="grid grid-cols-[80px_1fr] gap-x-3 gap-y-1.5 text-[13px]">
              <dt className="font-semibold text-[#273f60]">설립연도</dt>
              <dd className="text-[#4a5a6f]">{dash(p.founded_year)}</dd>

              <dt className="font-semibold text-[#273f60]">연매출</dt>
              <dd className="text-[#4a5a6f]">{fmtRevenue(p.revenue_usd)}</dd>

              <dt className="font-semibold text-[#273f60]">임직원</dt>
              <dd className="text-[#4a5a6f]">
                {p.employee_count !== null ? `${p.employee_count}명` : "—"}
              </dd>

              <dt className="font-semibold text-[#273f60]">사업 지역</dt>
              <dd className="text-[#4a5a6f]">{fmtList(p.business_regions)}</dd>
            </dl>
          </div>

          {/* ── 역량 · 실적 (SG 양식 분리) ── */}
          <div>
            <h3 className="mb-2 text-[13px] font-extrabold text-navy">역량 · 실적</h3>
            <dl className="grid grid-cols-[80px_1fr] gap-x-3 gap-y-1.5 text-[13px]">
              <dt className="font-semibold text-[#273f60]">수입 이력</dt>
              <dd className="text-[#4a5a6f]">
                {p.import_history === true ? (
                  <span className="text-emerald-600 font-bold">✓ 있음</span>
                ) : p.import_history === false ? (
                  <span className="text-[#aab5c4]">✗ 없음</span>
                ) : "—"}
                {p.import_history_detail !== null && p.import_history_detail !== "" && (
                  <span className="ml-2 text-[11px] text-[#7a8fa8]">({p.import_history_detail})</span>
                )}
              </dd>

              <dt className="font-semibold text-[#273f60]">제조소 보유</dt>
              <dd className="text-[#4a5a6f]">
                {p.gmp_certified === true ? (
                  <span className="text-emerald-600 font-bold">✓ 있음 (GMP)</span>
                ) : p.gmp_certified === false ? (
                  <span className="text-[#aab5c4]">✗ 없음</span>
                ) : "—"}
              </dd>

              <dt className="font-semibold text-[#273f60]">MAH 역량</dt>
              <dd className="text-[#4a5a6f]">
                {p.mah_capable === true ? (
                  <span className="text-emerald-600 font-bold">✓ 보유</span>
                ) : p.mah_capable === false ? (
                  <span className="text-[#aab5c4]">✗ 미보유</span>
                ) : "—"}
              </dd>

              <dt className="font-semibold text-[#273f60]">공공 조달</dt>
              <dd className="text-[#4a5a6f]">
                {p.public_procurement_wins !== null
                  ? `낙찰 ${p.public_procurement_wins}건`
                  : "—"}
              </dd>

              <dt className="font-semibold text-[#273f60]">치료 영역</dt>
              <dd className="text-[#4a5a6f]">{fmtList(p.therapeutic_areas)}</dd>
            </dl>
          </div>

          {/* ── 채널 · 파트너 적합성 (SG 양식 분리) ── */}
          <div>
            <h3 className="mb-2 text-[13px] font-extrabold text-navy">채널 · 파트너 적합성</h3>
            <dl className="grid grid-cols-[80px_1fr] gap-x-3 gap-y-1.5 text-[13px]">
              <dt className="font-semibold text-[#273f60]">민간 채널</dt>
              <dd className="text-[#4a5a6f]">
                {p.import_history === true || p.pharmacy_chain_operator === true ? (
                  <span className="text-emerald-600 font-bold">✓ 있음</span>
                ) : (
                  <span className="text-[#aab5c4]">✗ 없음</span>
                )}
              </dd>

              <dt className="font-semibold text-[#273f60]">약국 체인</dt>
              <dd className="text-[#4a5a6f]">
                {p.pharmacy_chain_operator === true ? (
                  <span className="text-emerald-600 font-bold">✓ 운영</span>
                ) : (
                  <span className="text-[#aab5c4]">✗ 미운영</span>
                )}
              </dd>

              <dt className="font-semibold text-[#273f60]">공공 채널</dt>
              <dd className="text-[#4a5a6f]">
                {p.public_procurement_wins !== null && p.public_procurement_wins > 0 ? (
                  <span className="text-emerald-600 font-bold">✓ 이력 있음</span>
                ) : (
                  <span className="text-[#aab5c4]">✗ 없음</span>
                )}
              </dd>

              <dt className="font-semibold text-[#273f60]">한국 파트너십</dt>
              <dd className="text-[#4a5a6f]">
                {p.korea_partnership === true ? (
                  <span className="text-emerald-600 font-bold">✓ 있음</span>
                ) : (
                  <span className="text-[#aab5c4]">✗ 없음</span>
                )}
                {p.korea_partnership_detail !== null && p.korea_partnership_detail !== "" && (
                  <span className="ml-2 text-[11px] text-[#7a8fa8]">({p.korea_partnership_detail})</span>
                )}
              </dd>
            </dl>
          </div>
        </div>

        {/* 출처 */}
        <p className="mt-5 text-[11px] text-[#9aafc5]">
          출처: {p.source_primary === "pharmchoices" ? "PharmChoices · Perplexity 분석" :
                 p.source_primary === "dnb_panama"   ? "D&B Panama · Perplexity 분석" :
                 p.source_primary === "manual_psi_seed" ? "수기 PSI 시드 · Perplexity 분석" :
                 "Perplexity 분석"}
        </p>
      </div>
    </div>
  );
}
