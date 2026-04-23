"use client";

// SG 팀장 양식(우하단 플로팅 팝오버 카드)에 맞춘 재작성.
// 변경 전: 화면 전체를 덮는 슬라이드 패널(max-w-[560px] + 검정 오버레이).
// 변경 후: 버튼 바로 위에 띄우는 380px 팝오버(오버레이 없음, 외부 클릭으로만 닫힘).

import { useCallback, useEffect, useRef, useState } from "react";

import { SessionReportsList } from "./reports/SessionReportsList";

export function ReportsFloatingButton() {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const buttonRef  = useRef<HTMLButtonElement | null>(null);

  // 외부 클릭 시 팝오버 닫기 (팝오버/버튼 내부 클릭은 제외)
  const handleOutsideClick = useCallback((event: MouseEvent) => {
    const target = event.target as Node;
    if (popoverRef.current?.contains(target) === true) return;
    if (buttonRef.current?.contains(target) === true) return;
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    window.document.addEventListener("mousedown", handleOutsideClick);
    return () => { window.document.removeEventListener("mousedown", handleOutsideClick); };
  }, [open, handleOutsideClick]);

  // ESC 키로 닫기
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); };
  }, [open]);

  // "모두 지우기" — SessionReportsList 내부 새로고침을 트리거하기 위해 커스텀 이벤트 발송
  const handleClearAll = useCallback(() => {
    if (!window.confirm("생성된 보고서 목록을 모두 정리하시겠습니까? (Supabase DB는 영향 없음)")) {
      return;
    }
    window.dispatchEvent(new CustomEvent("panama:reports:clearAll"));
  }, []);

  return (
    <>
      {/* 플로팅 버튼 — 우하단 고정 */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-40 flex h-[40px] items-center gap-2 rounded-full bg-navy px-4 text-[13px] font-extrabold text-white shadow-[0_4px_16px_rgba(27,63,100,0.35)] transition-all hover:bg-[#1a3356] active:scale-95"
        aria-label="보고서 탭 열기"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
        보고서 탭
      </button>

      {/* 우하단 플로팅 팝오버 카드 — SG 팀장 양식 */}
      {open ? (
        <div
          ref={popoverRef}
          className="fixed bottom-[72px] right-6 z-50 flex max-h-[70vh] w-[380px] flex-col overflow-hidden rounded-[20px] bg-white shadow-[0_12px_32px_rgba(39,63,96,0.18)]"
          role="dialog"
          aria-label="생성된 보고서"
        >
          {/* 팝오버 헤더 */}
          <div className="flex items-center justify-between border-b border-[#eef2f7] bg-white px-4 py-3">
            <p className="text-[14px] font-extrabold text-navy">생성된 보고서</p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleClearAll}
                className="rounded-md border border-[#d9e2ef] bg-white px-2.5 py-1 text-[11px] font-bold text-[#59708d] hover:bg-[#f6f9fc]"
              >
                모두 지우기
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-[#7a8fa8] transition-colors hover:bg-[#f0f4f9] hover:text-navy"
                aria-label="닫기"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          {/* 팝오버 본문 — 세로 스크롤 */}
          <div className="flex-1 overflow-y-auto px-3 py-3">
            <SessionReportsList variant="popover" />
          </div>
        </div>
      ) : null}
    </>
  );
}
