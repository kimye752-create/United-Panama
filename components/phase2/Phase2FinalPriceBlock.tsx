interface Phase2FinalPriceBlockProps {
  title?: string;
  priceUsd: number;
  caption: string;
}

export function Phase2FinalPriceBlock({
  title = "권고 수출가 (기준 시나리오)",
  priceUsd,
  caption,
}: Phase2FinalPriceBlockProps) {
  return (
    <section className="rounded-[16px] bg-navy p-5 text-white shadow-sh">
      <p className="text-[11px] text-white/80">{title}</p>
      <p className="mt-2 text-[28px] font-extrabold leading-none">${priceUsd.toFixed(2)}</p>
      <p className="mt-2 text-[11px] text-white/85">{caption}</p>
    </section>
  );
}
