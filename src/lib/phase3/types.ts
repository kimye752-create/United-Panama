/**
 * 3공정 UI·lib 공용 — 서버 PSI 타입 재노출
 */
export type {
  PSICriterionKey,
  PSICheckedState,
  PartnerPSIRecord,
  PartnerWithPSI,
  DynamicPSIResult,
  ConflictLevel,
} from "@/src/logic/phase3/types";

export {
  PSI_BASIC_WEIGHTS,
  PSI_CRITERION_PRIORITY,
} from "@/src/logic/phase3/types";

/** 4단계 워크플로 시각화용 (0~3) */
export type Phase3WorkflowStepIndex = 0 | 1 | 2 | 3;

/** 모달 탭 */
export type Phase3ModalTabId = "basic" | "psi" | "products" | "reason";
