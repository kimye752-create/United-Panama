import { PSI_BASIC_WEIGHTS } from "@/src/lib/phase3/types";
import type { PSICheckedState, PSICriterionKey } from "@/src/lib/phase3/types";

const CRITERION_LABELS: Record<PSICriterionKey, string> = {
  revenue: "① 매출규모",
  pipeline: "② 파이프라인",
  manufacture: "③ 제조소 보유",
  import: "④ 수입 경험",
  pharmacy: "⑤ 약국체인 운영",
};

function weightPercent(key: PSICriterionKey): string {
  return `${String(Math.round(PSI_BASIC_WEIGHTS[key] * 100))}%`;
}

interface Phase3WeightPanelProps {
  checked: PSICheckedState;
  onToggle: (key: PSICriterionKey) => void;
  onResetDefaults: () => void;
}

/** 5대 지표 체크박스 — 최소 1개 선택은 onToggle 측에서 강제 */
export function Phase3WeightPanel({ checked, onToggle, onResetDefaults }: Phase3WeightPanelProps) {
  const keys = Object.keys(CRITERION_LABELS) as PSICriterionKey[];
  const allChecked = (Object.keys(checked) as PSICriterionKey[]).every((k) => checked[k]);

  return (
    <div className="rounded-[12px] border border-[#dce4ef] bg-[#f7f9fc] p-5">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-base font-bold leading-snug text-slate-800">
            기업 평가 기준 (체크된 항목들에 대해 평가 후 추천 순위 배열)
          </div>
        </div>
        <button
          type="button"
          onClick={onResetDefaults}
          className="shrink-0 rounded-[8px] border border-[#cbd5e1] bg-white px-2.5 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50 hover:text-amber-800"
        >
          {allChecked ? "전체 해제" : "전체 항목 체크"}
        </button>
      </div>
      <div className="mb-3 text-xs text-slate-500">※ 유나이티드제약 AHP 평가 항목</div>
      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
        {keys.map((key) => (
          <label
            key={key}
            className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700"
          >
            <input
              type="checkbox"
              className="h-5 w-5 shrink-0 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
              checked={checked[key]}
              onChange={() => {
                onToggle(key);
              }}
            />
            <span>
              {CRITERION_LABELS[key]}{" "}
              <strong className="font-extrabold text-[#1E4E8C]">({weightPercent(key)})</strong>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
