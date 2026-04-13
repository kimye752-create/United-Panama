import { redirect } from "next/navigation";

/**
 * 루트 접속 시 A4형 제품 보고서(Report1) 기본 진입 — Vercel 배포 첫 화면과 동일 경험
 * 국가 요약(거시 카드 등): /panama
 */
export default function HomePage() {
  redirect("/panama/report/hydroxyurea");
}
