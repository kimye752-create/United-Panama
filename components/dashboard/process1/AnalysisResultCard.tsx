import { Card, IRow } from "../shared/Card";

export function AnalysisResultCard() {
  return (
    <Card title="수출 적합성 분석 결과" subtitle="신호등 판정 + 두괄식 근거">
      <IRow>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[15px] font-extrabold text-navy">Rosumeg Combigel</div>
            <div className="text-[12px] text-muted">Rosuvastatin + Omega-3</div>
          </div>
          <span className="rounded-full bg-orange/20 px-3 py-1 text-[12px] font-extrabold text-warn">
            조건부
          </span>
        </div>
      </IRow>
      <IRow>
        <div className="space-y-1 text-[13px] leading-relaxed text-text">
          <p>1) 시장·의료: 이상지질혈증 유병률 35~40%, 복합제 수요 높음</p>
          <p>2) 규제: MINSA 등록 패스트트랙 활용 가능</p>
          <p>3) 무역: 한-중미 FTA 관세 0% + ITBMS 면세</p>
          <p>4) 조달: PanamaCompra V3 공공조달 기준가 확보</p>
        </div>
      </IRow>
    </Card>
  );
}
