import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { AnalysisWorkspace } from "@/components/main-preview/AnalysisWorkspace";

export const metadata = {
  title: "시장 분석 | 한국유나이티드제약 해외 영업·마케팅 대시보드",
};

export default function AnalysisPage() {
  return (
    <DashboardShell>
      <AnalysisWorkspace />
    </DashboardShell>
  );
}
