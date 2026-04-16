"use client";

export interface Phase2ReportOption {
  id: string;
  productId: string;
  caseGrade: string;
  generatedAt: string;
}

interface Phase2ReportSelectorProps {
  options: Phase2ReportOption[];
  value: string;
  onChange: (next: string) => void;
}

export function Phase2ReportSelector({ options, value, onChange }: Phase2ReportSelectorProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-[42px] w-full rounded-[12px] bg-white px-3 text-[12px] font-semibold text-[#253753] shadow-sh2 outline-none focus:ring-2 focus:ring-navy/20"
    >
      <option value="">저장된 1공정 보고서를 선택하세요</option>
      {options.map((opt) => (
        <option key={opt.id} value={opt.id}>
          {opt.productId} · Case {opt.caseGrade} · {new Date(opt.generatedAt).toLocaleString("ko-KR")}
        </option>
      ))}
    </select>
  );
}
