"use client";

import { useState } from "react";

import { Phase2AiPipeline } from "./Phase2AiPipeline";
import { Phase2ManualInput } from "./Phase2ManualInput";
import { Phase2TabSelector, type Phase2Tab } from "./Phase2TabSelector";

export function Phase2Workbench() {
  const [tab, setTab] = useState<Phase2Tab>("ai");

  return (
    <section className="space-y-4">
      <div className="rounded-[20px] border border-[#e6ebf2] bg-[#f8fafd] p-5 shadow-sh2">
        <Phase2TabSelector activeTab={tab} onChange={setTab} />
        <p className="mt-3 text-[12px] text-[#667a96]">
          보고서를 업로드하면 AI가 가격 정보를 자동 추출·분석합니다.
        </p>
      </div>
      {tab === "ai" ? <Phase2AiPipeline /> : <Phase2ManualInput />}
    </section>
  );
}
