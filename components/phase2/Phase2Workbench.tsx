"use client";

import { useState } from "react";

import { Phase2AiPipeline } from "./Phase2AiPipeline";
import { Phase2ManualInput } from "./Phase2ManualInput";
import { Phase2TabSelector, type Phase2Tab } from "./Phase2TabSelector";

export function Phase2Workbench() {
  const [tab, setTab] = useState<Phase2Tab>("ai");

  return (
    <section className="space-y-3.5">
      <div className="rounded-[20px] bg-card p-5 shadow-sh">
        <Phase2TabSelector activeTab={tab} onChange={setTab} />
        <p className="mt-2 text-[11px] text-muted">
          보고서를 업로드하면 AI가 가격 정보를 추출 후 FOB 역산 분석을 시작합니다.
        </p>
      </div>
      {tab === "ai" ? <Phase2AiPipeline /> : <Phase2ManualInput />}
    </section>
  );
}
