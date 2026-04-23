"use client";

import type { PartnerCandidate } from "@/src/types/phase3_partner";

interface Props {
  rank: number;
  partner: PartnerCandidate;
  onClose: () => void;
  productInn?: string | null;
  productName?: string | null;
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

/** 기업 개요 — 실제 데이터만 조합 */
function buildOverview(p: PartnerCandidate): string {
  const parts: string[] = [];
  const loc = p.address ?? "파나마";
  parts.push(`${p.company_name}은(는) ${loc}에 소재한 의약품 유통·판매 기업입니다.`);
  if (p.founded_year !== null) parts.push(`${p.founded_year}년 설립.`);
  if (p.revenue_usd !== null)  parts.push(`연매출 ${fmtRevenue(p.revenue_usd)}.`);
  if (p.employee_count !== null) parts.push(`임직원 ${p.employee_count}명.`);
  if (p.therapeutic_areas && p.therapeutic_areas.length > 0) {
    parts.push(`주력 치료 영역: ${p.therapeutic_areas.join(", ")}.`);
  }
  if (p.import_history === true) {
    const detail = p.import_history_detail ? ` (${p.import_history_detail})` : "";
    parts.push(`의약품 수입 이력 보유${detail}.`);
  }
  if (p.mah_capable === true) parts.push("MAH(Marketing Authorization Holder) 역량 보유.");
  return parts.join(" ");
}

/** 추천 이유 라인 파싱 — "① [파이프라인] ..." 형태 */
function parseReasons(text: string): { icon: string; label: string; body: string }[] {
  const icons: Record<string, string> = {
    "파이프라인": "🔬", "수입이력": "🚢", "수입 이력": "🚢",
    "유통채널": "🏪", "유통 채널": "🏪",
    "mah역량": "📋", "mah 역량": "📋",
    "기업안정성": "🏢", "기업 안정성": "🏢",
  };
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);
  const result: { icon: string; label: string; body: string }[] = [];
  for (const line of lines) {
    const m = line.match(/^[①②③④⑤1-5][.)]\s*\[(.+?)\]\s*(.+)$/);
    if (m) {
      const labelKey = m[1].trim().toLowerCase();
      result.push({
        icon:  icons[labelKey] ?? "📌",
        label: m[1].trim(),
        body:  m[2].trim(),
      });
    }
  }
  return result.length > 0 ? result : [{ icon: "📌", label: "적합성 평가", body: text }];
}

