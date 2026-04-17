import type { PanamaLandingMetricCard } from "@/src/logic/panama_landing";

interface MacroCardsProps {
  cards: readonly PanamaLandingMetricCard[];
}

export function MacroCards({ cards }: MacroCardsProps) {
  return (
    <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <article
          key={card.label}
          className="rounded-[14px] border border-[#e4eaf2] bg-white px-4 py-3 shadow-sh2"
        >
          <p className="text-[10px] font-semibold text-[#6a7e98]">{card.label}</p>
          <p className="mt-1 text-[24px] font-black leading-none tracking-[-0.02em] text-[#1f3e64]">
            {card.value}
          </p>
          <p className="mt-1 text-[10px] text-[#8b97aa]">
            {card.footer}
            {card.yoy !== undefined ? ` · ${card.yoy}` : ""}
          </p>
        </article>
      ))}
    </section>
  );
}

