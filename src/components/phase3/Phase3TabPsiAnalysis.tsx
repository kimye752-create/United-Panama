import type { ReactElement } from "react";

import { calculateDynamicPSI } from "@/src/lib/phase3/psi-calculator";
import type { PSICheckedState } from "@/src/lib/phase3/types";
import type { PartnerWithDynamicPsi } from "@/src/lib/phase3/psi-calculator";

interface Phase3TabPsiAnalysisProps {
  partner: PartnerWithDynamicPsi;
  checked: PSICheckedState;
}

const LABELS: Record<string, string> = {
  revenue: "매출 Tier",
  pipeline: "파이프라인",
  manufacture: "제조소",
  import: "수입",
  pharmacy: "약국체인",
};

/** 모달 탭 2 — PSI 분석 (점수 + 활성 가중치) */
export function Phase3TabPsiAnalysis({ partner, checked }: Phase3TabPsiAnalysisProps) {
  const dyn = calculateDynamicPSI(partner, checked);

  return (
    <div className="space-y-3 text-[12px]">
      <div className="flex items-baseline justify-between gap-2 rounded-[10px] bg-[#f4f7fc] p-3">
        <span className="text-[11px] font-bold text-[#1f3e64]">동적 PSI</span>
        <span className="text-[28px] font-black text-[#1E4E8C]">{String(partner.dynamic_psi)}</span>
      </div>
      <p className="text-[10px] text-[#6f8299]">
        기본 PSI(고정 가중치): <span className="font-semibold text-[#273f60]">{String(partner.psi_total_default)}</span>
      </p>
      <div>
        <p className="mb-1 text-[11px] font-bold text-[#1f3e64]">활성 가중치 (체크된 항목만 비율 유지 재분배)</p>
        <ul className="space-y-1 text-[11px] text-[#3e5574]">
          {Object.entries(dyn.normalized_weights).map(([k, w]) => (
            <li key={k} className="flex justify-between">
              <span>{LABELS[k] ?? k}</span>
              <span className="font-mono">{w !== undefined ? (w * 100).toFixed(2) : "—"}%</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        <ScoreCell label="매출" value={partner.revenue_tier_label} raw={partner.revenue_tier_score} />
        <ScoreCell label="파이프" value={partner.pipeline_tier_label} raw={partner.pipeline_tier_score} />
        <ScoreCell label="제조" value={partner.manufacturing_label} raw={partner.manufacturing_score} />
        <ScoreCell label="수입" value={partner.import_experience_label} raw={partner.import_experience_score} />
        <ScoreCell label="약국" value={partner.pharmacy_chain_label} raw={partner.pharmacy_chain_score} />
      </div>
    </div>
  );
}

function ScoreCell(props: { label: string; value: string; raw: number }): ReactElement {
  return (
    <div className="rounded-[8px] border border-[#e3e9f2] bg-white p-2 text-[10px]">
      <div className="text-[#8b97aa]">{props.label}</div>
      <div className="font-semibold text-[#273f60]">{props.value}</div>
      <div className="text-[#a8b4c9]">점수 {String(props.raw)}</div>
    </div>
  );
}
