"use client";

import { useCallback, useEffect, useState } from "react";

import { PartnerDetailModal } from "@/components/main-preview/PartnerDetailModal";
import type { PartnerCandidate } from "@/src/types/phase3_partner";
import type { SessionListItem } from "@/app/api/panama/report/sessions/route";
import { TARGET_PRODUCTS } from "@/src/utils/product-dictionary";

interface Props {
  sessionId: string | null;
}

/** 기업 평가 기준 — SG 팀장 대시보드 동일 */
const CRITERIA_OPTIONS = [
  { key: "revenue",     label: "① 매출규모" },
  { key: "pipeline",    label: "② 파이프라인" },
  { key: "plant",       label: "③ 제조소 보유" },
  { key: "importExp",   label: "④ 수입 경험" },
  { key: "pharmacy",    label: "⑤ 약국체인 운영" },
] as const;
type CriterionKey = typeof CRITERIA_OPTIONS[number]["key"];

export function PartnerSection({ sessionId }: Props) {
  const [sessions,          setSessions]         = useState<SessionListItem[]>([]);
  const [sessionsLoading,   setSessionsLoading]  = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");

  const [loading,  setLoading]  = useState(false);
  const [partners, setPartners] = useState<PartnerCandidate[] | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [criteria, setCriteria] = useState<Record<CriterionKey, boolean>>({
    revenue:   false,
    pipeline:  false,
    plant:     false,
    importExp: false,
    pharmacy:  false,
  });

  const [downloading, setDownloading] = useState(false);

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
    setErrorMsg(null);
    try {
      const res  = await fetch("/api/panama/report/partner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: selectedSessionId, weightedCriteria: criteria }),
      });
      const data: unknown = await res.json();
      if (!res.ok) {
        const d = data as { detail?: string; error?: string };
        throw new Error(d.detail ?? d.error ?? `HTTP ${res.status}`);
      }
      const ok = data as { partnerData?: { partners?: unknown[]; top10?: unknown[] } };
      const list = (ok.partnerData?.partners ?? ok.partnerData?.top10 ?? []) as PartnerCandidate[];
      setPartners(list);
      await fetchSessions();
      window.dispatchEvent(new CustomEvent("panama:reports:refresh"));
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "알 수 없는 오류");
    }
    finally { setLoading(false); }
  }

  // ── 최종 보고서 다운로드 ───────────────────────────────────────
  async function handleDownloadFinal() {
    if (selectedSessionId === "") return;
    setDownloading(true);
    try {
      const res = await fetch(
        `/api/panama/report/combined?session_id=${encodeURIComponent(selectedSessionId)}`,
      );
      if (!res.ok) {
        const d = (await res.json()) as { detail?: string; error?: string };
        throw new Error(d.detail ?? d.error ?? `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      const sess = sessions.find((s) => s.sessionId === selectedSessionId);
      a.download = `파나마_최종보고서_${sess?.productName ?? "report"}_${selectedSessionId.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "다운로드 실패");
    }
    finally { setDownloading(false); }
  }

  const canRun       = selectedSessionId !== "" && !loading;
  const canDownload  = selectedSessionId !== "" && partners !== null && partners.length > 0 && !downloading;

  const selectedSession = sessions.find((s) => s.sessionId === selectedSessionId) ?? null;
  const selectedProduct = selectedSession !== null
    ? (TARGET_PRODUCTS.find((p) => p.product_id === selectedSession.productId) ?? null)
    : null;

  const toggleCriterion = (k: CriterionKey) => {
    setCriteria((prev) => ({ ...prev, [k]: !prev[k] }));
  };
  const resetCriteria = () => {
    setCriteria({ revenue: false, pipeline: false, plant: false, importExp: false, pharmacy: false });
  };

  return (
    <section className="flex min-h-[520px] w-full min-w-0 flex-col rounded-[20px] bg-white shadow-sh">
      {/* 헤더 */}
      <div className="flex items-center gap-2.5 border-b border-[#edf1f7] px-5 py-3.5">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy text-[11px] font-extrabold text-white">
          02
        </span>
        <h2 className="text-[15px] font-extrabold tracking-[-0.02em] text-[#1a2e4a]">
          바이어 발굴
        </h2>
      </div>

      <div className="p-6">
        {/* 드롭다운 + 바이어 발굴 + 최종 보고서 다운로드 */}
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
            {sessions.map((s) => {
              const date = (() => {
                const d = new Date(s.createdAt);
                const mm = String(d.getMonth() + 1).padStart(2, "0");
                const dd = String(d.getDate()).padStart(2, "0");
                const h  = d.getHours();
                const ap = h < 12 ? "오전" : "오후";
                const hh = String(h % 12 || 12).padStart(2, "0");
                const mn = String(d.getMinutes()).padStart(2, "0");
                return `${mm}. ${dd}. ${ap} ${hh}:${mn}`;
              })();
              return (
                <option key={s.sessionId} value={s.sessionId}>
                  시장조사 보고서 · {s.productName} · {date}
                  {s.partnerCompleted ? " ✓" : ""}
                </option>
              );
            })}
          </select>

          <button
            type="button"
            disabled={!canRun}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-navy px-5 py-2.5 text-[13px] font-extrabold text-white shadow-sm transition-opacity disabled:opacity-40"
            onClick={() => { void handleRunPartner(); }}
          >
            {loading ? (
              <><span className="animate-spin">⟳</span> 발굴 중...</>
            ) : (
              <>▶ 바이어 발굴</>
            )}
          </button>
        </div>

        {/* 기업 평가 기준 + 전체 해제 + 최종 보고서 다운로드 — 바이어 리스트 도출 후에만 표시 */}
        {!loading && partners !== null && partners.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-[#e8eef5] bg-[#f9fbfd] px-3 py-2.5">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="shrink-0 text-[12px] font-extrabold text-[#1a2e4a]">
              기업 평가 기준
              <span className="ml-1 font-normal text-[#6b7a8f]">(체크된 항목들에 대해 평가 후 추천 순위 배열)</span>
            </span>
            {CRITERIA_OPTIONS.map((opt) => (
              <label
                key={opt.key}
                className="flex shrink-0 cursor-pointer items-center gap-1 text-[12px] text-[#273f60]"
              >
                <input
                  type="checkbox"
                  checked={criteria[opt.key]}
                  onChange={() => { toggleCriterion(opt.key); }}
                  className="h-3.5 w-3.5 accent-navy"
                />
                {opt.label}
              </label>
            ))}
            <button
              type="button"
              onClick={resetCriteria}
              className="shrink-0 rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800 hover:bg-amber-100"
            >
              전체 해제
            </button>
          </div>
          <button
            type="button"
            disabled={!canDownload}
            onClick={() => { void handleDownloadFinal(); }}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-navy px-4 py-2 text-[12px] font-extrabold text-white shadow-sm transition-opacity disabled:opacity-40"
          >
            {downloading ? (
              <><span className="animate-spin">⟳</span> 준비 중...</>
            ) : (
              <>↓ 최종 보고서 다운로드</>
            )}
          </button>
        </div>
        )}

        {/* 에러 메시지 */}
        {errorMsg !== null && (
          <p className="mt-2 text-[12px] text-red-600">
            <span className="font-semibold">실행 실패:</span> {errorMsg}
          </p>
        )}

        {/* ── Top 10 타이틀 ── */}
        {(loading || (partners !== null && partners.length > 0)) && (
          <p className="mt-3 text-[13px] font-extrabold text-[#1a2e4a]">Top 10</p>
        )}

        {/* ── 스켈레톤 (8개) ── */}
        {loading && (
          <div className="mt-2 space-y-1.5">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg border border-[#eef2f7] bg-[#f9fbfd] px-3 py-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-extrabold text-[#9aafc5]">
                  {i + 1}
                </span>
                <div className="h-3 w-3/5 animate-pulse rounded bg-[#e8eef5]" />
              </div>
            ))}
          </div>
        )}

        {/* ── 바이어 목록 — 8개 노출 + 9·10위 내부 스크롤 ── */}
        {!loading && partners !== null && partners.length > 0 && (
          <div className="mt-2 max-h-[360px] space-y-1.5 overflow-y-auto pr-1">
            {partners.map((partner, idx) => (
              <button
                type="button"
                key={partner.id}
                className="flex w-full items-center gap-2 rounded-lg border border-[#eef2f7] bg-[#f9fbfd] px-3 py-2.5 text-left transition-colors hover:bg-[#eef4fb]"
                onClick={() => { setDetailPartner({ rank: idx + 1, partner }); }}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-extrabold text-navy">
                  {idx + 1}
                </span>
                <p className="truncate text-[13px] font-extrabold text-navy">
                  {partner.company_name}
                </p>
              </button>
            ))}
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
