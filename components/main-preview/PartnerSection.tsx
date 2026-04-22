"use client";

import { useCallback, useEffect, useState } from "react";

import { PartnerDetailModal } from "@/components/main-preview/PartnerDetailModal";
import type { PartnerCandidate } from "@/src/types/phase3_partner";
import type { SessionListItem } from "@/app/api/panama/report/sessions/route";

interface Props {
  sessionId: string | null;
}

type Criterion = "revenue" | "pipeline" | "gmp" | "import" | "pharmacy_chain";

const CRITERIA: { key: Criterion; label: string; circled: string; weight: number }[] = [
  { key: "revenue",        label: "매출 규모",      circled: "①", weight: 0.35 },
  { key: "pipeline",       label: "파이프라인",     circled: "②", weight: 0.28 },
  { key: "gmp",            label: "GMP 인증",       circled: "③", weight: 0.20 },
  { key: "import",         label: "수입 이력",      circled: "④", weight: 0.12 },
  { key: "pharmacy_chain", label: "약국 체인 운영", circled: "⑤", weight: 0.05 },
];

function calcPsi(partner: PartnerCandidate, active: Set<Criterion>): number {
  let score = 0;
  let totalWeight = 0;
  for (const c of CRITERIA) {
    if (!active.has(c.key)) continue;
    const v =
      c.key === "revenue"        ? (partner.score_revenue        ?? 0)
      : c.key === "pipeline"     ? (partner.score_pipeline       ?? 0)
      : c.key === "gmp"          ? (partner.score_gmp            ?? 0)
      : c.key === "import"       ? (partner.score_import         ?? 0)
      :                            (partner.score_pharmacy_chain ?? 0);
    score       += v * c.weight;
    totalWeight += c.weight;
  }
  return totalWeight > 0 ? score / totalWeight : 0;
}

/** ISO → "MM. DD. 오전/오후 HH:MM" */
function fmtDate(iso: string): string {
  try {
    const d    = new Date(iso);
    const mm   = String(d.getMonth() + 1).padStart(2, "0");
    const dd   = String(d.getDate()).padStart(2, "0");
    const h    = d.getHours();
    const ampm = h < 12 ? "오전" : "오후";
    const hh   = String(h % 12 || 12).padStart(2, "0");
    const min  = String(d.getMinutes()).padStart(2, "0");
    return `${mm}. ${dd}. ${ampm} ${hh}:${min}`;
  } catch {
    return iso.slice(0, 10);
  }
}

