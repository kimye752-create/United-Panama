"use client";

export type Phase2Tab = "ai" | "manual";

interface Phase2TabSelectorProps {
  activeTab: Phase2Tab;
  onChange: (tab: Phase2Tab) => void;
}

export function Phase2TabSelector({ activeTab, onChange }: Phase2TabSelectorProps) {
  const tabs: Array<{ key: Phase2Tab; label: string }> = [
    { key: "ai", label: "AI 파이프라인" },
    { key: "manual", label: "직접 입력" },
  ];

  return (
    <div className="inline-flex items-center gap-2 rounded-[12px] bg-inner p-1 shadow-sh3">
      {tabs.map((tab) => {
        const active = tab.key === activeTab;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={`rounded-[10px] px-5 py-2 text-[12px] font-extrabold transition-colors ${
              active
                ? "bg-navy text-white shadow-sh2"
                : "bg-navy/10 text-muted hover:bg-navy/15 hover:text-navy"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
