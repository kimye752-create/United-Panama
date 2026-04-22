"use client";

import { TermTooltip } from "@/components/ui/TermTooltip";

interface Props {
  data: unknown;
}

/** 환율 표시용 포맷 (1,234,567 원) */
function fmtKrw(krw: number): string {
  return new Intl.NumberFormat("ko-KR").format(Math.round(krw)) + " 원";
}

/**
 * 가격 분석 API 응답(phase2Report + marketResult)에서 저가/기준/프리미엄 카드 요약 표시
 * - USD + KRW 병기 (Phase 1)
 * - FOB·PAB·KRW 용어 툴팁
 * - 가격 한계 면책 문구
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
    { key: "average",    label: "기준(평균)", row: sc["average"]    ?? {} },
    { key: "conservative", label: "프리미엄(보수)", row: sc["conservative"] ?? {} },
  ];

  return (
    <div>
      {/* 가격 카드 3열 */}
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {cards.map(({ key, label, row }) => {
          const usd =
            typeof row["price_usd"] === "number" ? row["price_usd"] : null;
          const pab =
            typeof row["price_pab"] === "number" ? row["price_pab"] : null;
          const krw =
            typeof row["price_krw"] === "number" ? row["price_krw"] : null;
          const basis  = typeof row["basis"]         === "string" ? row["basis"]         : "";
          const mkRate = typeof row["markdown_rate"] === "number" ? row["markdown_rate"] : null;

          return (
            <div
              key={key}
              className="rounded-lg border border-[#d9e2ef] bg-white p-3 shadow-sh2"
            >
              <p className="text-xs font-extrabold text-[#273f60]">{label}</p>

              {/* USD (주 표시) */}
              <p className="mt-1 text-lg font-extrabold text-navy">
                {usd !== null ? (
                  <>
                    <TermTooltip term="FOB">{usd.toFixed(2)}</TermTooltip>
                    {" USD"}
                  </>
                ) : (
                  "—"
                )}
              </p>

              {/* PAB */}
              {pab !== null && (
                <p className="text-xs text-[#6b7a8f]">
                  <TermTooltip term="PAB">{pab.toFixed(2)} PAB</TermTooltip>
                  {" 기준"}
                </p>
              )}

              {/* KRW (Phase 1 USD/KRW 병기) */}
              {krw !== null && (
                <p className="mt-0.5 text-xs font-semibold text-[#4a5a6f]">
                  ≈ <TermTooltip term="KRW">{fmtKrw(krw)}</TermTooltip>
                </p>
              )}

              {/* 마크다운 비율 */}
              {mkRate !== null && (
                <p className="mt-1 text-[10px] text-[#7a8aa0]">
                  <TermTooltip term="마크다운">천장가 대비 {(mkRate * 100).toFixed(1)}%</TermTooltip>
                </p>
              )}

              {/* 근거 설명 */}
              {basis !== "" && (
                <p className="mt-2 line-clamp-4 text-[11px] leading-snug text-[#4a5a6f]">
                  {basis}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* 면책 문구 (Phase 0) */}
      <p className="mt-3 rounded-md border border-amber-100 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-800">
        ⚠ 상기 가격은 <TermTooltip term="FOB" position="bottom">FOB</TermTooltip> 역산 시뮬레이션 결과이며,
        실제 계약가·조달 낙찰가와 다를 수 있습니다.
        환율·관세·현지 유통 마진은 변동 가능하므로 최종 가격 결정 전 반드시 현지 파트너와 검토하십시오.
        <TermTooltip term="KRW" position="bottom">KRW</TermTooltip> 환산은 보고서 기준 환율(1 USD = 1,473.1 원)을 적용합니다.
      </p>
    </div>
  );
}
