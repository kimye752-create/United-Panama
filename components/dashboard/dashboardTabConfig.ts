/**
 * 대시보드 상단·보조 네비 탭 정의 — TopbarTabs / TabNavigation 단일 출처
 */
export const DASHBOARD_PRIMARY_TABS = [
  { href: "/", label: "메인 프리뷰" },
  { href: "/analysis", label: "시장조사 분석" },
] as const;

export const DASHBOARD_REPORT_TAB = { href: "/reports", label: "보고서" } as const;

/** TabNavigation 등 보고서 탭을 포함한 전체 순서 */
export const DASHBOARD_FULL_TABS = [
  ...DASHBOARD_PRIMARY_TABS,
  DASHBOARD_REPORT_TAB,
] as const;
