/**
 * 규제 마일스톤 카드 — DB pa_milestone_type → 한글 라벨·배경 클래스
 */

/** fast_track_designation → 패스트트랙 지정 등 */
export function milestoneTypeLabelKo(
  type: string | null | undefined,
): string {
  switch (type) {
    case "fast_track_designation":
      return "패스트트랙 지정";
    case "price_system_reform":
      return "가격 시스템 개혁";
    default:
      return type !== undefined && type !== null && type !== ""
        ? type
        : "규제 마일스톤";
  }
}

export function milestoneCardBgClass(
  type: string | null | undefined,
): string {
  switch (type) {
    case "fast_track_designation":
      return "bg-emerald-50";
    case "price_system_reform":
      return "bg-amber-50";
    default:
      return "bg-slate-50";
  }
}
