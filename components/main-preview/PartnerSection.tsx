"use client";

import { useCallback, useEffect, useState } from "react";

import type { SessionListItem } from "@/app/api/panama/report/sessions/route";

interface Props {
  /** PricingSection에서 새 세션 생성 시 전달 — 자동으로 드롭다운 선택 */
  sessionId: string | null;
}

/** ISO → "MM. DD. 오전/오후 HH:MM" */
function fmtDate(iso: string): string {
  try {
    const d = new Date(iso);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const h = d.getHours();
    const ampm = h < 12 ? "오전" : "오후";
    const hh = String(h % 12 || 12).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${mm}. ${dd}. ${ampm} ${hh}:${min}`;
  } catch {
    return iso.slice(0, 10);
  }
}

export function PartnerSection({ sessionId }: Props) {
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  // ─── 세션 목록 조회 ───────────────────────────────────────────
  const fetchSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const res = await fetch("/api/panama/report/sessions");
      if (!res.ok) return;
      const data = (await res.json()) as { items?: SessionListItem[] };
      setSessions(data.items ?? []);
    } catch {
      /* 무시 */
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSessions();
  }, [fetchSessions]);

  // PricingSection에서 새 세션 생성되면 목록 갱신 + 자동 선택
  useEffect(() => {
    if (sessionId === null) return;
    void fetchSessions().then(() => {
      setSelectedSessionId(sessionId);
      setDone(false);
    });
  }, [sessionId, fetchSessions]);

  // ─── 바이어 발굴 실행 ─────────────────────────────────────────
  async function handleRunPartner() {
    if (selectedSessionId === "") return;
    setLoading(true);
    setDone(false);
    try {
      const res = await fetch("/api/panama/report/partner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: selectedSessionId, weightedCriteria: {} }),
      });
      const data: unknown = await res.json();
      if (!res.ok) throw new Error((data as { detail?: string }).detail ?? "PARTNER_FAILED");
      setDone(true);
      // 목록 갱신 (partner_completed_at 업데이트 반영)
      await fetchSessions();
    } catch {
      /* 실패 무시 */
    } finally {
      setLoading(false);
    }
  }

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
        {/* 세션 선택 드롭다운 */}
        <select
          className="w-full rounded-lg border border-[#d9e2ef] bg-white px-3 py-2 text-[13px] text-[#273f60] shadow-sm focus:outline-none focus:ring-2 focus:ring-navy/30"
          value={selectedSessionId}
          onChange={(e) => {
            setSelectedSessionId(e.target.value);
            setDone(false);
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

        {/* 바이어 발굴 버튼 */}
        <button
          type="button"
          disabled={!canRun}
          className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-navy px-4 py-2.5 text-[13px] font-extrabold text-white shadow-sm transition-opacity disabled:opacity-40"
          onClick={() => { void handleRunPartner(); }}
        >
          {loading ? (
            <><span className="animate-spin">⟳</span> 바이어 발굴 중...</>
          ) : (
            <>▶ 바이어 발굴</>
          )}
        </button>

        {/* 완료 메시지 */}
        {done && (
          <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[13px] text-emerald-800">
            ✅ 바이어 발굴 완료 — 보고서 탭에서 PDF를 다운로드하세요.
          </div>
        )}
      </div>
    </section>
  );
}
