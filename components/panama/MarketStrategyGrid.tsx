import type { DashboardBundle } from "./types";

interface MarketStrategyGridProps {
  dashboard: DashboardBundle;
}

type StrategyCard = {
  title: string;
  body: string;
};

function renderStrategyBody(body: string): Array<{ text: string; emphasize: boolean }> {
  return body
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "")
    .map((line) => ({
      text: line,
      emphasize: line.startsWith("※"),
    }));
}

export function MarketStrategyGrid({ dashboard }: MarketStrategyGridProps) {
  const cards: StrategyCard[] = [
    { title: "진입 채널 전략", body: dashboard.llmPayload.block4_1_channel },
    { title: "가격 포지셔닝", body: dashboard.llmPayload.block4_2_pricing },
    { title: "파트너 발굴", body: dashboard.llmPayload.block4_3_partners },
    { title: "리스크·조건", body: dashboard.llmPayload.block4_4_risks },
  ];

  return (
    <section className="rounded-[12px] border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[13px] font-semibold text-slate-700">● 시장 진출 전략</p>
      <div className="mt-3 grid gap-3 md:grid-cols-4">
        {cards.map((card) => (
          <article key={card.title} className="rounded-[10px] bg-[#f7f9fc] p-3">
            <p className="text-[13px] font-bold text-[#173f78]">{card.title}</p>
            <div className="mt-2 space-y-1.5">
              {renderStrategyBody(card.body).map((line, index) => (
                <p
                  key={`${card.title}-${index}-${line.text.slice(0, 14)}`}
                  className={`text-[12px] leading-relaxed ${
                    line.emphasize ? "font-semibold text-[#2e4f79]" : "text-slate-700"
                  }`}
                >
                  {line.text}
                </p>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
