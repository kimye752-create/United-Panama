"use client";

import { useCallback, useEffect, useState } from "react";

import { PartnerDetailModal } from "@/components/main-preview/PartnerDetailModal";
import type { PartnerCandidate } from "@/src/types/phase3_partner";
import type { SessionListItem } from "@/app/api/panama/report/sessions/route";
import { TARGET_PRODUCTS } from "@/src/utils/product-dictionary";

interface Props {
  sessionId: string | null;
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

/** 주력상품 요약 — registered_products 최대 2개 또는 therapeutic_areas[0] */
function mainProductSummary(p: PartnerCandidate): string {
  if (p.registered_products && p.registered_products.length > 0) {
    return p.registered_products.slice(0, 2).join(", ");
  }
  if (p.therapeutic_areas && p.therapeutic_areas.length > 0) {
    return p.therapeutic_areas[0];
  }
  return "—";
}

export function PartnerSection({ sessionId }: Props) {
  const [sessions,          setSessions]         = useState<SessionListItem[]>([]);
  const [sessionsLoading,   setSessionsLoading]  = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");

  const [loading,  setLoading]  = useState(false);
  const [partners, setPartners] = useState<PartnerCandidate[] | null>(null);

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
        body: JSON.stringify({ sessionId: selectedSessionId, weightedCriteria: {} }),
      });
      const data: unknown = await res.json();
      if (!res.ok) throw new Error((data as { detail?: string }).detail ?? "PARTNER_FAILED");
      const ok = data as { partnerData?: { partners?: unknown[]; top10?: unknown[] } };
      // partners 우선, 없으면 top10 하위호환
      const list = (ok.partnerData?.partners ?? ok.partnerData?.top10 ?? []) as PartnerCandidate[];
      setPartners(list);
      await fetchSessions();
    } catch { /* 실패 무시 */ }
    finally  { setLoading(false); }
  }

  const canRun = selectedSessionId !== "" && !loading;

  // 선택 세션의 품목 INN 조회
  const selectedSession = sessions.find((s) => s.sessionId === selectedSessionId) ?? null;
  const selectedProduct = selectedSession !== null
    ? (TARGET_PRODUCTS.find((p) => p.product_id === selectedSession.productId) ?? null)
    : null;

  return (
    <section className="rounded-[20px] bg-white shadow-sh">
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
              <><span className="animate-spin">⟳</span> 발굴 중...</>
            ) : (
              <>▶ 바이어 발굴</>
            )}
          </button>
        </div>

        {/* 로딩 */}
        {loading && (
          <div className="mt-2 flex items-center gap-2 text-[12px] text-[#7a8fa8]">
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[#d9e2ef] border-t-navy" />
            Perplexity 웹 검색으로 기업 정보 수집 중…
          </div>
        )}

        {/* ── 컬럼 헤더 ── */}
        {(loading || (partners !== null && partners.length > 0)) && (
          <div className="mt-2 grid grid-cols-[24px_1fr_1fr_90px] gap-x-2 border-b border-[#e8eef5] pb-1 text-[11px] font-bold uppercase tracking-widest text-[#9aafc5]">
            <span>#</span>
            <span>기업명</span>
            <span>주력상품</span>
            <span>이메일</span>
          </div>
        )}

        {/* ── 스켈레톤 ── */}
        {loading && (
          <div className="space-y-0">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className={`grid grid-cols-[24px_1fr_1fr_90px] gap-x-2 py-2.5 ${i > 0 ? "border-t border-[#f0f4f9]" : ""}`}>
                <span className="text-[12px] text-[#c4cdd8]">{i + 1}</span>
                <div className="h-3 w-4/5 animate-pulse rounded bg-[#e8eef5]" />
                <div className="h-3 w-3/5 animate-pulse rounded bg-[#e8eef5]" />
                <div className="h-3 w-full animate-pulse rounded bg-[#e8eef5]" />
              </div>
            ))}
          </div>
        )}

        {/* ── 바이어 목록 ── */}
        {!loading && partners !== null && partners.length > 0 && (
          <div>
            {partners.map((partner, idx) => {
              const isEven = idx % 2 === 1;
              return (
                <button
                  type="button"
                  key={partner.id}
                  className={`grid w-full grid-cols-[24px_1fr_1fr_90px] gap-x-2 py-2.5 text-left transition-colors hover:bg-[#f7fafc] ${
                    idx > 0 ? "border-t border-[#f0f4f9]" : ""
                  }`}
                  onClick={() => { setDetailPartner({ rank: idx + 1, partner }); }}
                >
                  <span className="text-[12px] font-bold text-[#c4cdd8]">{idx + 1}</span>
                  <p className={`truncate text-[13px] ${
                    isEven ? "font-extrabold text-navy" : "font-semibold text-[#1a2e4a]"
                  }`}>
                    {partner.company_name}
                  </p>
                  <p className="truncate text-[12px] text-[#6b7a8f]">
                    {mainProductSummary(partner)}
                  </p>
                  <p className="truncate text-[11px] text-[#9aafc5]">
                    {partner.email ?? "—"}
                  </p>
                </button>
              );
            })}
          </div>
        )}

        {/* ── 빈 상태 ── */}
        {!loading && partners !== null && partners.length === 0 && (
          <p className="py-5 text-center text-[13px] text-[#7a8fa8]">
            조건에 맞는 바이어가 없습니다.
          </p>
        )}
      </div>

      {/* 상세 모달 */}
      {detailPartner !== null && (
        <PartnerDetailModal
          rank={detailPartner.rank}
          partner={detailPartner.partner}
          onClose={() => { setDetailPartner(null); }}
          productInn={selectedProduct?.who_inn_en ?? null}
          productName={selectedProduct?.kr_brand_name ?? null}
        />
      )}
    </section>
  );
}
