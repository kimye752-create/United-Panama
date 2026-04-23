import { redirect } from "next/navigation";

/** 구형 /reports 페이지 — 신형 통합 분석 페이지로 리다이렉트 */
export default function ReportsPage() {
  redirect("/analysis");
}
