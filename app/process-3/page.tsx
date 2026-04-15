import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { EmptyPage } from "@/components/dashboard/shared/EmptyPage";

export default function Process3Page() {
  return (
    <DashboardShell>
      <EmptyPage
        message="3공정 · 바이어 발굴은 준비 중입니다"
        sub="추후 업데이트 예정"
      />
    </DashboardShell>
  );
}
