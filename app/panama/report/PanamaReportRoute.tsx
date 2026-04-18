/**
 * `?inn=` 기반 보고서 마운트 — useSearchParams는 Suspense 경계 필요
 */
"use client";

import { useSearchParams } from "next/navigation";

import { PanamaReportClient } from "@/components/PanamaReportClient";
import { findProductByInn } from "@/src/utils/product-dictionary";

export function PanamaReportRoute() {
  const searchParams = useSearchParams();
  const rawInn = searchParams.get("inn");
  const currentInn =
    rawInn !== null && rawInn.trim() !== "" ? rawInn.trim() : null;
  if (currentInn === null) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center text-slate-700">
        <p>INN 파라미터가 없습니다. 올바른 보고서 링크로 다시 접속해 주세요.</p>
      </main>
    );
  }
  const product = findProductByInn(currentInn);
  if (product === undefined) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center text-slate-700">
        <p>알 수 없는 INN입니다: {currentInn}</p>
      </main>
    );
  }
  return (
    <PanamaReportClient product={product} currentInn={currentInn} />
  );
}
