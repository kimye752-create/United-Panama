/**
 * 기법 ② Wrapper Maintenance — Phase B 연기 (stub)
 */
/// <reference types="node" />

export interface WrapperMaintenanceTask {
  targetUrl: string;
  previousSelectors: Record<string, string>;
}

export interface WrapperMaintenanceResult {
  updatedSelectors: Record<string, string>;
  changeDetected: boolean;
}

export async function runWrapperMaintenance(
  _task: WrapperMaintenanceTask,
): Promise<WrapperMaintenanceResult> {
  throw new Error(
    "WrapperMaintenance: Phase B deferred - session 9+. 1공정 1회성 수집에 불필요",
  );
}
