"use client";

import { useState } from "react";

import type { PartnerWithDynamicPsi } from "@/src/lib/phase3/psi-calculator";

import { Phase3PartnerListRow } from "./Phase3PartnerListRow";

interface Phase3RankListProps {
  partners: PartnerWithDynamicPsi[];
  onRowClick: (partnerId: string) => void;
}

/** 11~20위 — 접기/펼치기(기본 펼침) */
export function Phase3RankList({ partners, onRowClick }: Phase3RankListProps) {
  const [isOpen, setIsOpen] = useState(true);

  if (partners.length === 0) {
    return null;
  }

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={() => {
          setIsOpen((v) => !v);
        }}
        className="flex w-full items-center justify-between rounded-lg p-3 transition-colors hover:bg-slate-50"
      >
        <span className="font-semibold text-slate-700">
          {isOpen ? "▼" : "▶"} 11~20위 · 후보 리스트
        </span>
        <span className="text-xs text-slate-500">
          {isOpen ? "접기" : `펼치기 (${String(partners.length)}개)`}
        </span>
      </button>

      {isOpen ? (
        <div className="mt-2 space-y-2">
          {partners.map((p, index) => (
            <Phase3PartnerListRow
              key={p.partner_id}
              partner={p}
              currentRank={index + 11}
              onRowClick={onRowClick}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
