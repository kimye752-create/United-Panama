"use client";

import { useState } from "react";

import { SessionReportsList } from "./reports/SessionReportsList";

export function ReportsFloatingButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* 플로팅 버튼 */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex h-[48px] items-center gap-2 rounded-full bg-navy px-5 text-[13px] font-extrabold text-white shadow-[0_4px_16px_rgba(27,63,100,0.35)] transition-all hover:bg-[#1a3356] hover:shadow-[0_6px_20px_rgba(27,63,100,0.45)] active:scale-95"
        aria-label="보고서 탭 열기"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
        보고서 탭
      </button>

      {/* 오버레이 */}
      {open ? (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      ) : null}

      {/* 우측 슬라이드 패널 */}
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-[560px] flex-col bg-[#f4f7fc] shadow-[-4px_0_24px_rgba(0,0,0,0.12)] transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        aria-label="보고서 패널"
      >
        {/* 패널 헤더 */}
        <div className="flex items-center justify-between border-b border-[#dde5f0] bg-white px-5 py-4">
          <div>
            <p className="text-[15px] font-extrabold text-navy">보고서 탭</p>
            <p className="mt-0.5 text-[12px] text-[#7a8fa8]">P1 시장조사 · P2 가격전략 · P3 바이어 · 최종 PDF</p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#7a8fa8] transition-colors hover:bg-[#f0f4f9] hover:text-navy"
            aria-label="닫기"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* 패널 콘텐츠 */}
        <div className="flex-1 overflow-y-auto p-5">
          <SessionReportsList />
        </div>
      </aside>
    </>
  );
}
