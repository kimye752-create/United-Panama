/**
 * `?inn=` 기반으로 품목 결정 후 보고서 클라이언트 마운트 (useSearchParams → Suspense 필수)
 */
"use client";

import { useSearchParams } from "next/navigation";

import { PanamaReportClient } from "@/components/PanamaReportClient";
import { findProductByInn } from "@/src/utils/product-dictionary";

export function PanamaReportSection() {
  const searchParams = useSearchParams();
  const currentInn = searchParams.get("inn") ?? "Hydroxyurea";
  const product =
    findProductByInn(currentInn) ?? findProductByInn("Hydroxyurea");
  if (product === undefined) {
    return null;
  }
  return (
    <PanamaReportClient product={product} currentInn={currentInn} />
  );
}
