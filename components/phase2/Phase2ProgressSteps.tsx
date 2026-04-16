interface Phase2ProgressStepsProps {
  currentStep: number;
}

const STEPS = [
  "PDF 분석",
  "가격 추출",
  "환율 조회",
  "AI 분석",
  "PDF 생성",
] as const;

export function Phase2ProgressSteps({ currentStep }: Phase2ProgressStepsProps) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {STEPS.map((step, index) => {
        const isDone = currentStep > index;
        const isCurrent = currentStep === index;
        return (
          <div key={step} className="flex flex-col items-center gap-1">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-extrabold shadow-sh3 ${
                isDone || isCurrent ? "bg-navy text-white" : "bg-inner text-muted"
              }`}
            >
              {index + 1}
            </div>
            <p className={`text-[10px] ${isDone || isCurrent ? "text-navy" : "text-muted"}`}>{step}</p>
          </div>
        );
      })}
    </div>
  );
}
