"use client";

import { useEffect, useState } from "react";

import { Card, IRow } from "../shared/Card";
import { loadStoredReports, type StoredReportItem } from "@/src/lib/dashboard/reports_store";

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

  return (
    <Card
      title="생성된 보고서"
      subtitle="1공정 분석 완료 시 자동 등록 · localStorage 기반"
      rightSlot={<span className="rounded-full bg-navy/10 px-3 py-1 text-[11px] font-extrabold text-navy">Reports</span>}
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
            <IRow key={item.id}>
              <div className="text-[14px] font-extrabold text-navy">{item.brand}</div>
              <div className="mt-1 text-[11px] text-muted">{item.inn}</div>
              <div className="mt-1 text-[11px] text-muted">
                Case {item.caseGrade} · {item.generatedAt.slice(0, 10)}
              </div>
            </IRow>
          ))}
        </div>
      )}
    </Card>
  );
}