function SkeletonRow({ n }: { n: number }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-[#edf1f7] px-4 py-3">
      <span className="w-5 shrink-0 text-[13px] font-bold text-[#c4cdd8]">{n}</span>
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-3/5 animate-pulse rounded bg-[#e8eef5]" />
        <div className="h-2.5 w-2/5 animate-pulse rounded bg-[#f0f4f9]" />
      </div>
      <div className="h-5 w-16 animate-pulse rounded-full bg-[#e8eef5]" />
    </div>
  );
}

export function PartnerSection({ sessionId }: Props) {
  const [sessions,           setSessions]          = useState<SessionListItem[]>([]);
  const [sessionsLoading,    setSessionsLoading]   = useState(false);
  const [selectedSessionId,  setSelectedSessionId] = useState<string>("");

  const [loading,   setLoading]   = useState(false);
  const [partners,  setPartners]  = useState<PartnerCandidate[] | null>(null);

  const [activeCriteria, setActiveCriteria] = useState<Set<Criterion>>(
    new Set<Criterion>(["revenue", "pipeline", "gmp", "import", "pharmacy_chain"]),
  );

  const [detailPartner, setDetailPartner] = useState<{
    rank: number; partner: PartnerCandidate;
  } | null>(null);

  // ── 세션 목록 조회 ─────────────────────────────────────────────
  const fetchSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const res  = await fetch("/api/panama/report/sessions");
      if (!res.ok) return;
      const data = (await res.json()) as { items?: SessionListItem[] };
      setSessions(data.items ?? []);
    } catch { /* 무시 */ }
    finally  { setSessionsLoading(false); }
  }, []);

  useEffect(() => { void fetchSessions(); }, [fetchSessions]);

  // PricingSection에서 sessionId 전달되면 자동 선택
  useEffect(() => {
    if (sessionId === null) return;
    void fetchSessions().then(() => {
      setSelectedSessionId(sessionId);
      setPartners(null);
    });
  }, [sessionId, fetchSessions]);

  // ── 바이어 발굴 실행 ───────────────────────────────────────────
  async function handleRunPartner() {
    if (selectedSessionId === "") return;
    setLoading(true);
    setPartners(null);
    try {
      const res  = await fetch("/api/panama/report/partner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: selectedSessionId,
          weightedCriteria: Object.fromEntries(
            CRITERIA.filter((c) => activeCriteria.has(c.key)).map((c) => [c.key, c.weight]),
          ),
        }),
      });
      const data: unknown = await res.json();
      if (!res.ok) throw new Error((data as { detail?: string }).detail ?? "PARTNER_FAILED");
      const ok    = data as { partnerData?: { top10?: unknown[] } };
      const top10 = (ok.partnerData?.top10 ?? []) as PartnerCandidate[];
      setPartners(top10);
      await fetchSessions();
    } catch { /* 실패 무시 */ }
    finally  { setLoading(false); }
  }

  // ── 기준 토글 ──────────────────────────────────────────────────
  function toggleCriterion(key: Criterion) {
    setActiveCriteria((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size > 1) next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  // ── 정렬 ───────────────────────────────────────────────────────
  const sortedPartners =
    partners !== null
      ? [...partners].sort(
          (a, b) => calcPsi(b, activeCriteria) - calcPsi(a, activeCriteria),
        )
      : null;

  const canRun = selectedSessionId !== "" && !loading;

  return (
    <section className="rounded-xl border border-[#d9e2ef] bg-white shadow-sh2">
      {/* 헤더 */}
      <div className="flex items-center gap-2.5 border-b border-[#edf1f7] px-5 py-3.5">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy text-[11px] font-extrabold text-white">
          02
        </span>
        <h2 className="text-[15px] font-extrabold tracking-[-0.02em] text-[#1a2e4a]">
          바이어 발굴
        </h2>
      </div>

      <div className="p-4">
        {/* 드롭다운 + 실행 버튼 */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="min-w-0 flex-1 rounded-lg border border-[#d9e2ef] bg-white px-3 py-2 text-[13px] text-[#273f60] shadow-sm focus:outline-none focus:ring-2 focus:ring-navy/30"
            value={selectedSessionId}
            onChange={(e) => {
              setSelectedSessionId(e.target.value);
              setPartners(null);
            }}
          >
            <option value="">
              {sessionsLoading ? "불러오는 중..." : "시장조사 보고서를 선택하세요."}
            </option>
            {sessions.map((s) => (
              <option key={s.sessionId} value={s.sessionId}>
                시장조사 보고서 · {s.productName} · {fmtDate(s.createdAt)}
                {s.partnerCompleted ? " ✓" : ""}
              </option>
            ))}
          </select>

          <button
            type="button"
            disabled={!canRun}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-navy px-4 py-2 text-[13px] font-extrabold text-white shadow-sm transition-opacity disabled:opacity-40"
            onClick={() => { void handleRunPartner(); }}
          >
            {loading ? (
              <><span className="animate-spin">⟳</span> 바이어 발굴</>
            ) : (
              <>▶ 바이어 발굴</>
            )}
          </button>
        </div>

        {/* 로딩 인디케이터 텍스트 */}
        {loading && (
          <div className="mt-2 flex items-center gap-2 text-[12px] text-[#7a8fa8]">
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[#d9e2ef] border-t-navy" />
            바이어 발굴 중…
          </div>
        )}

        {/* ── 평가 기준 체크박스 (로딩 중이거나 결과 있을 때) ── */}
        {(loading || sortedPartners !== null) && (
          <div className="mt-3 rounded-lg border border-[#edf1f7] bg-[#f8fafc] px-3 py-2.5">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#9aafc5]">
                평가 기준
              </span>
              <button
                type="button"
                className="text-[11px] text-[#7a8fa8] underline underline-offset-1 hover:text-navy"
                onClick={() => {
                  const allActive = CRITERIA.every((c) => activeCriteria.has(c.key));
                  if (allActive) {
                    setActiveCriteria(new Set<Criterion>(["revenue"]));
                  } else {
                    setActiveCriteria(new Set<Criterion>(CRITERIA.map((c) => c.key)));
                  }
                }}
              >
                {CRITERIA.every((c) => activeCriteria.has(c.key)) ? "전체 해제" : "전체 선택"}
              </button>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              {CRITERIA.map((c) => {
                const active = activeCriteria.has(c.key);
                return (
                  <label
                    key={c.key}
                    className="flex cursor-pointer items-center gap-1 text-[12px] text-[#4a5a6f] select-none"
                  >
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => { toggleCriterion(c.key); }}
                      className="h-3.5 w-3.5 accent-navy"
                    />
                    <span className="font-semibold text-navy">{c.circled}</span>
                    {c.label}
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* ── 스켈레톤 ── */}
        {loading && (
          <div className="mt-3 space-y-2">
            {Array.from({ length: 8 }, (_, i) => (
              <SkeletonRow key={i} n={i + 1} />
            ))}
          </div>
        )}

        {/* ── 바이어 목록 ── */}
        {!loading && sortedPartners !== null && (
          <div className="mt-3 space-y-1.5">
            {sortedPartners.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-[#7a8fa8]">
                조건에 맞는 바이어가 없습니다.
              </p>
            ) : (
              sortedPartners.map((partner, idx) => {
                const psi = calcPsi(partner, activeCriteria);
                return (
                  <button
                    type="button"
                    key={partner.id}
                    className="flex w-full items-center gap-3 rounded-lg border border-[#edf1f7] bg-white px-4 py-3 text-left transition-all hover:border-navy/30 hover:bg-[#f7fafc] hover:shadow-sm"
                    onClick={() => { setDetailPartner({ rank: idx + 1, partner }); }}
                  >
                    <span className="w-5 shrink-0 text-[13px] font-extrabold text-navy">
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-extrabold text-navy">
                        {partner.company_name}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-[#7a8fa8]">
                        {partner.address ?? "Panama City"}
                        {partner.therapeutic_areas && partner.therapeutic_areas.length > 0
                          ? " · " + partner.therapeutic_areas.slice(0, 2).join(", ")
                          : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-0.5">
                      <span className="rounded-full bg-navy/10 px-2 py-0.5 text-[11px] font-extrabold text-navy">
                        PSI {psi.toFixed(1)}
                      </span>
                      {partner.email !== null && (
                        <span className="max-w-[120px] truncate text-[10px] text-[#aab5c4]">
                          {partner.email}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}

        {/* ── 빈 상태 ── */}
        {!loading && sortedPartners === null && (
          <p className="mt-4 rounded-lg border border-dashed border-[#d9e2ef] py-6 text-center text-[13px] text-[#7a8fa8]">
            품목 선택 후 ▶ 바이어 발굴을 실행하세요.
          </p>
        )}
      </div>

      {/* 기업 상세 모달 */}
      {detailPartner !== null && (
        <PartnerDetailModal
          rank={detailPartner.rank}
          partner={detailPartner.partner}
          onClose={() => { setDetailPartner(null); }}
        />
      )}
    </section>
  );
}
