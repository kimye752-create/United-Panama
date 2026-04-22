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

/** 4개 매크로 카드 공통 — 팀장 사이트 기준: 제목·출처 가운데 정렬 */
const MACRO_TITLE_CLASS =
  "text-center text-[12px] font-medium leading-tight text-[#94a3b8]";
const MACRO_VALUE_CLASS =
  "text-center font-extrabold leading-[1.15] tracking-[-0.02em] text-[#1E3A5F] text-[34px] sm:text-[44px]";
const MACRO_DETAIL_LINE_CLASS = "text-center text-[17px] font-bold leading-tight text-[#1E3A5F]";

export function MacroCards({ cards }: MacroCardsProps) {
  const normalizedCards = cards.map((card) => normalizeGdpCard(card));

  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {normalizedCards.map((card) => {
        return (
          <article
            key={card.label}
            className="flex min-h-[130px] flex-col rounded-[12px] border border-[#e4eaf2] bg-white px-6 py-6 shadow-sh2"
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
                <p className="mt-1 w-full text-center text-[11px] leading-tight text-[#8b97aa]">
                  {card.sourceNote ?? card.footer}
                </p>
              </>
            ) : (
              <>
                <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-0.5 py-0">
                  <p className={MACRO_VALUE_CLASS}>{card.value}</p>
                </div>
                <p className="mt-1 w-full text-center text-[11px] leading-tight text-[#8b97aa]">
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

