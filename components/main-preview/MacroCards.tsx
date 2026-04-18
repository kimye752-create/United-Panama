import type { PanamaLandingMetricCard } from "@/src/logic/panama_landing";

interface MacroCardsProps {
  cards: readonly PanamaLandingMetricCard[];
}

function normalizeGdpCard(card: PanamaLandingMetricCard): PanamaLandingMetricCard {
  const hasGdpKeyword = card.label.includes("GDP");
  if (!hasGdpKeyword) {
    return card;
  }
  return {
    ...card,
    label: "국가GDP/1인당GDP",
    value: "US$ 87.6 Billion / $ 19,445",
    footer: "출처: IMF (2024)",
    detailLines: undefined,
    sourceNote: undefined,
  };
}

export function MacroCards({ cards }: MacroCardsProps) {
  const normalizedCards = cards.map((card) => normalizeGdpCard(card));

  return (
    <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
      {normalizedCards.map((card) => (
        <article
          key={card.label}
          className="rounded-[14px] border border-[#e4eaf2] bg-white px-4 py-3 shadow-sh2"
        >
          <p className="text-[10px] font-semibold text-[#6a7e98]">{card.label}</p>
          {card.detailLines !== undefined && card.detailLines.length > 0 ? (
            <div className="mt-1 space-y-1">
              {card.detailLines.map((line) => (
                <p key={line} className="text-[12px] font-bold leading-tight text-[#1f3e64]">
                  {line}
                </p>
              ))}
              <p className="pt-0.5 text-[10px] text-[#8b97aa]">{card.sourceNote ?? card.footer}</p>
            </div>
          ) : (
            <>
              <p className="mt-1 text-[24px] font-black leading-none tracking-[-0.02em] text-[#1f3e64]">
                {card.value}
              </p>
              <p className="mt-1 text-[10px] text-[#8b97aa]">
                {card.footer}
                {card.yoy !== undefined ? ` · ${card.yoy}` : ""}
              </p>
            </>
          )}
        </article>
      ))}
    </section>
  );
}

