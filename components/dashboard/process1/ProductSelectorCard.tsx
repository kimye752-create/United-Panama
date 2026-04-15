"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Card } from "../shared/Card";
import { PRODUCTS } from "@/src/lib/dashboard/product_dictionary";

export function ProductSelectorCard() {
  const [selectedUuid, setSelectedUuid] = useState<string>(PRODUCTS[0].uuid);
  const selected = useMemo(
    () => PRODUCTS.find((p) => p.uuid === selectedUuid) ?? PRODUCTS[0],
    [selectedUuid],
  );

  return (
    <Card title="품목 선택 후 파나마 진출 적합 분석 실행">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <select
          value={selectedUuid}
          onChange={(e) => setSelectedUuid(e.target.value)}
          className="h-11 flex-1 rounded-[10px] bg-inner px-3.5 text-[14px] text-text shadow-sh3 outline-none focus:ring-2 focus:ring-navy/20"
        >
          {PRODUCTS.map((item) => (
            <option key={item.uuid} value={item.uuid}>
              {item.brand} — {item.inn}
            </option>
          ))}
        </select>
        <Link
          href={`/panama/report/${selected.brand.toLowerCase().replaceAll(" ", "-")}?inn=${encodeURIComponent(selected.inn)}`}
          className="inline-flex h-11 items-center justify-center rounded-[10px] bg-navy px-6 text-[14px] font-bold text-white transition-colors hover:bg-navy2"
        >
          ▶ 진출 적합 분석
        </Link>
      </div>
      <div className="mt-4 grid grid-cols-4 gap-2">
        {["DB 조회", "Claude 분석", "논문 검색", "PDF 생성"].map((label, idx) => (
          <div key={label} className="flex flex-col items-center gap-1">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-inner text-[11px] font-bold text-muted shadow-sh2">
              {idx + 1}
            </div>
            <div className="text-[11px] text-muted">{label}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}
