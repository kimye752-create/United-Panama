"use client";

import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface EmailPopupProps {
  email: string;
  onClose: () => void;
}

/** 이메일 주소 표시 + 클립보드 복사 (카드·상세 모달 공통) */
export function EmailPopup({ email, onClose }: EmailPopupProps): ReactElement | null {
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("keydown", handleEsc);
    };
  }, [onClose]);

  async function handleCopy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      window.setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      // 클립보드 API 실패 시 무시
    }
  }

  if (!mounted) {
    return null;
  }

  return createPortal(
    <div
      className="flex items-center justify-center bg-black/50 p-4"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 10000,
      }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="rounded-xl bg-white p-5 shadow-2xl"
        style={{ maxWidth: "400px", width: "100%" }}
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <div className="mb-3 text-sm font-bold text-slate-700">📧 이메일 주소</div>
        <div className="mb-4 break-all rounded border border-slate-200 bg-slate-50 p-3 font-mono text-base text-slate-900">
          {email}
        </div>
        <button
          type="button"
          onClick={() => {
            void handleCopy();
          }}
          className="mb-2 w-full rounded-lg bg-amber-100 px-3 py-3 text-sm font-medium text-amber-900 transition-colors hover:bg-amber-200"
        >
          {copied ? "✓ 복사 완료" : "📋 복사하기"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2 text-sm text-slate-500 hover:text-slate-700"
        >
          닫기
        </button>
      </div>
    </div>,
    document.body,
  );
}
