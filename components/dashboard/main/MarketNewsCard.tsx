"use client";

import { useCallback, useEffect, useState } from "react";

import { Card, IRow } from "../shared/Card";

type NewsPayload = {
  items: Array<{ headline: string; meta_line: string }>;
  generated_at?: string;
  source?: string;
  warning?: string;
};

async function fetchNews(): Promise<NewsPayload> {
  const res = await fetch("/api/panama/dashboard-news", {
    method: "GET",
    cache: "no-store",
  });
  const json = (await res.json()) as unknown;
  if (typeof json !== "object" || json === null || Array.isArray(json)) {
    throw new Error("뉴스 API 응답 형식이 올바르지 않습니다.");
  }
  const obj = json as Record<string, unknown>;
  const itemsRaw = obj["items"];
  if (!Array.isArray(itemsRaw)) {
    throw new Error("뉴스 items 배열이 없습니다.");
  }
  const items: Array<{ headline: string; meta_line: string }> = [];
  for (const row of itemsRaw) {
    if (typeof row !== "object" || row === null || Array.isArray(row)) {
      continue;
    }
    const r = row as Record<string, unknown>;
    const headline = typeof r.headline === "string" ? r.headline : "";
    const meta_line = typeof r.meta_line === "string" ? r.meta_line : "";
    if (headline.trim() !== "") {
      items.push({ headline: headline.trim(), meta_line: meta_line.trim() });
    }
  }
  return {
    items,
    generated_at: typeof obj.generated_at === "string" ? obj.generated_at : undefined,
    source: typeof obj.source === "string" ? obj.source : undefined,
    warning: typeof obj.warning === "string" ? obj.warning : undefined,
  };
}

export function MarketNewsCard() {
  const [items, setItems] = useState<Array<{ headline: string; meta_line: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setWarning(null);
    try {
      const data = await fetchNews();
      setItems(data.items.length > 0 ? data.items : []);
      if (data.warning !== undefined && data.warning.trim() !== "") {
        setWarning(data.warning);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Card
      title="시장 신호 · 뉴스"
      subtitle="파나마 의약품 시장 주요 동향 · Perplexity 실시간"
      rightSlot={
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex h-[34px] min-w-[92px] items-center justify-center whitespace-nowrap rounded-[10px] border border-navy/15 bg-white px-3 text-[12px] font-extrabold text-navy hover:bg-navy/5 disabled:opacity-50"
        >
          ↺ 새로고침
        </button>
      }
    >
      {error !== null ? (
        <p className="rounded-[13px] bg-inner px-3.5 py-3 text-[12px] text-red-700">{error}</p>
      ) : null}
      {warning !== null && error === null ? (
        <p className="mb-2 rounded-[13px] bg-amber-50 px-3.5 py-2 text-[10.5px] text-amber-900">{warning}</p>
      ) : null}
      <div className="space-y-2">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <IRow key={`sk-${String(i)}`}>
                <div className="h-3.5 w-full animate-pulse rounded bg-navy/10" />
                <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-navy/5" />
              </IRow>
            ))
            : items.length === 0
              ? (
                  <p className="rounded-[13px] bg-inner px-3.5 py-3 text-[12px] text-muted">
                    표시할 뉴스가 없습니다. 새로고침을 눌러 다시 시도하세요.
                  </p>
                )
              : items.map((item, index) => (
              <IRow key={`news-${String(index)}`}>
                <div className="text-[12px] font-bold leading-relaxed text-navy">{item.headline}</div>
                <div className="mt-1 text-[10.5px] text-muted">{item.meta_line}</div>
              </IRow>
            ))}
      </div>
    </Card>
  );
}
