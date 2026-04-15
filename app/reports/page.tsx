import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { GeneratedReportsList } from "@/components/dashboard/reports/GeneratedReportsList";

export default function ReportsPage() {
  return (
    <DashboardShell>
      <GeneratedReportsList />
    </DashboardShell>
  );
}
