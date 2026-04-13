/**
 * `?inn=` 기반 보고서 마운트 — useSearchParams는 Suspense 경계 필요
 */
"use client";

import { useSearchParams } from "next/navigation";

import { PanamaReportClient } from "@/components/PanamaReportClient";
import { findProductByInn } from "@/src/utils/product-dictionary";

const DEFAULT_INN = "Hydroxyurea";

export function PanamaReportRoute() {
  const searchParams = useSearchParams();
  const rawInn = searchParams.get("inn");
  const currentInn =
    rawInn !== null && rawInn.trim() !== "" ? rawInn.trim() : DEFAULT_INN;
  const product =
    findProductByInn(currentInn) ?? findProductByInn(DEFAULT_INN);
  if (product === undefined) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center text-slate-700">
        <p>알 수 없는 INN입니다.</p>
      </main>
    );
  }
  return (
    <PanamaReportClient product={product} currentInn={currentInn} />
  );
}
