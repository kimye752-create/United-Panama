"use client";

interface Props {
  selected: "public" | "private";
  onSelect: (segment: "public" | "private") => void;
}

export function MarketSegmentTabs({ selected, onSelect }: Props) {
  return (
    <div className="market-tabs mt-3 rounded-lg border border-[#d9e2ef] bg-[#f7fafc] p-3">
      <div className="flex gap-2">
        <button
          type="button"
          className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
            selected === "public"
              ? "bg-[#273f60] text-white"
              : "bg-white text-[#273f60] ring-1 ring-[#d9e2ef]"
          }`}
          onClick={() => {
            onSelect("public");
          }}
        >
          공공 시장
        </button>
        <button
          type="button"
          className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
            selected === "private"
              ? "bg-[#273f60] text-white"
              : "bg-white text-[#273f60] ring-1 ring-[#d9e2ef]"
          }`}
          onClick={() => {
            onSelect("private");
          }}
        >
          민간 시장
        </button>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-[#4a5a6f]">
        {selected === "public"
          ? "공공 시장: ALPS 조달청 채널 · 27개 공공기관 통합구매 기준"
          : "민간 시장: 병원·약국·체인 채널 중심 유통 구조 기준"}
      </p>
    </div>
  );
}
