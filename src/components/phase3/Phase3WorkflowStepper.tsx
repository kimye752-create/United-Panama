import type { Phase3WorkflowStepIndex } from "@/src/lib/phase3/types";

interface Phase3WorkflowStepperProps {
  currentStep: Phase3WorkflowStepIndex;
}

const STEPS = ["보고서 선택", "가중치 설정", "분석 실행", "결과 확인"] as const;

/** 2공정 Phase2ProgressSteps 패턴 — 4단계 시각화 */
export function Phase3WorkflowStepper({ currentStep }: Phase3WorkflowStepperProps) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {STEPS.map((label, index) => {
        const isDone = currentStep > index;
        const isCurrent = currentStep === index;
        return (
          <div key={label} className="flex flex-col items-center gap-1">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-extrabold shadow-sh3 ${
                isDone || isCurrent ? "bg-[#1E3A5F] text-white" : "bg-[#e8edf5] text-[#8b97aa]"
              }`}
            >
              {index + 1}
            </div>
            <p className={`text-center text-[10px] ${isDone || isCurrent ? "text-[#1E3A5F]" : "text-[#8b97aa]"}`}>
              {label}
            </p>
          </div>
        );
      })}
    </div>
  );
}
