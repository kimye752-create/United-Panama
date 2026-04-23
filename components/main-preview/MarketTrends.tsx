"use client";

import { useCallback, useEffect, useState } from "react";

interface TrendItem {
  headline: string;
  meta_line: string;
  url?: string;
  category?: "파나마 현지" | "한국 발행" | "글로벌";
  /** API가 주면 정렬 시 우선 사용 */
  publishedAt?: string;
}

/** ISO 또는 연도만(YYYY) — 연도만이면 해당 연 12/31로 보정 */
function parseNewsDate(dateStr: string): number {
  const t = dateStr.trim();
  if (/^\d{4}$/.test(t)) {
    return new Date(`${t}-12-31T23:59:59.000Z`).getTime();
  }
  const ms = new Date(t).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

/** 발행일 기준 정렬 키 — publishedAt 없으면 meta_line에서 추출 */
function sortKeyFromTrendItem(item: TrendItem): number {
  if (item.publishedAt !== undefined && item.publishedAt.trim() !== "") {
    return parseNewsDate(item.publishedAt);
  }
  const meta = item.meta_line.trim();
  const parts = meta.split("·").map((s) => s.trim());
  const last = parts[parts.length - 1] ?? "";
  if (last !== "" && (/^\d{4}-\d{2}-\d{2}$/.test(last) || /^\d{4}$/.test(last))) {
    return parseNewsDate(last);
  }
  const iso = meta.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (iso !== null) {
    return parseNewsDate(iso[1]);
  }
  const years = meta.match(/\b(20\d{2})\b/g);
  if (years !== null && years.length > 0) {
    return parseNewsDate(years[years.length - 1]);
  }
  return 0;
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
    const publishedRaw = row["publishedAt"] ?? row["published_at"] ?? row["date"];
    items.push({
      headline: row.headline,
      meta_line: typeof row.meta_line === "string" ? row.meta_line : "",
      url:
        typeof row.url === "string" && /^https?:\/\//i.test(row.url)
          ? row.url
          : undefined,
      category:
        row.category === "파나마 현지" || row.category === "한국 발행" || row.category === "글로벌"
          ? row.category
          : undefined,
      publishedAt: typeof publishedRaw === "string" && publishedRaw.trim() !== "" ? publishedRaw.trim() : undefined,
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

  const load = useCallback(async (force = false) => {
    setLoading(true);
    try {
      const url = force
        ? "/api/panama/dashboard-news?force=1"
        : "/api/panama/dashboard-news";
      const response = await fetch(url, {
        method: "GET",
        cache: "no-store",
      });
      const json = (await response.json()) as unknown;
      const payload = parsePayload(json);
      const sorted = [...payload.items].sort(
        (a, b) => sortKeyFromTrendItem(b) - sortKeyFromTrendItem(a),
      );
      setItems(sorted.slice(0, 6));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

  return (
    <section className="flex h-full min-h-[560px] flex-col rounded-[20px] bg-white p-5 shadow-sh">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="text-[15px] font-bold text-[#1f3e64]">파나마 의약품 시장 주요 동향</h3>
        <button
          type="button"
          onClick={() => {
            void load(true);
          }}
          disabled={loading}
          className="inline-flex h-[30px] min-w-[80px] items-center justify-center whitespace-nowrap rounded-[8px] border border-[#d8e1ee] bg-white px-3 text-[12px] font-normal text-[#1f3e64] hover:bg-[#f4f7fb] disabled:opacity-50"
        >
          ↻ 새로고침
        </button>
      </div>
      <div className="flex flex-1 flex-col space-y-6">
        {items.length === 0 && !loading ? (
          <p className="text-[13px] text-[#6e7f95]">
            시장 동향 데이터가 준비 중입니다.
          </p>
        ) : (
          items.map((item, index) => {
            const rowContent = (
              <>
                <p className="text-[14px] font-semibold leading-snug text-[#1f3e64]">{item.headline}</p>
                <p className="mt-1 text-[12px] font-normal text-[#94a3b8]">{item.meta_line}</p>
              </>
            );
            if (item.url !== undefined) {
              return (
                <a
                  key={`${item.headline}-${String(index)}`}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block transition-opacity hover:opacity-70"
                >
                  {rowContent}
                </a>
              );
            }
            return (
              <article
                key={`${item.headline}-${String(index)}`}
              >
                {rowContent}
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}

