"use client";

import { useEffect, useRef, useState } from "react";

import type { GeneratedReportListItem } from "@/src/types/report_session";

interface Props {
  sessionId: string | null;
}

export function ReportListPanel({ sessionId }: Props) {
  const prevHasFinal = useRef(false);
  const [reports, setReports] = useState<GeneratedReportListItem[]>([]);

  useEffect(() => {
    if (sessionId === null) {
      setReports([]);
      return;
    }
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch(`/api/panama/report/session/${sessionId}/list`);
        const data: unknown = await res.json();
        if (!res.ok || cancelled) {
          return;
        }
        const parsed = data as { reports?: GeneratedReportListItem[] };
        setReports(parsed.reports ?? []);
      } catch {
        /* 목록 조회 실패 무시 */
      }
    };

    void load();
    const id = window.setInterval(load, 2000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [sessionId]);

  useEffect(() => {
    const hasFinal = reports.some((r) => r.isFinal);
    if (hasFinal && !prevHasFinal.current) {
      /* 최종본 최초 등장 — 필요 시 토스트 연결 */
    }
    prevHasFinal.current = hasFinal;
  }, [reports]);

  async function handleRemove(reportId: string) {
    try {
      await fetch(`/api/panama/report/delete/${reportId}`, { method: "DELETE" });
      setReports((prev) => prev.filter((r) => r.id !== reportId));
    } catch {
      /* 삭제 실패 */
    }
  }

  return (
    <aside className="rounded-xl border border-[#d9e2ef] bg-white p-4 shadow-sh2">
      <header className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-extrabold text-[#273f60]">생성된 보고서</h3>
      </header>

      <ul className="space-y-2">
        {reports.map((report) => (
          <li
            key={report.id}
            className="flex flex-col gap-2 rounded-lg border border-[#eef2f7] bg-[#fbfbfd] p-2.5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <div className="flex flex-wrap items-center gap-1 text-sm font-semibold text-navy">
                {report.isFinal && (
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-extrabold text-amber-900">
                    [최종]
                  </span>
                )}
                {report.marketSegment === "public" && (
                  <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-extrabold text-sky-900">
                    [공공]
                  </span>
                )}
                {report.marketSegment === "private" && (
                  <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-extrabold text-violet-900">
                    [민간]
                  </span>
                )}
                <span>{report.title}</span>
              </div>
              <time className="text-[11px] text-[#6b7a8f]">
                {new Date(report.createdAt).toLocaleString("ko-KR")}
              </time>
            </div>

            <div className="flex items-center gap-2">
              {report.hasPdf && (
                <a
                  href={`/api/panama/report/${report.type}/${report.id}/pdf`}
                  className="rounded-md bg-[#273f60] px-2.5 py-1 text-xs font-extrabold text-white"
                  download
                >
                  📄 PDF
                </a>
              )}
              <button
                type="button"
                className="rounded-md border border-[#e2e8f0] px-2 py-1 text-xs text-[#64748b]"
                onClick={() => {
                  void handleRemove(report.id);
                }}
              >
                ×
              </button>
            </div>
          </li>
        ))}

        {reports.length === 0 && (
          <li className="rounded-lg border border-dashed border-[#d9e2ef] px-3 py-6 text-center text-sm text-[#6b7a8f]">
            생성된 보고서가 없습니다. 품목을 선택해 분석을 시작하세요.
          </li>
        )}
      </ul>
    </aside>
  );
}
