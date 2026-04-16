import type { ScenarioRow } from "@/src/logic/phase2/price_scenario_generator";

interface Phase2ScenarioCardsProps {
  scenarios: ScenarioRow[];
}

function scenarioClass(key: ScenarioRow["scenario"]): string {
  if (key === "agg") {
    return "bg-[#DBEAFE]";
  }
  if (key === "avg") {
    return "bg-[#FEF3C7]";
  }
  return "bg-[#FEE2E2]";
}

export function Phase2ScenarioCards({ scenarios }: Phase2ScenarioCardsProps) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {scenarios.map((scenario) => (
        <article
          key={scenario.scenario}
          className={`rounded-[14px] p-4 shadow-sh2 ${scenarioClass(scenario.scenario)}`}
        >
          <h4 className="text-[12px] font-extrabold text-navy">{scenario.title}</h4>
          <p className="mt-1 text-[10px] text-muted">{scenario.subtitle}</p>
          <div className="mt-3 space-y-1.5 text-[11px] text-[#2a3c58]">
            <p>FOB 천장: ${scenario.fob.fobCeilingUsd.toFixed(2)}</p>
            <p>FOB: ${scenario.fob.fobUsd.toFixed(2)}</p>
            <p>배수: {scenario.fob.strategyMultiplier.toFixed(2)}x</p>
            <p>포지셔닝가: ${scenario.fob.positioningPricePab.toFixed(2)}</p>
            <p>CFR: ${scenario.incoterms.cfrUsd.toFixed(2)}</p>
            <p>CIF: ${scenario.incoterms.cifUsd.toFixed(2)}</p>
            <p>DDP: ${scenario.incoterms.ddpUsd.toFixed(2)}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
