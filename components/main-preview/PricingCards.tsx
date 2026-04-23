"use client";

import { useState } from "react";

import { PricingEditModal } from "@/components/main-preview/PricingEditModal";

type Scenario = "agg" | "avg" | "cons";
type Segment  = "public" | "private";

interface ScenarioCard {
  price_pab: number | null;
  price_usd: number | null;
  price_krw: number | null;
  basis: string;
}

const SCENARIO_KEYS: { key: Scenario; label: string; color: string }[] = [
  { key: "agg",  label: "저가 진입", color: "#C85A00" },
  { key: "avg",  label: "기준가",    color: "#1457A0" },
  { key: "cons", label: "프리미엄",  color: "#1A6B35" },
];

function extractCard(sc: Record<string, unknown>, key: Scenario): ScenarioCard {
  const row = (sc[key] ?? {}) as Record<string, unknown>;
  return {
    price_pab: typeof row["price_pab"] === "number" ? row["price_pab"] : null,
    price_usd: typeof row["price_usd"] === "number" ? row["price_usd"] : null,
    price_krw: typeof row["price_krw"] === "number" ? row["price_krw"] : null,
    basis:     typeof row["basis"]     === "string"  ? row["basis"]     : "",
  };
}

function fmtKrw(krw: number): string {
  return new Intl.NumberFormat("ko-KR").format(Math.round(krw)) + " 원";
}

interface Props {
  segment: Segment;
  data: unknown;
}

export function PricingCards({ segment, data }: Props) {
  const [editModal, setEditModal] = useState<Scenario | null>(null);

  if (data === null || typeof data !== "object") {
    return <p className="mt-2 text-sm text-[#6b7a8f]">표시할 가격 데이터가 없습니다.</p>;
  }

  const root = data as Record<string, unknown>;
  const mr   = root["marketResult"];
  if (!mr || typeof mr !== "object" || Array.isArray(mr)) {
    return <p className="mt-2 text-sm text-[#6b7a8f]">시나리오 구조를 찾을 수 없습니다.</p>;
  }
  const scenarios = (mr as Record<string, unknown>)["scenarios"];
  if (!scenarios || typeof scenarios !== "object" || Array.isArray(scenarios)) {
    return <p className="mt-2 text-sm text-[#6b7a8f]">시나리오가 비어 있습니다.</p>;
  }
  const sc = scenarios as Record<string, unknown>;

  return (
    <div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {SCENARIO_KEYS.map(({ key, label, color }) => {
          const card = extractCard(sc, key);
          return (
            <div
              key={key}
              className="group relative cursor-pointer rounded-xl border border-[#d9e2ef] bg-white p-4 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
              style={{ borderTop: `3px solid ${color}` }}
              onClick={() => { setEditModal(key); }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") setEditModal(key);
              }}
            >
              {/* 라벨 */}
              <p
                className="text-[11px] font-extrabold uppercase tracking-wider"
                style={{ color }}
              >
                {label}
              </p>

              {/* USD 주 가격 */}
              <p className="mt-1.5 text-[22px] font-extrabold leading-none text-navy">
                {card.price_usd !== null ? card.price_usd.toFixed(2) : "—"}
              </p>
              <p className="text-[11px] font-semibold text-[#7a8fa8]">USD</p>

              {/* KRW 환산 (SG의 SGD에 해당) */}
              {card.price_krw !== null && (
                <p className="mt-1 text-[11px] text-[#9aafc5]">
                  {fmtKrw(card.price_krw)}
                </p>
              )}

              {/* 클릭하여 편집 */}
              <p className="mt-3 text-[11px] font-semibold text-[#aab5c4] transition-colors group-hover:text-navy">
                클릭하여 편집
              </p>
            </div>
          );
        })}
      </div>

      {/* 면책 */}
      <p className="mt-3 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-800">
        ⚠ 상기 가격은 FOB 역산 시뮬레이션 결과이며, 실제 계약가·조달 낙찰가와 다를 수 있습니다.
        환율·관세·현지 유통 마진은 변동 가능하므로 최종 가격 결정 전 반드시 현지 파트너와 검토하십시오.
      </p>

      {/* 편집 모달 */}
      {editModal !== null && (() => {
        const card = extractCard(sc, editModal);
        const base = card.price_pab ?? card.price_usd ?? 0;
        return (
          <PricingEditModal
            key={editModal}
            scenario={editModal}
            segment={segment}
            basePrice={base}
            onClose={() => { setEditModal(null); }}
          />
        );
      })()}
    </div>
  );
}