export function PartnerDetailModal({ rank, partner: p, onClose, productInn, productName }: Props) {
  const overview = buildOverview(p);
  const reasons  = p.product_relevance_reason ? parseReasons(p.product_relevance_reason) : [];

  const pipeline = p.registered_products ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[660px] rounded-2xl bg-white p-6 shadow-2xl"
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

        {/* ── 헤더 ── */}
        <div className="mb-4">
          <div className="flex items-baseline gap-3">
            <span className="text-[22px] font-extrabold text-[#4a5a6f]">{rank}</span>
            <h2 className="text-[18px] font-extrabold tracking-[-0.02em] text-navy">
              {p.company_name}
            </h2>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px]">
            {p.therapeutic_areas && p.therapeutic_areas.length > 0 && (
              <span className="text-[#6b7a8f]">{p.therapeutic_areas[0]}</span>
            )}
            <span className="rounded-full bg-navy px-2 py-0.5 font-bold text-white">Panama</span>
          </div>
        </div>

        <div className="space-y-5">

          {/* ── 1. 기업 개요 ── */}
          <div>
            <SectionTitle>기업 개요</SectionTitle>
            <p className="text-[13px] leading-relaxed text-[#4a5a6f]">{overview}</p>
          </div>

          {/* ── 2. 적합성 평가 (5가지 기준) ── */}
          {reasons.length > 0 && (
            <div>
              <SectionTitle>적합성 평가</SectionTitle>
              <ol className="space-y-2">
                {reasons.map((r, i) => (
                  <li key={i} className="flex gap-2 text-[13px]">
                    <span className="mt-0.5 shrink-0 text-[15px]">{r.icon}</span>
                    <span>
                      <span className="font-bold text-navy">[{r.label}]</span>{" "}
                      <span className="text-[#4a5a6f]">{r.body}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* ── 3. 기본 정보 테이블 ── */}
          <div>
            <SectionTitle>기본 정보</SectionTitle>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[12px]">
                <thead>
                  <tr className="border-b border-[#e8eef5] bg-[#f7fafc]">
                    {["주소", "연락처", "설립 연도", "홈페이지", "파이프라인"].map((h) => (
                      <th key={h} className="px-2.5 py-1.5 text-left font-bold text-[#273f60]">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[#f0f4f9]">
                    <td className="px-2.5 py-2 text-[#4a5a6f]">{dash(p.address)}</td>
                    <td className="px-2.5 py-2 text-[#4a5a6f]">
                      {p.phone ?? p.email ?? "—"}
                    </td>
                    <td className="px-2.5 py-2 text-[#4a5a6f]">{dash(p.founded_year)}</td>
                    <td className="px-2.5 py-2">
                      {p.website ? (
                        <a
                          href={p.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="break-all text-blue-600 underline underline-offset-2"
                        >
                          {p.website.replace(/^https?:\/\//, "")}
                        </a>
                      ) : (
                        <span className="text-[#4a5a6f]">—</span>
                      )}
                    </td>
                    <td className="px-2.5 py-2 text-[#4a5a6f]">
                      {pipeline.length > 0 ? pipeline.slice(0, 3).join(", ") : "—"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            {/* 상세 연락처 */}
            {(p.phone || p.fax || p.email) && (
              <dl className="mt-2 grid grid-cols-[60px_1fr] gap-x-2 gap-y-0.5 text-[12px]">
                {p.phone && <><dt className="font-semibold text-[#273f60]">전화</dt><dd className="text-[#4a5a6f]">{p.phone}</dd></>}
                {p.fax   && <><dt className="font-semibold text-[#273f60]">팩스</dt><dd className="text-[#4a5a6f]">{p.fax}</dd></>}
                {p.email && <><dt className="font-semibold text-[#273f60]">이메일</dt><dd className="break-all text-[#4a5a6f]">{p.email}</dd></>}
              </dl>
            )}
          </div>

          {/* ── 4. 기업 규모 ── */}
          {(p.revenue_usd !== null || p.employee_count !== null) && (
            <div>
              <SectionTitle>기업 규모</SectionTitle>
              <p className="text-[13px] text-[#4a5a6f]">
                {p.revenue_usd !== null && <span>매출 {fmtRevenue(p.revenue_usd)}</span>}
                {p.revenue_usd !== null && p.employee_count !== null && <span className="mx-2 text-[#c4cdd8]">·</span>}
                {p.employee_count !== null && <span>임직원 {p.employee_count}명</span>}
              </p>
            </div>
          )}

          {/* ── 5. 등록 제품 ── */}
          {pipeline.length > 0 && (
            <div>
              <SectionTitle>등록 제품</SectionTitle>
              <ul className="flex flex-wrap gap-1.5">
                {pipeline.map((prod, i) => (
                  <li
                    key={i}
                    className="rounded-full bg-[#edf1f7] px-2.5 py-0.5 text-[12px] text-[#273f60]"
                  >
                    {prod}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ── 6. 역량 요약 ── */}
          <div>
            <SectionTitle>역량 요약</SectionTitle>
            <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-[12px]">
              <CapBadge label="수입 이력"  active={p.import_history}          detail={p.import_history_detail} />
              <CapBadge label="GMP 인증"   active={p.gmp_certified} />
              <CapBadge label="MAH 역량"   active={p.mah_capable} />
              <CapBadge label="약국 체인"  active={p.pharmacy_chain_operator} />
              {p.public_procurement_wins !== null && p.public_procurement_wins > 0 && (
                <span className="text-emerald-700 font-semibold">
                  공공조달 낙찰 {p.public_procurement_wins}건
                </span>
              )}
              {p.korea_partnership === true && (
                <span className="text-emerald-700 font-semibold">
                  한국 파트너십 {p.korea_partnership_detail ? `(${p.korea_partnership_detail})` : ""}
                </span>
              )}
            </div>
          </div>

          {/* ── 성분 매칭 ── */}
          {productInn && pipeline.length > 0 && (() => {
            const innLower = productInn.toLowerCase().replace(/\s+/g, "");
            const matched = pipeline.filter((prod) => {
              const pl = prod.toLowerCase().replace(/\s+/g, "");
              return pl.includes(innLower) || innLower.includes(pl.slice(0, 6));
            });
            return matched.length > 0 ? (
              <div>
                <SectionTitle>성분 매칭</SectionTitle>
                <p className="text-[13px] text-[#4a5a6f]">
                  수출 품목 <span className="font-semibold text-navy">{productName ?? productInn}</span>
                  {" "}({productInn})과 일치하는 취급 제품:{" "}
                  <span className="font-semibold text-emerald-700">{matched.join(", ")}</span>
                </p>
              </div>
            ) : null;
          })()}

        </div>

        {/* 출처 */}
        <p className="mt-5 text-[11px] text-[#9aafc5]">
          * 출처: Perplexity 웹 검색 분석 · PharmChoices Panama
        </p>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-1.5 text-[13px] font-extrabold text-navy">{children}</h3>
  );
}

function CapBadge({
  label,
  active,
  detail,
}: {
  label: string;
  active: boolean | null;
  detail?: string | null;
}) {
  if (active === true) {
    return (
      <span className="text-emerald-700 font-semibold">
        ✓ {label}{detail ? ` (${detail})` : ""}
      </span>
    );
  }
  if (active === false) {
    return <span className="text-[#aab5c4]">✗ {label}</span>;
  }
  return null; // null이면 표시 안 함
}
