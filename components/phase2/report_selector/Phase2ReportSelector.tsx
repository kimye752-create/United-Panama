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
      className="h-[46px] w-full rounded-[12px] border border-[#dbe4f2] bg-[#eaf0f8] px-3 text-[13px] font-semibold text-[#273e5f] shadow-sh3 outline-none focus:border-[#c8d4e8] focus:ring-2 focus:ring-navy/15"
    >
      <option value="">보고서를 선택하세요</option>
      {options.map((opt) => (
        <option key={opt.id} value={opt.id}>
          {opt.productId} · Case {opt.caseGrade} · {new Date(opt.generatedAt).toLocaleString("ko-KR")}
        </option>
      ))}
    </select>
  );
}
