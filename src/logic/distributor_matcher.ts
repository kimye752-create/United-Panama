/**
 * Case 유형별 유통사 우선순위 — REPORT1_SPEC 블록 4-3
 */
import type { DistributorRow } from "./fetch_panama_data";

export function matchDistributorsForProduct(
  caseType: "A" | "B" | "C",
  distributors: readonly DistributorRow[],
): DistributorRow[] {
  const list = [...distributors];

  const score = (d: DistributorRow): number => {
    const t = (d.target_market ?? "").toLowerCase();
    let pri = 0;
    if (caseType === "A") {
      if (t === "public") {
        pri = 3;
      } else if (t === "both") {
        pri = 2;
      } else {
        pri = 0;
      }
    } else if (caseType === "B") {
      if (t === "private") {
        pri = 3;
      } else if (t === "both") {
        pri = 2;
      } else {
        pri = 0;
      }
    } else {
      pri = 1;
    }
    const ahp = d.ahp_psi_score ?? 0;
    return pri * 1000 + ahp;
  };

  list.sort((a, b) => score(b) - score(a));
  if (caseType === "C") {
    return list;
  }
  return list.filter((d) => {
    const t = (d.target_market ?? "").toLowerCase();
    if (caseType === "A") {
      return t === "public" || t === "both";
    }
    if (caseType === "B") {
      return t === "private" || t === "both";
    }
    return true;
  });
}
