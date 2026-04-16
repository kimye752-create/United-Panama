"use client";

import type { Phase2MarketSegment } from "@/src/logic/phase2/margin_policy_resolver";

interface Phase2MarketSegmentProps {
  value: Phase2MarketSegment;
  onChange: (next: Phase2MarketSegment) => void;
}

export function Phase2MarketSegment({ value, onChange }: Phase2MarketSegmentProps) {
  const options: Array<{ key: Phase2MarketSegment; label: string }> = [
    { key: "public", label: "공공 시장" },
    { key: "private", label: "민간 시장" },
  ];

  return (
    <div className="inline-flex items-center gap-2 rounded-[12px] bg-inner p-1 shadow-sh3">
      {options.map((opt) => {
        const active = value === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            className={`rounded-[10px] px-4 py-2 text-[12px] font-extrabold transition-colors ${
              active
                ? "bg-navy text-white shadow-sh2"
                : "bg-navy/10 text-muted hover:bg-navy/15 hover:text-navy"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
