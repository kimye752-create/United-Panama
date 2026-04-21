"use client";

import { useEffect, useState } from "react";

import type { ReportSession } from "@/src/types/report_session";

interface Props {
  sessionId: string | null;
}

export function PartnerSection({ sessionId }: Props) {
  const [loading, setLoading] = useState(false);
  const [partnerData, setPartnerData] = useState<unknown>(null);
  const [combinedPending, setCombinedPending] = useState(false);
  const [session, setSession] = useState<ReportSession | null>(null);

  useEffect(() => {
    if (sessionId === null) {
      setSession(null);
      return;
    }
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch(`/api/panama/report/session/${sessionId}`);
        const data: unknown = await res.json();
        if (!res.ok || cancelled) {
          return;
        }
        setSession(data as ReportSession);
      } catch {
        /* 폴링 실패 무시 */
      }
    };
    void tick();
    const id = window.setInterval(tick, 2000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [sessionId]);

  /* 세 단계 완료 시 생성 컬럼 true — 결합 PDF는 아직 없어도 GET /combined 가 즉석 생성 */
  const canDownload = session !== null && session.can_download_combined;

  async function handleRunPartner() {
    if (sessionId === null) {
      return;
    }

    setLoading(true);
    setCombinedPending(false);

    try {
      const res = await fetch("/api/panama/report/partner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          weightedCriteria: {},
        }),
      });

      const data: unknown = await res.json();
      if (!res.ok) {
        const err = data as { detail?: string; error?: string };
        throw new Error(err.detail ?? err.error ?? "PARTNER_FAILED");
      }

      const ok = data as { partnerData?: unknown; combinedReportPending?: boolean };
      setPartnerData(ok.partnerData ?? null);

      if (ok.combinedReportPending === true) {
        setCombinedPending(true);
        window.setTimeout(() => {
          setCombinedPending(false);
        }, 5000);
      }
    } catch {
      /* 실행 실패 */
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-xl border border-[#d9e2ef] bg-white p-4 shadow-sh2">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-extrabold text-[#7a8aa0]">02</span>
          <h2 className="text-base font-extrabold text-[#273f60]">바이어 발굴 (세션 연동)</h2>
        </div>

        <a
          href={
            canDownload && sessionId !== null
              ? `/api/panama/report/combined?session_id=${sessionId}`
              : undefined
          }
          className={`rounded-md px-3 py-1.5 text-sm font-extrabold ${
            canDownload
              ? "bg-emerald-600 text-white"
              : "cursor-not-allowed bg-[#e2e8f0] text-[#94a3b8]"
          }`}
          onClick={(e) => {
            if (!canDownload) {
              e.preventDefault();
            }
          }}
          aria-disabled={!canDownload}
          title={
            canDownload
              ? "최종 보고서 다운로드"
              : "시장조사 → 가격 분석 → 바이어 발굴을 모두 완료해야 합니다"
          }
        >
          ↓ 최종 보고서 다운로드
        </a>
      </header>

      <button
        type="button"
        disabled={sessionId === null || loading}
        className="rounded-md bg-[#273f60] px-4 py-2 text-sm font-extrabold text-white disabled:opacity-40"
        onClick={() => {
          void handleRunPartner();
        }}
      >
        {loading ? "바이어 발굴 실행 중..." : "▶ 바이어 발굴 실행"}
      </button>

      {combinedPending && (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          ⏳ 최종 보고서를 생성하고 있습니다. 우측 목록을 확인하세요.
        </div>
      )}

      {partnerData !== null && (
        <p className="mt-2 text-xs text-[#6b7a8f]">
          파트너 분석 응답 수신됨 (상세는 보고서 목록·PDF 참고)
        </p>
      )}
    </section>
  );
}
