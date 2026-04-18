import type { PSICheckedState, PSICriterionKey } from "@/src/lib/phase3/types";

const CRITERION_LABELS: Record<PSICriterionKey, string> = {
  revenue: "① 매출규모",
  pipeline: "② 파이프라인 (동일/유사 의약품 취급)",
  manufacture: "③ 제조소 보유",
  import: "④ 수입 경험",
  pharmacy: "⑤ 약국체인 운영",
};

interface Phase3WeightPanelProps {
  checked: PSICheckedState;
  onToggle: (key: PSICriterionKey) => void;
  onResetDefaults: () => void;
}

/** 5대 지표 체크박스 — 최소 1개 선택은 onToggle 측에서 강제 */
export function Phase3WeightPanel({ checked, onToggle, onResetDefaults }: Phase3WeightPanelProps) {
  const keys = Object.keys(CRITERION_LABELS) as PSICriterionKey[];

  return (
    <div className="rounded-[12px] border border-[#dce4ef] bg-[#f7f9fc] p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-bold text-[#1f3e64]">
          평가 기준 (체크된 항목만 비율 유지하며 재분배)
        </p>
        <button
          type="button"
          onClick={onResetDefaults}
          className="rounded-[8px] border border-[#cbd5e1] bg-white px-2 py-1 text-[10px] font-semibold text-[#3e5574] hover:bg-[#f1f5f9]"
        >
          기본값 복원 (5개 전체)
        </button>
      </div>
      <div className="grid grid-cols-1 gap-1.5 md:grid-cols-2">
        {keys.map((key) => (
          <label key={key} className="flex cursor-pointer items-center gap-2 text-[11px] text-[#2b4568]">
            <input
              type="checkbox"
              className="rounded border-[#cbd5e1]"
              checked={checked[key]}
              onChange={() => {
                onToggle(key);
              }}
            />
            <span>{CRITERION_LABELS[key]}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
