"use client";

import { useEffect, useState } from "react";

import { Card } from "../shared/Card";
import {
  loadStoredReports,
  saveStoredReports,
  type StoredReportItem,
} from "@/src/lib/dashboard/reports_store";

function caseBadgeClass(caseGrade: StoredReportItem["caseGrade"]): string {
  if (caseGrade === "A") {
    return "bg-emerald-100 text-emerald-700";
  }
  if (caseGrade === "B") {
    return "bg-amber-100 text-amber-700";
  }
  return "bg-blue-100 text-blue-700";
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString("ko-KR");
}

export function GeneratedReportsList() {
  const [items, setItems] = useState<StoredReportItem[]>([]);

  useEffect(() => {
    const sync = () => {
      setItems(loadStoredReports());
    };
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  const clearAll = () => {
    setItems([]);
    saveStoredReports([]);
  };

  const removeOne = (id: string) => {
    const next = items.filter((item) => item.id !== id);
    setItems(next);
    saveStoredReports(next);
  };

  return (
    <Card
      title="생성된 보고서"
      subtitle="1공정 분석 완료 시 자동 등록 · PDF 다운로드 기능"
      rightSlot={
        <button
          type="button"
          onClick={clearAll}
          className="rounded-[10px] border border-[#d7dfeb] bg-white px-3 py-1.5 text-[11px] font-bold text-[#59708d] hover:bg-[#f3f6fb]"
        >
          모두 지우기
        </button>
      }
    >
      {items.length === 0 ? (
        <div className="py-8 text-center text-[13px] leading-relaxed text-muted">
          아직 생성된 보고서가 없습니다.
          <br />
          1공정 분석을 실행하면 여기에 자동으로 등록됩니다.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <article key={item.id} className="rounded-[13px] border border-[#e2e8f1] bg-white p-3">
              <p className="text-[13px] font-extrabold text-[#1f3e64]">1공정 보고서 - {item.brand}</p>
              <p className="mt-1 text-[11px] text-[#6f8299]">
                {item.inn} · {formatDate(item.generatedAt)}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${caseBadgeClass(item.caseGrade)}`}>
                  {item.caseGrade === "A" ? "가능" : item.caseGrade === "B" ? "조건부" : "검토"}
                </span>
                <button
                  type="button"
                  className="rounded-[8px] border border-[#d7dfeb] bg-[#f6f9fc] px-2.5 py-1 text-[10px] font-bold text-[#59708d]"
                >
                  ↓ PDF
                </button>
                <button
                  type="button"
                  onClick={() => removeOne(item.id)}
                  className="rounded-[8px] border border-[#d7dfeb] bg-white px-2.5 py-1 text-[10px] font-bold text-[#788ba4] hover:bg-[#f6f9fc]"
                >
                  ✕
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </Card>
  );
}
