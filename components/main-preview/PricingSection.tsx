"use client";

import { useState } from "react";

import { MarketSegmentTabs } from "@/components/main-preview/MarketSegmentTabs";
import { PricingCards } from "@/components/main-preview/PricingCards";

export interface ReportFlowProduct {
  id: string;
  name: string;
  ingredient: string;
  category: string;
}

interface Props {
  products: ReportFlowProduct[];
  onSessionReady?: (sessionId: string) => void;
}

export function PricingSection({ products, onSessionReady }: Props) {
  const [selectedProduct, setSelectedProduct] = useState<ReportFlowProduct | null>(
    null,
  );
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [marketReady, setMarketReady] = useState(false);
  const [pricingData, setPricingData] = useState<{
    public: unknown;
    private: unknown;
  } | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<"public" | "private">(
    "private",
  );
  const [loading, setLoading] = useState<"idle" | "market" | "pricing">("idle");

  async function handleProductChange(product: ReportFlowProduct) {
    setSelectedProduct(product);
    setMarketReady(false);
    setPricingData(null);
    setLoading("market");

    try {
      const res = await fetch("/api/panama/report/session/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          country: "panama",
        }),
      });

      const data: unknown = await res.json();
      if (!res.ok) {
        const err = data as { detail?: string; error?: string };
        throw new Error(err.detail ?? err.error ?? "SESSION_INIT_FAILED");
      }

      const ok = data as { sessionId?: string };
      if (typeof ok.sessionId !== "string") {
        throw new Error("sessionId 누락");
      }

      setSessionId(ok.sessionId);
      setMarketReady(true);
      onSessionReady?.(ok.sessionId);
    } catch {
      /* 시장조사 세션 실패 — UI는 조용히 두고 네트워크 탭으로 확인 */
    } finally {
      setLoading("idle");
    }
  }

  async function handleRunPricing() {
    if (sessionId === null) {
      return;
    }

    setLoading("pricing");

    try {
      const res = await fetch("/api/panama/report/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      const data: unknown = await res.json();
      if (!res.ok) {
        const err = data as { detail?: string; error?: string };
        throw new Error(err.detail ?? err.error ?? "PRICING_FAILED");
      }

      const ok = data as { publicData?: unknown; privateData?: unknown };
      setPricingData({
        public: ok.publicData ?? null,
        private: ok.privateData ?? null,
      });
    } catch {
      /* 가격 분석 실패 */
    } finally {
      setLoading("idle");
    }
  }

  return (
    <section className="rounded-xl border border-[#d9e2ef] bg-white p-4 shadow-sh2">
      <header className="mb-3 flex items-baseline gap-2">
        <span className="text-xs font-extrabold text-[#7a8aa0]">01</span>
        <h2 className="text-base font-extrabold text-[#273f60]">수출가격 전략 (세션 연동)</h2>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <select
          className="min-w-[220px] rounded-md border border-[#d9e2ef] px-3 py-2 text-sm"
          value={selectedProduct?.id ?? ""}
          onChange={(e) => {
            const p = products.find((x) => x.id === e.target.value);
            if (p !== undefined) {
              void handleProductChange(p);
            }
          }}
        >
          <option value="">품목 선택</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              [{p.category}] {p.name} · {p.ingredient}
            </option>
          ))}
        </select>

        <button
          type="button"
          disabled={!marketReady || loading !== "idle"}
          className="rounded-md bg-[#273f60] px-4 py-2 text-sm font-extrabold text-white disabled:opacity-40"
          onClick={() => {
            void handleRunPricing();
          }}
        >
          {loading === "market"
            ? "분석 준비 중..."
            : loading === "pricing"
              ? "가격 분석 실행 중..."
              : "▶ AI 가격 분석 실행"}
        </button>
      </div>

      {marketReady && pricingData === null && selectedProduct !== null && (
        <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          ✅ {selectedProduct.name} 시장조사 세션 준비됨 — 가격 분석을 실행하세요.
        </div>
      )}

      {pricingData !== null && (
        <>
          <MarketSegmentTabs
            selected={selectedSegment}
            onSelect={setSelectedSegment}
          />
          <PricingCards
            data={
              selectedSegment === "public"
                ? pricingData.public
                : pricingData.private
            }
          />
        </>
      )}
    </section>
  );
}
