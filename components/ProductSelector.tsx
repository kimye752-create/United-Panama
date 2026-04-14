/**
 * 8 INN 선택 → 랜딩 하단에서 즉시 보고서 렌더링 (Client)
 */
"use client";

import { useMemo, useState } from "react";

import { PanamaReportClient } from "@/components/PanamaReportClient";
import { TARGET_PRODUCTS } from "@/src/utils/product-dictionary";

export function ProductSelector() {
  const sortedProducts = useMemo(() => {
    const priorityBrandOrder = [
      "Rosumeg Combigel",
      "Sereterol Activair",
      "Omethyl Cutielet",
    ];
    return [...TARGET_PRODUCTS].sort((a, b) => {
      const aIdx = priorityBrandOrder.indexOf(a.kr_brand_name);
      const bIdx = priorityBrandOrder.indexOf(b.kr_brand_name);
      if (aIdx >= 0 && bIdx >= 0) {
        return aIdx - bIdx;
      }
      if (aIdx >= 0) {
        return -1;
      }
      if (bIdx >= 0) {
        return 1;
      }
      if (a.panama_target !== b.panama_target) {
        return a.panama_target ? -1 : 1;
      }
      return 0;
    });
  }, []);

  const defaultProduct =
    sortedProducts.find((p) => p.kr_brand_name === "Rosumeg Combigel") ??
    sortedProducts[0];
  const [productId, setProductId] = useState(defaultProduct?.product_id ?? "");
  const [activeInn, setActiveInn] = useState<string | null>(null);
  const activeProduct =
    activeInn === null
      ? null
      : TARGET_PRODUCTS.find((x) => x.who_inn_en === activeInn) ?? null;

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-rose-100 bg-white px-4 py-4 shadow-sm">
        <label
          htmlFor="inn-select"
          className="text-sm font-semibold text-slate-800"
        >
          품목 선택 후 진출 적합 분석 실행
        </label>
        <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center">
        <select
          id="inn-select"
          className="w-full rounded-lg border border-rose-100 bg-rose-50/40 px-3 py-2 text-sm text-slate-700 outline-none focus:border-rose-300"
          value={productId}
          onChange={(e) => {
            setProductId(e.target.value);
          }}
        >
          {sortedProducts.map((p) => (
            <option key={p.product_id} value={p.product_id}>
              {p.kr_brand_name} — {p.who_inn_en}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600"
          onClick={() => {
            const p = TARGET_PRODUCTS.find((x) => x.product_id === productId);
            if (p === undefined) {
              return;
            }
            setActiveInn(p.who_inn_en);
          }}
        >
          ▶ 진출 적합 분석
        </button>
        </div>
      </section>

      {activeProduct !== null ? (
        <div className="w-full border-t border-rose-100 pt-6">
          <PanamaReportClient
            product={activeProduct}
            currentInn={activeProduct.who_inn_en}
          />
        </div>
      ) : null}
    </div>
  );
}
