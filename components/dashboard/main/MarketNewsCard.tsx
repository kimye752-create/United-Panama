import { Card, IRow } from "../shared/Card";

const NEWS = [
  "How to ship vitamins overseas: all you need to know",
  "Novo Nordisk Launches Wegovy in Singapore via Prescription",
  "Singapore's Health Sciences Authority confirms compliance",
  "Pharmaceutical tariffs: Which countries does the U.S. import the most from?",
  "Regional medicine procurement trend update",
] as const;

export function MarketNewsCard() {
  return (
    <Card
      title="시장 신호 · 뉴스"
      subtitle="파나마 의약품 시장 주요 동향 · 실시간"
      rightSlot={
        <button
          type="button"
          className="inline-flex h-[34px] items-center rounded-[10px] bg-navy/10 px-3 text-[12px] font-extrabold text-navy"
        >
          ↺ 새로고침
        </button>
      }
    >
      <div className="space-y-2">
        {NEWS.map((item) => (
          <IRow key={item}>
            <div className="text-[12px] font-bold leading-relaxed text-navy">{item}</div>
            <div className="mt-1 text-[10.5px] text-muted">The Straits of Asia · UTC</div>
          </IRow>
        ))}
      </div>
    </Card>
  );
}
