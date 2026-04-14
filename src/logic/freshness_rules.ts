/**
 * 신선도 규칙 기반 판정 (LLM 없이 digest·검증용)
 */
import type { FreshnessMetadata } from "../constants/freshness_registry";
import type { RefreshCycle } from "../types/freshness";

export type RuleFreshnessStatus = "fresh" | "stale_likely" | "stale_confirmed";

/**
 * itemCollectedAt·refreshCycle 기준 일수 차이로 상태 산출
 */
export function ruleBasedFreshnessStatus(
  itemCollectedAtIso: string | null | undefined,
  refreshCycle: RefreshCycle,
  referenceDate: Date,
): RuleFreshnessStatus {
  if (refreshCycle === "immutable") {
    return "fresh";
  }
  if (
    itemCollectedAtIso === null ||
    itemCollectedAtIso === undefined ||
    itemCollectedAtIso === ""
  ) {
    return "stale_likely";
  }
  const itemMs = Date.parse(itemCollectedAtIso);
  if (Number.isNaN(itemMs)) {
    return "stale_likely";
  }
  const days =
    (referenceDate.getTime() - itemMs) / (24 * 60 * 60 * 1000);

  switch (refreshCycle) {
    case "immediate":
      return days > 1 ? "stale_confirmed" : "fresh";
    case "1d":
      return days > 2 ? "stale_likely" : "fresh";
    case "7d":
      if (days > 14) {
        return "stale_confirmed";
      }
      if (days > 10) {
        return "stale_likely";
      }
      return "fresh";
    case "1m":
      if (days > 60) {
        return "stale_confirmed";
      }
      if (days > 45) {
        return "stale_likely";
      }
      return "fresh";
    case "3m":
      if (days > 180) {
        return "stale_confirmed";
      }
      if (days > 120) {
        return "stale_likely";
      }
      return "fresh";
    case "1y":
      if (days > 730) {
        return "stale_confirmed";
      }
      if (days > 540) {
        return "stale_likely";
      }
      return "fresh";
    case "unknown":
      return days > 180 ? "stale_likely" : "fresh";
    default:
      return "stale_likely";
  }
}

/** digest 접두 L1/L2/L3 — 데이터 레이어 요약 */
export function freshnessDigestLayer(
  meta: FreshnessMetadata,
): "L1" | "L2" | "L3" {
  if (meta.category === "real-time") {
    return "L3";
  }
  if (meta.category === "periodic") {
    return "L2";
  }
  return "L1";
}
