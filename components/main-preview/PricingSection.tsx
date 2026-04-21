"use client";

import { useCallback, useEffect, useState } from "react";

import { MarketSegmentTabs } from "@/components/main-preview/MarketSegmentTabs";
import { PricingCards } from "@/components/main-preview/PricingCards";
import type { SessionListItem } from "@/app/api/panama/report/sessions/route";

export interface ReportFlowProduct {
  id: string;
  name: string;
  ingredient: string;
  category: string;
  displayLabel?: string;   // 드롭다운 표기 — 지정된 정확한 문구
}

interface Props {
  products: ReportFlowProduct[];
  onSessionReady?: (sessionId: string) => void;
}

/** ISO → "MM. DD. 오전/오후 HH:MM" 포맷 */
function fmtDate(iso: string): string {
  try {
    const d = new Date(iso);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const h = d.getHours();
    const ampm = h < 12 ? "오전" : "오후";
    const hh = String(h % 12 || 12).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${mm}. ${dd}. ${ampm} ${hh}:${min}`;
  } catch {
    return iso.slice(0, 10);
  }
}

export function PricingSection({ products, onSessionReady }: Props) {
  // ── 시장조사 섹션 state ──────────────────────────────────────
  const [selectedProduct, setSelectedProduct] = useState<ReportFlowProduct | null>(null);
  const [marketLoading, setMarketLoading] = useState(false);
  const [lastSessionId, setLastSessionId] = useState<string | null>(null);

  // ── 저장된 보고서 목록 state ──────────────────────────────────
  const [savedSessions, setSavedSessions] = useState<SessionListItem[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");

  // ── 가격 산출 섹션 state ──────────────────────────────────────
  const [selectedSegment, setSelectedSegment] = useState<"public" | "private">("private");
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingData, setPricingData] = useState<{ public: unknown; private: unknown } | null>(null);

  // ─── 저장된 세션 목록 조회 ────────────────────────────────────
  const fetchSessions = useCallback(async (productId?: string) => {
    setSessionsLoading(true);
    try {
      const qs = productId ? `?productId=${encodeURIComponent(productId)}` : "";
      const res = await fetch(`/api/panama/report/sessions${qs}`);
      if (!res.ok) return;
      const data = (await res.json()) as { items?: SessionListItem[] };
      setSavedSessions(data.items ?? []);
    } catch {
      /* 무시 */
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  // 초기 로딩 (전체 목록)
  useEffect(() => {
    void fetchSessions();
  }, [fetchSessions]);

  // ─── 시장조사 실행 ────────────────────────────────────────────
  async function handleRunMarket() {
    if (selectedProduct === null) return;
    setMarketLoading(true);
    setPricingData(null);
    try {
      const res = await fetch("/api/panama/report/session/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: selectedProduct.id, country: "panama" }),
      });
      const data: unknown = await res.json();
      if (!res.ok) throw new Error((data as { detail?: string }).detail ?? "INIT_FAILED");
      const ok = data as { sessionId: string };
      setLastSessionId(ok.sessionId);
      setSelectedSessionId(ok.sessionId);
      onSessionReady?.(ok.sessionId);
      // 목록 갱신
      await fetchSessions(selectedProduct.id);
    } catch {
      /* 실패 무시 */
    } finally {
      setMarketLoading(false);
    }
  }

  // ─── AI 가격 산출 실행 ────────────────────────────────────────
  async function handleRunPricing() {
    if (selectedSessionId === "") return;
    setPricingLoading(true);
    setPricingData(null);
    try {
      const res = await fetch("/api/panama/report/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: selectedSessionId }),
      });
      const data: unknown = await res.json();
      if (!res.ok) throw new Error((data as { detail?: string }).detail ?? "PRICING_FAILED");
      const ok = data as { publicData?: unknown; privateData?: unknown };
      setPricingData({ public: ok.publicData ?? null, private: ok.privateData ?? null });
    } catch {
      /* 실패 무시 */
    } finally {
      setPricingLoading(false);
    }
  }

  const canRunMarket = selectedProduct !== null && !marketLoading;
  const canRunPricing = selectedSessionId !== "" && !pricingLoading;

  return (
    <section className="rounded-xl border border-[#d9e2ef] bg-white shadow-sh2">
      {/* ── 헤더 ── */}
      <div className="flex items-center gap-2.5 border-b border-[#edf1f7] px-5 py-3.5">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy text-[11px] font-extrabold text-white">
          01
        </span>
        <h2 className="text-[15px] font-extrabold tracking-[-0.02em] text-[#1a2e4a]">
          수출가격 전략
        </h2>
      </div>

      <div className="p-4">
        {/* ── Part 1: 시장조사 ── */}
        <div className="mb-4">
          <div className="flex flex-wrap items-center gap-2">
            {/* 품목 드롭다운 */}
            <select
              className="min-w-0 flex-1 rounded-lg border border-[#d9e2ef] bg-white px-3 py-2 text-[13px] text-[#273f60] shadow-sm focus:outline-none focus:ring-2 focus:ring-navy/30"
              value={selectedProduct?.id ?? ""}
              onChange={(e) => {
                const p = products.find((x) => x.id === e.target.value) ?? null;
                setSelectedProduct(p);
                setPricingData(null);
                setLastSessionId(null);
                if (p !== null) void fetchSessions(p.id);
              }}
            >
              <option value="">품목을 선택하세요</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.displayLabel ?? `[${p.category}] ${p.name} · ${p.ingredient}`}
                </option>
              ))}
            </select>

            {/* 시장 조사 버튼 */}
            <button
              type="button"
              disabled={!canRunMarket}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-navy px-4 py-2 text-[13px] font-extrabold text-white shadow-sm transition-opacity disabled:opacity-40"
              onClick={() => { void handleRunMarket(); }}
            >
              {marketLoading ? (
                <><span className="animate-spin">⟳</span> 분석 중...</>
              ) : (
                <>▶ 시장 조사</>
              )}
            </button>
          </div>

          {/* 신약 직접 분석 링크 */}
          <p className="mt-1.5 text-[12px] text-[#7a8fa8]">
            <span className="mr-1 opacity-60">·</span>
            <button
              type="button"
              className="underline-offset-2 hover:underline"
              onClick={() => {
                // TODO: 신약 직접 분석 모달
              }}
            >
              신약 직접 분석
            </button>
          </p>
        </div>

        {/* 구분선 */}
        <div className="mb-4 border-t border-dashed border-[#e8eef5]" />

        {/* ── Part 2: 저장된 보고서 선택 + 가격 산출 ── */}
        <div>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-[#9aafc5]">
            품목 선택
          </p>

          {/* 저장된 분석 보고서 드롭다운 */}
          <select
            className="w-full rounded-lg border border-[#d9e2ef] bg-white px-3 py-2 text-[13px] text-[#273f60] shadow-sm focus:outline-none focus:ring-2 focus:ring-navy/30"
            value={selectedSessionId}
            onChange={(e) => {
              setSelectedSessionId(e.target.value);
              setPricingData(null);
              // PartnerSection에 세션 공유
              if (e.target.value !== "") onSessionReady?.(e.target.value);
            }}
          >
            <option value="">
              {sessionsLoading ? "불러오는 중..." : "저장된 분석 보고서를 선택하세요."}
            </option>
            {savedSessions.map((s) => (
              <option key={s.sessionId} value={s.sessionId}>
                시장조사 보고서 · {s.productName} · {fmtDate(s.createdAt)}
                {s.sessionId === lastSessionId ? " (방금 실행)" : ""}
              </option>
            ))}
          </select>

          {/* 공공/민간 탭 + AI 가격 산출 */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={`rounded-lg px-4 py-2 text-[13px] font-semibold transition-colors ${
                selectedSegment === "public"
                  ? "bg-navy text-white"
                  : "border border-[#d9e2ef] bg-white text-[#273f60] hover:bg-[#f0f4f9]"
              }`}
              onClick={() => { setSelectedSegment("public"); setPricingData(null); }}
            >
              공공 시장
            </button>
            <button
              type="button"
              className={`rounded-lg px-4 py-2 text-[13px] font-semibold transition-colors ${
                selectedSegment === "private"
                  ? "bg-navy text-white"
                  : "border border-[#d9e2ef] bg-white text-[#273f60] hover:bg-[#f0f4f9]"
              }`}
              onClick={() => { setSelectedSegment("private"); setPricingData(null); }}
            >
              민간 시장
            </button>

            <button
              type="button"
              disabled={!canRunPricing}
              className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-navy px-4 py-2 text-[13px] font-extrabold text-white shadow-sm transition-opacity disabled:opacity-40"
              onClick={() => { void handleRunPricing(); }}
            >
              {pricingLoading ? (
                <><span className="animate-spin">⟳</span> 산출 중...</>
              ) : (
                <>▶ AI 가격 산출</>
              )}
            </button>
          </div>
        </div>

        {/* ── 가격 결과 ── */}
        {pricingData !== null && (
          <>
            <MarketSegmentTabs
              selected={selectedSegment}
              onSelect={(seg) => { setSelectedSegment(seg); }}
            />
            <PricingCards
              data={selectedSegment === "public" ? pricingData.public : pricingData.private}
            />
          </>
        )}
      </div>
    </section>
  );
}
