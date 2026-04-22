"use client";

import type { PartnerCandidate } from "@/src/types/phase3_partner";

interface Props {
  rank: number;
  partner: PartnerCandidate;
  onClose: () => void;
}

const CIRCLED = ["①", "②", "③", "④", "⑤"];

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

function fmtTherapeuticAreas(ta: string[] | null): string {
  if (!ta || ta.length === 0) return "—";
  return ta.join(", ");
}

function buildOverview(p: PartnerCandidate): string {
  const parts: string[] = [];
  parts.push(`${p.company_name}은(는) ${p.address ?? "파나마"}에 소재한 의약품 유통 기업입니다.`);
  if (p.revenue_usd !== null)    parts.push(`연매출 ${fmtRevenue(p.revenue_usd)}.`);
  if (p.employee_count !== null) parts.push(`임직원 ${p.employee_count}명.`);
  if (p.gmp_certified === true)  parts.push("GMP 인증 보유.");
  if (p.import_history === true) {
    const detail = p.import_history_detail ? ` (${p.import_history_detail})` : "";
    parts.push(`의약품 수입 이력 있음${detail}.`);
  }
  if (p.mah_capable === true)    parts.push("MAH(Marketing Authorization Holder) 역량 보유.");
  if (p.therapeutic_areas && p.therapeutic_areas.length > 0) {
    parts.push(`주요 치료 영역: ${fmtTherapeuticAreas(p.therapeutic_areas)}.`);
  }
  return parts.join(" ");
}

/** PSI 5대 기준을 DB 실제 데이터로 구성 — 할루시네이션 없음 */
function buildReasons(p: PartnerCandidate): { label: string; value: string }[] {
  return [
    {
      label: "매출 규모",
      value: fmtRevenue(p.revenue_usd),
    },
    {
      label: "치료 영역 적합성",
      value: fmtTherapeuticAreas(p.therapeutic_areas),
    },
    {
      label: "GMP / 제조 역량",
      value: p.gmp_certified === true ? "GMP 인증 보유" : p.gmp_certified === false ? "GMP 인증 미보유" : "확인 필요",
    },
    {
      label: "의약품 수입 이력",
      value:
        p.import_history === true
          ? (p.import_history_detail ?? "수입 이력 있음")
          : p.import_history === false
          ? "수입 이력 없음"
          : "—",
    },
    {
      label: "공공조달 낙찰 실적",
      value:
        p.public_procurement_wins !== null
          ? `${p.public_procurement_wins}건`
          : "—",
    },
  ];
}

