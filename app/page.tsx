import { redirect } from "next/navigation";

/** 첫 화면: 국가 요약 + 품목 토글 — 제품 분석 보고서는 `/panama/report/[inn]` (토글·분석 버튼) */
export default function HomePage() {
  redirect("/panama");
}
