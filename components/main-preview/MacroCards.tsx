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
    // 국가 GDP만 표시 (1인당 GDP는 비노출 — 복원 시 아래 주석 참고)
    label: "국가 GDP",
    value: "US$ 87.6 Billion",
    // label: "국가GDP/1인당GDP",
    // value: "US$ 87.6 Billion / $19,445",
    footer: "출처: IMF (2024)",
    detailLines: undefined,
    sourceNote: undefined,
  };
}

/** 4개 매크로 카드 공통 — 제목·수치 가독성 (출처 줄은 기존 작은 회색 유지) */
const MACRO_TITLE_CLASS =
  "text-left text-[11px] font-bold leading-tight text-[#1E293B]";
const MACRO_VALUE_CLASS =
  "text-center font-extrabold leading-[1.15] tracking-[-0.02em] text-[#1E3A5F] text-[22px] sm:text-[26px]";
const MACRO_DETAIL_LINE_CLASS = "text-[12px] font-bold leading-tight text-[#1E3A5F]";

export function MacroCards({ cards }: MacroCardsProps) {
  const normalizedCards = cards.map((card) => normalizeGdpCard(card));

  return (
    <section className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-4">
      {normalizedCards.map((card) => {
        return (
          <article
            key={card.label}
            className="flex min-h-0 flex-col rounded-[12px] border border-[#e4eaf2] bg-white px-4 py-3 shadow-sh2"
          >
            <p className={MACRO_TITLE_CLASS}>{card.label}</p>
            {card.detailLines !== undefined && card.detailLines.length > 0 ? (
              <>
                <div className="flex flex-1 flex-col justify-center py-0">
                  <div className="space-y-1 text-center">
                    {card.detailLines.map((line) => (
                      <p key={line} className={MACRO_DETAIL_LINE_CLASS}>
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
                <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-0.5 py-0">
                  <p className={MACRO_VALUE_CLASS}>{card.value}</p>
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

