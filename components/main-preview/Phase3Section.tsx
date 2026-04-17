"use client";

import { useMemo, useState } from "react";

interface Phase3SectionProps {
  isActive: boolean;
}

interface BuyerRow {
  id: string;
  name: string;
  country: string;
  score: number;
  channel: string;
  note: string;
}

const TOP_BUYERS: BuyerRow[] = [
  {
    id: "buyer-1",
    name: "Agencias Feduro, S.A.",
    country: "Panama",
    score: 91,
    channel: "Hospital",
    note: "MINSA/CSS 입찰 참여 이력과 냉장 유통망 보유",
  },
  {
    id: "buyer-2",
    name: "Agencias Celmar, S.A.",
    country: "Panama",
    score: 87,
    channel: "Retail",
    note: "체인 약국 연계 및 전국 배포 커버리지 우수",
  },
  {
    id: "buyer-3",
    name: "Compañía Astur, S.A.",
    country: "Panama",
    score: 84,
    channel: "Hybrid",
    note: "공공·민간 병행 포트폴리오 운영",
  },
];

export function Phase3Section({ isActive }: Phase3SectionProps) {
  const [expanded, setExpanded] = useState(true);
  const [selectedBuyerId, setSelectedBuyerId] = useState<string | null>(null);

  const selectedBuyer = useMemo(
    () => TOP_BUYERS.find((buyer) => buyer.id === selectedBuyerId) ?? null,
    [selectedBuyerId],
  );

  return (
    <section className="rounded-[16px] border border-[#e3e9f2] bg-white shadow-sh2">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#1E3A5F] text-[11px] font-black text-white">
            03
          </span>
          <div>
            <h3 className="text-[16px] font-extrabold text-[#1f3e64]">3공정 · 바이어 발굴</h3>
            <p className="text-[11px] text-[#7a8ba1]">
              Top 10 바이어 리스트 · 시장조사·수출가격전략 완료 후 활성화
            </p>
          </div>
        </div>
        <span className="text-[14px] text-[#516882]">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded ? (
        <div className="space-y-3 border-t border-[#edf1f6] px-4 pb-4 pt-3">
          <p className="text-[12px] text-[#6c809a]">
            시장조사 · 수출가격전략 완료 후 바이어 분석이 활성화됩니다. 현재 데이터 준비 중입니다.
          </p>
          <div className="overflow-hidden rounded-[12px] border border-[#dce4ef]">
            <table className="w-full border-collapse text-[12px]">
              <thead className="bg-[#f4f7fb] text-[#5f758f]">
                <tr>
                  <th className="px-2 py-2 text-left">#</th>
                  <th className="px-2 py-2 text-left">바이어명</th>
                  <th className="px-2 py-2 text-left">국가</th>
                  <th className="px-2 py-2 text-left">점수</th>
                  <th className="px-2 py-2 text-left">채널</th>
                </tr>
              </thead>
              <tbody>
                {isActive ? (
                  TOP_BUYERS.map((buyer, index) => (
                    <tr key={buyer.id} className="border-t border-[#edf1f6] bg-white">
                      <td className="px-2 py-2">{index + 1}</td>
                      <td className="px-2 py-2">
                        <button
                          type="button"
                          onClick={() => setSelectedBuyerId(buyer.id)}
                          className="font-semibold text-[#1f3e64] underline-offset-2 hover:underline"
                        >
                          {buyer.name}
                        </button>
                      </td>
                      <td className="px-2 py-2">{buyer.country}</td>
                      <td className="px-2 py-2">{buyer.score}</td>
                      <td className="px-2 py-2">{buyer.channel}</td>
                    </tr>
                  ))
                ) : (
                  <tr className="border-t border-[#edf1f6] bg-[#fbfcfe]">
                    <td colSpan={5} className="px-2 py-5 text-center text-[12px] text-[#8a99ad]">
                      바이어 데이터 준비 중
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {selectedBuyer !== null ? (
            <article className="rounded-[12px] border border-[#dce4ef] bg-[#f9fbff] p-3">
              <p className="text-[12px] font-extrabold text-[#1f3e64]">{selectedBuyer.name}</p>
              <p className="mt-1 text-[11px] text-[#6f8299]">{selectedBuyer.note}</p>
            </article>
          ) : null}
          <button
            type="button"
            disabled={!isActive}
            className="inline-flex h-[36px] items-center rounded-[10px] border border-[#d9e1ed] bg-[#f5f8fc] px-4 text-[12px] font-bold text-[#9aa9bc] disabled:cursor-not-allowed"
          >
            ✎ 바이어 보고서 다운로드
          </button>
        </div>
      ) : null}
    </section>
  );
}

