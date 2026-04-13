/**
 * 8개 INN 빠른 전환 — URL `/panama?inn=` 갱신 (panama_report_cache TTL 내 재사용)
 */
"use client";

import { useRouter } from "next/navigation";

import { TARGET_PRODUCTS } from "@/src/utils/product-dictionary";

type Props = {
  currentInn: string;
};

export default function INNTabs({ currentInn }: Props) {
  const router = useRouter();

  return (
    <nav
      className="-mx-1 mb-4 flex gap-2 overflow-x-auto pb-1 sm:flex-wrap"
      aria-label="INN 빠른 전환"
    >
      {TARGET_PRODUCTS.map((p) => {
        const active = p.who_inn_en === currentInn;
        return (
          <button
            key={p.product_id}
            type="button"
            onClick={() => {
              router.push(
                `/panama?inn=${encodeURIComponent(p.who_inn_en)}`,
              );
            }}
            className={
              active
                ? "shrink-0 rounded-lg bg-blue-600 px-3 py-2 text-left text-sm font-bold text-white shadow-sm"
                : "shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-50"
            }
          >
            <span className="block text-xs font-normal leading-tight opacity-95">
              {p.kr_brand_name}
            </span>
            <span
              className={
                active ? "font-bold leading-tight" : "font-medium leading-tight"
              }
            >
              {p.who_inn_en}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
