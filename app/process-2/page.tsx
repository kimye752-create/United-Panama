import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { EmptyPage } from "@/components/dashboard/shared/EmptyPage";

export default function Process2Page() {
  return (
    <DashboardShell>
      <EmptyPage
        message="2공정 · 수출전략은 준비 중입니다"
        sub="추후 업데이트 예정"
      />
    </DashboardShell>
  );
}
