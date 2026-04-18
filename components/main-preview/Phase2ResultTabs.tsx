"use client";

import { useState } from "react";

export interface Phase2ScenarioCard {
  rank: 1 | 2 | 3;
  scenario: "agg" | "avg" | "cons";
  label: "공격" | "평균" | "보수";
  price_pab: number;
  price_usd: number;
  price_krw: number;
  basis: string;
  calculation: string;
  markdown_rate: number;
}

export interface Phase2MarketPayload {
  scenarios: {
    aggressive: Phase2ScenarioCard;
    average: Phase2ScenarioCard;
    conservative: Phase2ScenarioCard;
  };
  logic: string;
  formula: string;
}

export interface Phase2ResultPayload {
  finalPricePab: number;
  public_market: Phase2MarketPayload;
  private_market: Phase2MarketPayload;
  generatedAt?: string;
}

interface Phase2ResultTabsProps {
  result: Phase2ResultPayload;
}

function ScenarioCard({
  scenario,
}: {
  scenario: Phase2ScenarioCard;
}) {
  return (
    <article className="rounded-[10px] border border-[#dce4ef] bg-white px-3 py-2 shadow-sh3">
      <p className="text-[11px] font-extrabold text-[#28466d]">
        {scenario.label} ({scenario.rank}위)
      </p>
      <p className="mt-0.5 text-[12px] font-black text-[#1f3e64]">
        PAB {scenario.price_pab.toFixed(2)}
      </p>
      <p className="text-[10px] text-[#6f8299]">
        USD {scenario.price_usd.toFixed(2)} · KRW {scenario.price_krw.toLocaleString("ko-KR")}
      </p>
      <p className="mt-1 text-[10px] text-[#6f8299]">{scenario.basis}</p>
      <p className="text-[10px] text-[#6f8299]">{scenario.calculation}</p>
    </article>
  );
}

export function Phase2ResultTabs({ result }: Phase2ResultTabsProps) {
  const [activeTab, setActiveTab] = useState<"public" | "private">("public");
  const activeMarket = activeTab === "public" ? result.public_market : result.private_market;

  return (
    <section className="rounded-[12px] bg-[#f4f7fc] p-3">
      <div className="mb-3 flex border-b border-[#dbe3ef]">
        <button
          type="button"
          onClick={() => setActiveTab("public")}
          className={`h-[34px] rounded-t-[9px] px-4 text-[12px] font-bold ${
            activeTab === "public"
              ? "bg-white text-[#1f3e64] shadow-sh3"
              : "text-[#6f8299]"
          }`}
        >
          공공 시장 (Logic A)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("private")}
          className={`h-[34px] rounded-t-[9px] px-4 text-[12px] font-bold ${
            activeTab === "private"
              ? "bg-white text-[#1f3e64] shadow-sh3"
              : "text-[#6f8299]"
          }`}
        >
          민간 시장 (Logic B)
        </button>
      </div>
      <div className="grid gap-2 md:grid-cols-3">
        <ScenarioCard scenario={activeMarket.scenarios.aggressive} />
        <ScenarioCard scenario={activeMarket.scenarios.average} />
        <ScenarioCard scenario={activeMarket.scenarios.conservative} />
      </div>
      <div className="mt-3 rounded-[10px] border border-[#dce4ef] bg-white px-3 py-2 text-[10.5px] text-[#6f8299]">
        <p className="font-bold text-[#1f3e64]">{activeMarket.logic}</p>
        <p>적용 공식: {activeMarket.formula}</p>
      </div>
    </section>
  );
}

