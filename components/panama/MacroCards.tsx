import type { PanamaLandingMetricCard } from "@/src/logic/panama_landing";

interface MacroCardsProps {
  cards: readonly PanamaLandingMetricCard[];
}

export function MacroCards({ cards }: MacroCardsProps) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <article
          key={card.label}
          className="rounded-2xl border border-rose-100 bg-rose-50/60 px-5 py-4 shadow-sm"
        >
          <p className="text-xs font-medium text-slate-500">{card.label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-rose-600">
            {card.value}
          </p>
          <p className="mt-3 text-xs text-slate-400">{card.footer}</p>
          {card.yoy !== undefined ? (
            <p className="mt-1 text-xs font-medium text-rose-500">{card.yoy}</p>
          ) : null}
        </article>
      ))}
    </section>
  );
}
