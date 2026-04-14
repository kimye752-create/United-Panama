/**
 * 8 INN 선택 → 랜딩 하단에서 즉시 보고서 렌더링 (Client)
 */
"use client";

import { useState } from "react";

import { PanamaReportClient } from "@/components/PanamaReportClient";
import { TARGET_PRODUCTS } from "@/src/utils/product-dictionary";

export function ProductSelector() {
  const first = TARGET_PRODUCTS[0];
  const [productId, setProductId] = useState(first?.product_id ?? "");
  const [activeInn, setActiveInn] = useState<string | null>(null);
  const activeProduct =
    activeInn === null
      ? null
      : TARGET_PRODUCTS.find((x) => x.who_inn_en === activeInn) ?? null;

  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label htmlFor="inn-select" className="text-sm font-medium text-slate-700">
          품목 선택
        </label>
        <select
          id="inn-select"
          className="rounded border border-slate-300 bg-white px-3 py-2 text-sm"
          value={productId}
          onChange={(e) => {
            setProductId(e.target.value);
          }}
        >
          {TARGET_PRODUCTS.map((p) => (
            <option key={p.product_id} value={p.product_id}>
              {p.kr_brand_name} — {p.who_inn_en}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="rounded bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900"
          onClick={() => {
            const p = TARGET_PRODUCTS.find((x) => x.product_id === productId);
            if (p === undefined) {
              return;
            }
            setActiveInn(p.who_inn_en);
          }}
        >
          분석 (A4 보고서)
        </button>
      </div>

      {activeProduct !== null ? (
        <div className="w-full border-t border-slate-200 pt-6">
          <PanamaReportClient
            product={activeProduct}
            currentInn={activeProduct.who_inn_en}
          />
        </div>
      ) : null}
    </div>
  );
}
