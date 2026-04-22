"use client";

import { useCallback, useEffect, useState } from "react";

import type { SessionListItem } from "@/app/api/panama/report/sessions/route";

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

function PhaseBadge({
  label,
  done,
}: {
  label: string;
  done: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${
        done
          ? "bg-emerald-100 text-emerald-700"
          : "bg-[#f0f4f9] text-[#9aafc5]"
      }`}
    >
      {done ? "✓" : "○"} {label}
    </span>
  );
}

export function SessionReportsList() {
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/panama/report/sessions");
      if (!res.ok) return;
      const data = (await res.json()) as { items?: SessionListItem[] };
      setSessions(data.items ?? []);
    } catch { /* 무시 */ }
    finally  { setLoading(false); }
  }, []);

  useEffect(() => { void fetchSessions(); }, [fetchSessions]);

  // 30초마다 자동 갱신
  useEffect(() => {
    const id = window.setInterval(() => { void fetchSessions(); }, 30_000);
    return () => { window.clearInterval(id); };
  }, [fetchSessions]);

  async function handleGenerateFinal(session: SessionListItem) {
    setGeneratingId(session.sessionId);
    try {
      const res = await fetch(
        `/api/panama/report/combined?session_id=${encodeURIComponent(session.sessionId)}`,
      );
      if (!res.ok) {
        const err = (await res.json()) as { error?: string; detail?: string };
        window.alert(`최종 보고서 생성 실패: ${err.detail ?? err.error ?? "알 수 없는 오류"}`);
        return;
      }
      // PDF 자동 다운로드
      const blob     = await res.blob();
      const url      = URL.createObjectURL(blob);
      const anchor   = document.createElement("a");
      anchor.href    = url;
      anchor.download = `파나마_최종보고서_${session.productName}_${session.sessionId.slice(0, 8)}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
      // 세션 목록 갱신
      await fetchSessions();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      window.alert(`오류: ${msg}`);
    } finally {
      setGeneratingId(null);
    }
  }

  if (loading && sessions.length === 0) {
    return (
      <div className="py-8 text-center text-[12px] text-[#7a8fa8]">
        <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[#d9e2ef] border-t-navy" />
        {" "}불러오는 중…
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[#d9e2ef] py-8 text-center text-[13px] text-[#7a8fa8]">
        생성된 보고서가 없습니다.
        <br />
        <span className="text-[11px]">시장 분석 탭에서 품목 선택 후 분석을 실행하세요.</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* 새로고침 */}
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[#9aafc5]">
          보고서 목록
        </p>
        <button
          type="button"
          onClick={() => { void fetchSessions(); }}
          disabled={loading}
          className="text-[11px] text-[#7a8fa8] hover:text-navy disabled:opacity-40"
        >
          ↻ 새로고침
        </button>
      </div>

      {sessions.map((s) => {
        const allDone  = s.marketCompleted && s.pricingCompleted && s.partnerCompleted;
        const isGenerating = generatingId === s.sessionId;

        return (
          <article
            key={s.sessionId}
            className="rounded-xl border border-[#d9e2ef] bg-white p-4 shadow-sm"
          >
            {/* 제품명 + 날짜 */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-extrabold text-navy">
                  {s.productName}
                </p>
                <p className="mt-0.5 text-[11px] text-[#7a8fa8]">{fmtDate(s.createdAt)}</p>
              </div>
              {s.combinedCompleted && (
                <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                  최종 완료
                </span>
              )}
            </div>

            {/* 단계별 뱃지 */}
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <PhaseBadge label="P1 시장조사" done={s.marketCompleted} />
              <PhaseBadge label="P2 가격전략" done={s.pricingCompleted} />
              <PhaseBadge label="P3 바이어"   done={s.partnerCompleted} />
            </div>

            {/* 개별 PDF 링크 */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {s.marketReportId !== null && (
                <a
                  href={`/api/panama/report/market/${s.marketReportId}/pdf`}
                  download
                  className="rounded-md border border-[#d9e2ef] bg-[#f8fafc] px-2.5 py-1 text-[11px] font-bold text-[#273f60] hover:bg-[#edf3fb]"
                >
                  📄 시장조사
                </a>
              )}
              {s.pricingPublicReportId !== null && (
                <a
                  href={`/api/panama/report/pricing_public/${s.pricingPublicReportId}/pdf`}
                  download
                  className="rounded-md border border-[#d9e2ef] bg-[#f8fafc] px-2.5 py-1 text-[11px] font-bold text-[#273f60] hover:bg-[#edf3fb]"
                >
                  📄 가격(공공)
                </a>
              )}
              {s.pricingPrivateReportId !== null && (
                <a
                  href={`/api/panama/report/pricing_private/${s.pricingPrivateReportId}/pdf`}
                  download
                  className="rounded-md border border-[#d9e2ef] bg-[#f8fafc] px-2.5 py-1 text-[11px] font-bold text-[#273f60] hover:bg-[#edf3fb]"
                >
                  📄 가격(민간)
                </a>
              )}
              {s.partnerReportId !== null && (
                <a
                  href={`/api/panama/report/partner/${s.partnerReportId}/pdf`}
                  download
                  className="rounded-md border border-[#d9e2ef] bg-[#f8fafc] px-2.5 py-1 text-[11px] font-bold text-[#273f60] hover:bg-[#edf3fb]"
                >
                  📄 바이어
                </a>
              )}
            </div>

            {/* 최종 보고서 생성 / 다운로드 */}
            <div className="mt-3 border-t border-dashed border-[#e8eef5] pt-3">
              {s.combinedReportId !== null ? (
                // 이미 생성됨 → 다운로드
                <a
                  href={`/api/panama/report/combined?session_id=${s.sessionId}`}
                  download
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-[13px] font-extrabold text-white shadow-sm hover:bg-amber-600"
                >
                  ⬇ 최종 보고서 PDF 다운로드
                </a>
              ) : allDone ? (
                // P1+P2+P3 완료 → 생성 가능
                <button
                  type="button"
                  disabled={isGenerating}
                  onClick={() => { void handleGenerateFinal(s); }}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-navy px-4 py-2 text-[13px] font-extrabold text-white shadow-sm transition-opacity hover:bg-[#1a3356] disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <span className="animate-spin">⟳</span> 최종 보고서 생성 중…
                    </>
                  ) : (
                    <>▶ 최종 보고서 생성</>
                  )}
                </button>
              ) : (
                // 미완료 → 비활성
                <div className="rounded-lg border border-dashed border-[#d9e2ef] px-4 py-2 text-center text-[11px] text-[#9aafc5]">
                  P1·P2·P3 완료 후 최종 보고서를 생성할 수 있습니다
                </div>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
