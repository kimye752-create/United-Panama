"use client";

import { TermTooltip } from "@/components/ui/TermTooltip";

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
          <TermTooltip term="공공시장" position="bottom">공공 시장</TermTooltip>
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
          <TermTooltip term="민간시장" position="bottom">민간 시장</TermTooltip>
        </button>
      </div>

      {/* 채널 설명 */}
      <p className="mt-2 text-xs leading-relaxed text-[#4a5a6f]">
        {selected === "public"
          ? (<><TermTooltip term="ALPS">ALPS</TermTooltip>{" 조달청 채널 · 27개 공공기관 통합구매 기준"}</>)
          : "민간 시장: 병원·약국·체인 채널 중심 유통 구조 기준"}
      </p>

      {/* 공공/민간 비교 주의사항 (Phase 0) */}
      <p className="mt-2 rounded border border-sky-100 bg-sky-50 px-2.5 py-1.5 text-[11px] leading-relaxed text-sky-800">
        💡 <strong>비교 주의:</strong>{" "}
        공공 시장 가격은 <TermTooltip term="ALPS" position="bottom">ALPS</TermTooltip>{" "}
        낙찰 경쟁 구조상 민간 시장보다{" "}
        <span className="font-semibold">높게 산출될 수 있습니다.</span>{" "}
        채널 선택 전 현지 파트너의 실거래가를 반드시 확인하십시오.
      </p>
    </div>
  );
}
