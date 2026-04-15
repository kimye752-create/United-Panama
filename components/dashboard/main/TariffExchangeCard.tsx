import { Card, IRow } from "../shared/Card";

export function TariffExchangeCard() {
  return (
    <Card title="관세 · 환율 현황">
      <IRow>
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="mb-1 text-[13px] font-extrabold text-navy">
              HS 3004.90 — 개량신약 · 일반제
            </div>
            <div className="text-[11.5px] text-muted">한-중미 FTA · MFN 동일 0% 적용</div>
          </div>
          <span className="text-[20px] font-black text-green">0%</span>
        </div>
      </IRow>
      <IRow>
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="mb-1 text-[13px] font-extrabold text-navy">
              HS 3006.30 — 가도바주 (조영제)
            </div>
            <div className="text-[11.5px] text-muted">한-중미 FTA · MFN 동일 0% 적용</div>
          </div>
          <span className="text-[20px] font-black text-green">0%</span>
        </div>
      </IRow>
      <IRow>
        <div className="text-[13px] font-extrabold text-navy">파나마 의약품 관세 기본 주의사항</div>
        <div className="mt-1 text-[11.5px] leading-relaxed text-muted">
          FTA 0%라도 HS 코드 분류, 원산지 증빙, MINSA-DNFD 품목 허가 여부를 선확인해야 통관
          지연을 줄일 수 있습니다.
        </div>
      </IRow>

      <div className="mt-4">
        <div className="mb-1 text-[11px] font-bold text-muted">KRW / USD</div>
        <div className="leading-none tracking-[-0.04em] text-navy">
          <span className="text-[28px] font-black">1,160.02</span>
          <span className="ml-1 text-[14px] font-bold text-muted">원</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
          <div className="rounded-[10px] bg-inner p-2.5">
            <div className="text-muted">USD / KRW</div>
            <div className="font-extrabold text-navy">1,473.74</div>
          </div>
          <div className="rounded-[10px] bg-inner p-2.5">
            <div className="text-muted">USD / SGD</div>
            <div className="font-extrabold text-navy">0.7866</div>
          </div>
        </div>
        <button
          type="button"
          className="mt-3 inline-flex h-[34px] items-center rounded-[10px] bg-navy/10 px-3 text-[12px] font-extrabold text-navy"
        >
          ↺ 환율 새로고침
        </button>
      </div>
    </Card>
  );
}
