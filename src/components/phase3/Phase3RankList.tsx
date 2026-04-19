"use client";

import { useState } from "react";

import type { PartnerWithDynamicPsi } from "@/src/lib/phase3/psi-calculator";

import { Phase3PartnerListRow } from "./Phase3PartnerListRow";

interface Phase3RankListProps {
  partners: PartnerWithDynamicPsi[];
  onOpen: (partner: PartnerWithDynamicPsi) => void;
}

/** 11~20위 — 접기/펼치기(기본 펼침), 후보 리스트 */
export function Phase3RankList({ partners, onOpen }: Phase3RankListProps) {
  const [isListOpen, setIsListOpen] = useState(true);

  if (partners.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => {
          setIsListOpen((v) => !v);
        }}
        className="flex w-full items-center justify-between rounded-lg p-3 hover:bg-slate-50"
      >
        <span className="font-semibold text-slate-700">
          {isListOpen ? "▼" : "▶"} 11~20위 · 후보 리스트
        </span>
        <span className="text-xs text-slate-500">
          {isListOpen ? "접기" : `펼치기 (${String(partners.length)}개)`}
        </span>
      </button>

      {isListOpen ? (
        <div className="mt-2 flex max-h-[min(60vh,480px)] flex-col gap-2 overflow-y-auto pr-1">
          {partners.map((p) => (
            <Phase3PartnerListRow key={p.id} partner={p} onOpen={onOpen} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
