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
    value: "US$ 87.6 Billion / $19,445",
    footer: "출처: IMF (2024)",
    detailLines: undefined,
    sourceNote: undefined,
  };
}

export function MacroCards({ cards }: MacroCardsProps) {
  const normalizedCards = cards.map((card) => normalizeGdpCard(card));

  return (
    <section className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
      {normalizedCards.map((card) => {
        const isGdpCard = card.label.includes("GDP");
        return (
          <article
            key={card.label}
            className="flex min-h-0 flex-col rounded-[12px] border border-[#e4eaf2] bg-white px-2.5 py-1.5 shadow-sh2"
          >
            <p className="text-left text-[9.5px] font-semibold leading-tight text-[#6a7e98]">{card.label}</p>
            {card.detailLines !== undefined && card.detailLines.length > 0 ? (
              <>
                <div className="flex flex-1 flex-col justify-center py-0">
                  <div className="space-y-1 text-center">
                    {card.detailLines.map((line) => (
                      <p
                        key={line}
                        className="text-[12px] font-semibold leading-tight text-[#1f3e64]"
                      >
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
                <p className="mt-0.5 w-full text-right text-[9px] leading-tight text-[#8b97aa]">
                  {card.sourceNote ?? card.footer}
                </p>
              </>
            ) : (
              <>
                <div
                  className={`flex min-h-0 flex-1 flex-col items-center justify-center px-0.5 py-0 ${
                    isGdpCard ? "overflow-x-auto" : ""
                  }`}
                >
                  <p
                    className={`text-center font-semibold leading-[1.15] tracking-[-0.02em] text-[#1f3e64] ${
                      isGdpCard
                        ? "max-w-full whitespace-nowrap text-[clamp(10px,2vw,18px)]"
                        : "text-[19px] sm:text-[21px]"
                    }`}
                  >
                    {card.value}
                  </p>
                </div>
                <p className="mt-0.5 w-full text-right text-[9px] leading-tight text-[#8b97aa]">
                  {card.footer}
                  {card.yoy !== undefined ? ` · ${card.yoy}` : ""}
                </p>
              </>
            )}
          </article>
        );
      })}
    </section>
  );
}

