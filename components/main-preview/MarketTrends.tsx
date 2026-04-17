"use client";

import { useCallback, useEffect, useState } from "react";

interface TrendItem {
  headline: string;
  meta_line: string;
}

interface TrendPayload {
  items: TrendItem[];
  warning?: string;
}

function parsePayload(raw: unknown): TrendPayload {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return { items: [] };
  }
  const record = raw as Record<string, unknown>;
  const itemsRaw = Array.isArray(record.items) ? record.items : [];
  const items: TrendItem[] = [];
  for (const item of itemsRaw) {
    if (item === null || typeof item !== "object" || Array.isArray(item)) {
      continue;
    }
    const row = item as Record<string, unknown>;
    if (typeof row.headline !== "string") {
      continue;
    }
    items.push({
      headline: row.headline,
      meta_line: typeof row.meta_line === "string" ? row.meta_line : "",
    });
  }
  return {
    items,
    warning: typeof record.warning === "string" ? record.warning : undefined,
  };
}

export function MarketTrends() {
  const [items, setItems] = useState<TrendItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/panama/dashboard-news", {
        method: "GET",
        cache: "no-store",
      });
      const json = (await response.json()) as unknown;
      const payload = parsePayload(json);
      setItems(payload.items.slice(0, 6));
      setWarning(payload.warning ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="rounded-[16px] border border-[#e3e9f2] bg-white p-3 shadow-sh2">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-[14px] font-extrabold text-[#1f3e64]">신규조달 의약품 시장 주요 동향</h3>
        <button
          type="button"
          onClick={() => {
            void load();
          }}
          disabled={loading}
          className="inline-flex h-[30px] min-w-[76px] items-center justify-center whitespace-nowrap rounded-[9px] border border-[#d8e1ee] bg-white px-2.5 text-[11px] font-bold text-[#1f3e64] hover:bg-[#f4f7fb] disabled:opacity-50"
        >
          ↻ 새로고침
        </button>
      </div>
      {warning !== null ? (
        <p className="mb-2 rounded-[10px] bg-amber-50 px-2 py-1.5 text-[10px] text-amber-800">{warning}</p>
      ) : null}
      <div className="space-y-2">
        {items.length === 0 && !loading ? (
          <p className="rounded-[10px] bg-[#f7f9fc] px-3 py-3 text-[12px] text-[#6e7f95]">
            시장 동향 데이터가 준비 중입니다.
          </p>
        ) : (
          items.map((item, index) => (
            <article
              key={`${item.headline}-${String(index)}`}
              className="rounded-[10px] bg-[#f5f7fb] px-3 py-2.5"
            >
              <p className="text-[12px] font-bold leading-snug text-[#1f3e64]">{item.headline}</p>
              <p className="mt-1 text-[10.5px] text-[#7d8da2]">{item.meta_line}</p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

