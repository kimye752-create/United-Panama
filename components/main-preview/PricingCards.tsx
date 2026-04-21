"use client";

interface Props {
  data: unknown;
}

/**
 * 가격 분석 API 응답(phase2Report + marketResult)에서 저가/기준/프리미엄 카드 요약 표시
 */
export function PricingCards({ data }: Props) {
  if (data === null || typeof data !== "object") {
    return (
      <p className="mt-2 text-sm text-[#6b7a8f]">표시할 가격 데이터가 없습니다.</p>
    );
  }

  const root = data as Record<string, unknown>;
  const mr = root["marketResult"];
  if (mr === null || typeof mr !== "object" || Array.isArray(mr)) {
    return (
      <p className="mt-2 text-sm text-[#6b7a8f]">시나리오 구조를 찾을 수 없습니다.</p>
    );
  }

  const scenarios = (mr as Record<string, unknown>)["scenarios"];
  if (scenarios === null || typeof scenarios !== "object" || Array.isArray(scenarios)) {
    return (
      <p className="mt-2 text-sm text-[#6b7a8f]">시나리오가 비어 있습니다.</p>
    );
  }

  const sc = scenarios as Record<string, Record<string, unknown>>;
  const cards: { key: string; label: string; row: Record<string, unknown> }[] = [
    { key: "aggressive", label: "저가(공격)", row: sc["aggressive"] ?? {} },
    { key: "average", label: "기준(평균)", row: sc["average"] ?? {} },
    { key: "conservative", label: "프리미엄(보수)", row: sc["conservative"] ?? {} },
  ];

  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-3">
      {cards.map(({ key, label, row }) => {
        const usd =
          typeof row["price_usd"] === "number" ? row["price_usd"] : null;
        const pab =
          typeof row["price_pab"] === "number" ? row["price_pab"] : null;
        const basis = typeof row["basis"] === "string" ? row["basis"] : "";
        return (
          <div
            key={key}
            className="rounded-lg border border-[#d9e2ef] bg-white p-3 shadow-sh2"
          >
            <p className="text-xs font-extrabold text-[#273f60]">{label}</p>
            <p className="mt-1 text-lg font-extrabold text-navy">
              {usd !== null ? `${usd.toFixed(2)} USD` : "—"}
            </p>
            {pab !== null && (
              <p className="text-xs text-[#6b7a8f]">{pab.toFixed(2)} PAB 기준</p>
            )}
            {basis !== "" && (
              <p className="mt-2 line-clamp-4 text-[11px] leading-snug text-[#4a5a6f]">
                {basis}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
