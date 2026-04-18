import type { StoredReportItem } from "@/src/lib/dashboard/reports_store";

interface Phase3ReportToolbarProps {
  reports: StoredReportItem[];
  reportId: string;
  onReportChange: (id: string) => void;
  loading: boolean;
  isActive: boolean;
  productId: string | null;
  onRun: () => void;
}

function formatReportLabel(item: StoredReportItem): string {
  const date = new Date(item.analyzedAt);
  if (Number.isNaN(date.getTime())) {
    return `1공정 보고서 · ${item.productBrandName} · 날짜 미상`;
  }
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `1공정 보고서 · ${item.productBrandName} · ${y}-${m}-${d} ${hh}:${mm}`;
}

export function Phase3ReportToolbar({
  reports,
  reportId,
  onReportChange,
  loading,
  isActive,
  productId,
  onRun,
}: Phase3ReportToolbarProps) {
  return (
    <div className="grid gap-2 md:grid-cols-[1fr_auto]">
      <select
        value={reportId}
        onChange={(e) => {
          onReportChange(e.target.value);
        }}
        className="h-[40px] rounded-[10px] border border-[#dce4f0] bg-[#edf2f9] px-3 text-[12px] font-semibold text-[#273f60] outline-none focus:ring-2 focus:ring-[#1E3A5F]/20"
      >
        <option value="">보고서를 선택하세요</option>
        {reports.map((r) => (
          <option key={r.id} value={r.id}>
            {formatReportLabel(r)}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => {
          onRun();
        }}
        disabled={!isActive || loading || reportId === "" || productId === null}
        className="h-[40px] rounded-[10px] bg-[#1E4E8C] px-5 text-[12px] font-extrabold text-white hover:bg-[#1a4378] disabled:opacity-60"
      >
        {loading ? "불러오는 중…" : "▶ 3공정 실행"}
      </button>
    </div>
  );
}
