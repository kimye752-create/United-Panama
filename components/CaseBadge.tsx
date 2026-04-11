/**
 * 블록 2 — 핵심 판정 한 줄 (text-4xl)
 */
import type { JudgmentResult } from "@/src/logic/case_judgment";

type Props = {
  judgment: JudgmentResult;
};

function lineText(j: JudgmentResult): string {
  if (j.case === "A") {
    return "🟢 수출 가능 (Case A: 공공조달 + 민간 병행)";
  }
  if (j.case === "B") {
    return "🟡 수출 조건부 (Case B: 민간 약국 채널 우선)";
  }
  return "🔴 수출 불가 (Case C: 재평가 대기)";
}

function boxClass(j: JudgmentResult): string {
  if (j.case === "A") {
    return "border-emerald-200 bg-emerald-50 text-emerald-600";
  }
  if (j.case === "B") {
    return "border-amber-200 bg-amber-50 text-amber-600";
  }
  return "border-red-200 bg-red-50 text-red-600";
}

export function CaseBadge({ judgment }: Props) {
  return (
    <div
      className={`rounded-lg border-2 px-4 py-6 ${boxClass(judgment)}`}
      role="status"
    >
      <p className="text-4xl font-bold leading-tight">{lineText(judgment)}</p>
    </div>
  );
}