function ScoreBar({ label, score }: { label: string; score: number | null }) {
  const pct = score !== null ? Math.min(Math.max(score, 0), 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="w-28 shrink-0 text-[11px] text-[#6b7a8f]">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-[#e8eef5]">
        <div
          className="h-1.5 rounded-full bg-navy transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 text-right text-[11px] font-bold text-navy">
        {score !== null ? score.toFixed(0) : "—"}
      </span>
    </div>
  );
}

export function PartnerDetailModal({ rank, partner: p, onClose }: Props) {
  const overview = buildOverview(p);
  const reasons  = buildReasons(p);

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

        {/* 헤더 */}
        <div className="mb-5">
          <div className="flex items-baseline gap-3">
            <span className="text-[22px] font-extrabold text-navy">{rank}</span>
            <h2 className="text-[18px] font-extrabold tracking-[-0.02em] text-navy">
              {p.company_name}
            </h2>
          </div>

          {/* 배지 */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {p.address !== null && (
              <span className="rounded-full border border-[#d9e2ef] px-2.5 py-0.5 text-[11px] font-semibold text-[#4a5a6f]">
                {p.address}
              </span>
            )}
            {p.therapeutic_areas?.slice(0, 2).map((ta, i) => (
              <span
                key={i}
                className="rounded-full border border-[#d9e2ef] bg-[#f7fafc] px-2.5 py-0.5 text-[11px] text-[#4a5a6f]"
              >
                {ta}
              </span>
            ))}
            <span className="rounded-full bg-navy px-2.5 py-0.5 text-[11px] font-extrabold text-white">
              Panama
            </span>
          </div>
        </div>

        <div className="space-y-5">
          {/* 기업 개요 */}
          <div>
            <h3 className="mb-1.5 text-[13px] font-extrabold text-navy">기업 개요</h3>
            <p className="text-[13px] leading-relaxed text-[#4a5a6f]">{overview}</p>
          </div>

          {/* 채택 이유 */}
          <div>
            <h3 className="mb-2 text-[13px] font-extrabold text-navy">채택 이유</h3>
            <div className="space-y-1.5">
              {reasons.map((r, i) => (
                <div key={i} className="flex gap-2">
                  <span className="shrink-0 text-[13px] font-bold text-navy">
                    {CIRCLED[i]}
                  </span>
                  <span className="text-[13px] text-[#4a5a6f]">
                    <strong className="text-[#273f60]">{r.label}</strong>{"  "}{r.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* PSI 점수 */}
          {(p.score_revenue !== null ||
            p.score_pipeline !== null ||
            p.score_gmp !== null ||
            p.score_import !== null ||
            p.score_pharmacy_chain !== null) && (
            <div>
              <h3 className="mb-2 text-[13px] font-extrabold text-navy">
                PSI 점수 (파트너 적합성 지수)
              </h3>
              <div className="space-y-1.5">
                <ScoreBar label="매출 규모 (35%)"     score={p.score_revenue} />
                <ScoreBar label="파이프라인 (28%)"    score={p.score_pipeline} />
                <ScoreBar label="GMP·제조 (20%)"      score={p.score_gmp} />
                <ScoreBar label="수입 이력 (12%)"     score={p.score_import} />
                <ScoreBar label="약국 체인 (5%)"      score={p.score_pharmacy_chain} />
              </div>
            </div>
          )}

          {/* 연락처 */}
          <div>
            <h3 className="mb-2 text-[13px] font-extrabold text-navy">연락처</h3>
            <dl className="grid grid-cols-[90px_1fr] gap-x-3 gap-y-1.5 text-[13px]">
              <dt className="font-semibold text-[#273f60]">주소</dt>
              <dd className="text-[#4a5a6f]">{dash(p.address)}</dd>

              <dt className="font-semibold text-[#273f60]">전화</dt>
              <dd className="text-[#4a5a6f]">{dash(p.phone)}</dd>

              <dt className="font-semibold text-[#273f60]">이메일</dt>
              <dd className="break-all text-[#4a5a6f]">{dash(p.email)}</dd>

              <dt className="font-semibold text-[#273f60]">홈페이지</dt>
              <dd>
                {p.website ? (
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

              <dt className="font-semibold text-[#273f60]">창립 연도</dt>
              <dd className="text-[#4a5a6f]">{dash(p.founded_year)}</dd>
            </dl>
          </div>

          {/* 기업 규모 */}
          <div>
            <h3 className="mb-2 text-[13px] font-extrabold text-navy">기업 규모</h3>
            <dl className="grid grid-cols-[90px_1fr] gap-x-3 gap-y-1.5 text-[13px]">
              <dt className="font-semibold text-[#273f60]">연매출</dt>
              <dd className="text-[#4a5a6f]">{fmtRevenue(p.revenue_usd)}</dd>

              <dt className="font-semibold text-[#273f60]">임직원</dt>
              <dd className="text-[#4a5a6f]">
                {p.employee_count !== null ? `${p.employee_count}명` : "—"}
              </dd>
            </dl>
          </div>

          {/* 채널·파트너 적합성 */}
          <div>
            <h3 className="mb-2 text-[13px] font-extrabold text-navy">채널 · 파트너 적합성</h3>
            <div className="grid grid-cols-2 gap-2 text-[13px]">
              {[
                { label: "공공 채널",      value: p.public_procurement_wins !== null && p.public_procurement_wins > 0 },
                { label: "민간 채널",      value: p.pharmacy_chain_operator === true || p.import_history === true },
                { label: "GMP 인증",       value: p.gmp_certified === true },
                { label: "MAH 역량",       value: p.mah_capable === true },
                { label: "한국 파트너십",  value: p.korea_partnership === true },
                { label: "약국 체인 운영", value: p.pharmacy_chain_operator === true },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center gap-2">
                  <span
                    className={`text-[13px] font-bold ${
                      value ? "text-emerald-600" : "text-[#aab5c4]"
                    }`}
                  >
                    {value ? "✓ 있음" : "✗ 없음 / 미확인"}
                  </span>
                  <span className="text-[#6b7a8f]">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 출처 */}
        <p className="mt-5 text-[11px] text-[#9aafc5]">
          ※ 출처: {p.source_primary ?? "Panama 파트너 DB"} / PSI 알고리즘 분석
        </p>
      </div>
    </div>
  );
}
