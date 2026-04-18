import type { Phase3WorkflowStepIndex } from "@/src/lib/phase3/types";

interface Phase3WorkflowStepperProps {
  currentStep: Phase3WorkflowStepIndex;
}

const STEPS = ["1차 수집", "2차 심층", "프로필 생성", "점수화"] as const;

/** 내부 파이프라인 4단계만 표시 (보고서·가중치는 스테퍼에 포함하지 않음) */
export function Phase3WorkflowStepper({ currentStep }: Phase3WorkflowStepperProps) {
  const pipelineComplete = currentStep === 4;

  return (
    <div className="grid grid-cols-4 gap-2">
      {STEPS.map((label, index) => {
        const isDone = pipelineComplete || currentStep > index;
        const isCurrent = !pipelineComplete && currentStep === index;
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
