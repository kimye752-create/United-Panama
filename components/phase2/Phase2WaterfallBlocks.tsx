import type { ScenarioRow } from "@/src/logic/phase2/price_scenario_generator";

interface Phase2WaterfallBlocksProps {
  scenario: ScenarioRow;
}

interface WaterfallStep {
  label: string;
  value: number;
  delta: number;
  toneClass: string;
}

function currency(value: number): string {
  return `$${value.toFixed(2)}`;
}

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function ratioWidth(value: number, max: number): string {
  if (max <= 0) {
    return "0%";
  }
  const ratio = Math.max(0.08, Math.min(1, value / max));
  return `${(ratio * 100).toFixed(1)}%`;
}

function buildReverseSteps(scenario: ScenarioRow): WaterfallStep[] {
  const marketPrice = scenario.fob.finalPricePab;
  const afterRetail = marketPrice / (1 + scenario.fob.margins.retailMargin);
  const afterWholesale = afterRetail / (1 + scenario.fob.margins.wholesaleMargin);
  const afterLogistics = afterWholesale / (1 + scenario.fob.margins.logisticsMargin);
  const afterRisk = afterLogistics / (1 + scenario.fob.margins.riskMargin);
  return [
    { label: "경쟁품 기준가", value: marketPrice, delta: 0, toneClass: "bg-[#3B82F6]" },
    {
      label: "약국 마진 공제",
      value: afterRetail,
      delta: -(marketPrice - afterRetail),
      toneClass: "bg-[#EF4444]",
    },
    {
      label: "도매 마진 공제",
      value: afterWholesale,
      delta: -(afterRetail - afterWholesale),
      toneClass: "bg-[#F59E0B]",
    },
    {
      label: "물류 공제",
      value: afterLogistics,
      delta: -(afterWholesale - afterLogistics),
      toneClass: "bg-[#8B5CF6]",
    },
    {
      label: "리스크 공제",
      value: afterRisk,
      delta: -(afterLogistics - afterRisk),
      toneClass: "bg-[#6B7280]",
    },
    { label: "FOB 천장", value: scenario.fob.fobCeilingUsd, delta: 0, toneClass: "bg-[#10B981]" },
  ];
}

function buildForwardSteps(scenario: ScenarioRow): WaterfallStep[] {
  const finalFob = scenario.fob.fobUsd;
  const afterRisk = finalFob * (1 + scenario.fob.margins.riskMargin);
  const afterLogistics = afterRisk * (1 + scenario.fob.margins.logisticsMargin);
  const afterWholesale = afterLogistics * (1 + scenario.fob.margins.wholesaleMargin);
  const retailPositioning = afterWholesale * (1 + scenario.fob.margins.retailMargin);
  return [
    { label: "최종 FOB", value: finalFob, delta: 0, toneClass: "bg-[#10B981]" },
    {
      label: "리스크 가산",
      value: afterRisk,
      delta: afterRisk - finalFob,
      toneClass: "bg-[#9CA3AF]",
    },
    {
      label: "물류 가산",
      value: afterLogistics,
      delta: afterLogistics - afterRisk,
      toneClass: "bg-[#A78BFA]",
    },
    {
      label: "도매 가산",
      value: afterWholesale,
      delta: afterWholesale - afterLogistics,
      toneClass: "bg-[#34D399]",
    },
    {
      label: "약국 가산",
      value: retailPositioning,
      delta: retailPositioning - afterWholesale,
      toneClass: "bg-[#22C55E]",
    },
    {
      label: "소매 포지셔닝가",
      value: scenario.fob.positioningPricePab,
      delta: 0,
      toneClass: "bg-[#3B82F6]",
    },
  ];
}

export function Phase2WaterfallBlocks({ scenario }: Phase2WaterfallBlocksProps) {
  const reverseSteps = buildReverseSteps(scenario);
  const forwardSteps = buildForwardSteps(scenario);
  const reverseMax = Math.max(...reverseSteps.map((step) => step.value), 1);
  const forwardMax = Math.max(...forwardSteps.map((step) => step.value), 1);
  const positioningDeltaPercent = scenario.fob.finalPricePab
    ? ((scenario.fob.positioningPricePab - scenario.fob.finalPricePab) / scenario.fob.finalPricePab) * 100
    : 0;

  return (
    <section className="space-y-3">
      <article className="rounded-[14px] border border-[#e5ebf4] bg-white p-4 shadow-sh2">
        <p className="text-[12px] font-extrabold text-[#1E3A5F]">역산 Waterfall (기준가 → FOB 천장)</p>
        <div className="mt-3 space-y-2.5">
          {reverseSteps.map((step) => (
            <div key={step.label} className="grid grid-cols-[110px_1fr_auto] items-center gap-2.5">
              <span className="text-[11px] font-semibold text-[#3a4d6a]">{step.label}</span>
              <div className="h-5 rounded-md bg-[#edf2f9] p-[2px]">
                <div
                  className={`h-full rounded-[4px] ${step.toneClass}`}
                  style={{ width: ratioWidth(step.value, reverseMax) }}
                />
              </div>
              <span className="text-[11px] font-bold text-[#1f3654]">
                {currency(step.value)}
                {step.delta !== 0 ? ` (${step.delta > 0 ? "+" : ""}${currency(step.delta)})` : ""}
              </span>
            </div>
          ))}
        </div>
      </article>

      <article className="rounded-[14px] bg-[#1E3A5F] p-4 text-white shadow-sh2">
        <p className="text-[12px] font-bold text-white/90">전략 조정 배너</p>
        <p className="mt-1 text-[14px] font-extrabold">
          FOB 천장 {currency(scenario.fob.fobCeilingUsd)} × {scenario.fob.strategyMultiplier.toFixed(2)}x = 최종
          FOB {currency(scenario.fob.fobUsd)}
        </p>
        <p className="mt-1 text-[11px] text-white/80">
          마진 구조: 약국 {pct(scenario.fob.margins.retailMargin)} · 도매 {pct(scenario.fob.margins.wholesaleMargin)}
          · 물류 {pct(scenario.fob.margins.logisticsMargin)} · 리스크 {pct(scenario.fob.margins.riskMargin)}
        </p>
      </article>

      <article className="rounded-[14px] border border-[#e5ebf4] bg-white p-4 shadow-sh2">
        <p className="text-[12px] font-extrabold text-[#1E3A5F]">순산 Waterfall (최종 FOB → 소매 포지셔닝가)</p>
        <div className="mt-3 space-y-2.5">
          {forwardSteps.map((step) => (
            <div key={step.label} className="grid grid-cols-[110px_1fr_auto] items-center gap-2.5">
              <span className="text-[11px] font-semibold text-[#3a4d6a]">{step.label}</span>
              <div className="h-5 rounded-md bg-[#edf2f9] p-[2px]">
                <div
                  className={`h-full rounded-[4px] ${step.toneClass}`}
                  style={{ width: ratioWidth(step.value, forwardMax) }}
                />
              </div>
              <span className="text-[11px] font-bold text-[#1f3654]">
                {currency(step.value)}
                {step.delta !== 0 ? ` (+${currency(step.delta)})` : ""}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-[#3b4f6b]">
          경쟁품 대비 포지셔닝:{" "}
          <span className="font-bold text-[#1f3654]">
            {positioningDeltaPercent >= 0 ? "+" : ""}
            {positioningDeltaPercent.toFixed(1)}%
          </span>
        </p>
      </article>
    </section>
  );
}

