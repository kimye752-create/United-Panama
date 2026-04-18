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

/** 내부 파이프라인 스테퍼: 1차수집(0)~점수화(3), 4=전 단계 완료 표시 */
export type Phase3WorkflowStepIndex = 0 | 1 | 2 | 3 | 4;

/** 모달 탭 */
export type Phase3ModalTabId = "basic" | "psi" | "products" | "reason";
