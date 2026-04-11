/**
 * 보고서 1장 — REPORT1_SPEC 5개 블록 순서 고정 (인사이트 선행·근거 후행)
 */
import type { AnalyzePanamaResult } from "@/src/logic/panama_analysis";
import { CaseBadge } from "./CaseBadge";
import { ReasoningList } from "./ReasoningList";
import { SourceTable } from "./SourceTable";

type Props = {
  data: AnalyzePanamaResult;
};

function hsForProduct(inn: string): string {
  if (/omega/i.test(inn)) {
    return "3004";
  }
  if (/levodropropizine/i.test(inn)) {
    return "3004";
  }
  return "3004";
}

function dosageForm(inn: string): string {
  const m: Record<string, string> = {
    Hydroxyurea: "500mg Capsule",
    Cilostazol: "100mg Tablet",
    Itopride: "50mg Tablet",
    Aceclofenac: "100mg Tablet",
    Rabeprazole: "20mg Tablet",
    Erdosteine: "300mg Capsule",
    "Omega-3-acid ethyl esters": "1000mg Soft capsule",
    Levodropropizine: "90mg/5mL Syrup",
  };
  return m[inn] ?? "제형 조회 중";
}

export function Report1({ data }: Props) {
  const { product, judgment, priceRows, matchedDistributors, sourceAggregation } =
    data;

  const tender = priceRows.filter((r) => r.pa_price_type === "tender_award");
  const retail = priceRows.filter((r) =>
    ["retail_normal", "retail_promo"].includes(r.pa_price_type ?? ""),
  );

  return (
    <article className="mx-auto max-w-4xl space-y-10 px-4 py-10 text-slate-800">
      <h1 className="text-3xl font-bold text-slate-900">
        파나마 시장 진출 적합 분석 — {product.kr_brand_name}
      </h1>

      {/* 블록 1 */}
      <section className="space-y-2 border-b border-slate-200 pb-6">
        <h2 className="text-xl font-semibold text-slate-900">① 제품 식별</h2>
        <div className="grid gap-1 text-base">
          <p>
            <span className="font-medium">브랜드명</span> | {product.kr_brand_name}{" "}
            | <span className="font-medium">WHO INN</span> |{" "}
            {product.who_inn_en} | <span className="font-medium">함량·제형</span>{" "}
            | {dosageForm(product.who_inn_en)} |{" "}
            <span className="font-medium">HS</span> | {hsForProduct(product.who_inn_en)}{" "}
            | <span className="font-medium">Case</span> | {judgment.case} |{" "}
            <span className="font-medium">confidence</span> |{" "}
            {judgment.confidence.toFixed(2)}
          </p>
        </div>
      </section>

      {/* 블록 2 */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">② 핵심 판정</h2>
        <CaseBadge judgment={judgment} />
      </section>

      {/* 블록 3 */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">
          ③ 두괄식 판정 근거
        </h2>
        <ReasoningList items={judgment.reasoning} />
      </section>

      {/* 블록 4 */}
      <section className="space-y-6 border-b border-slate-200 pb-8">
        <h2 className="text-xl font-semibold text-slate-900">
          ④ 시장 진출 전략
        </h2>

        <div>
          <h3 className="mb-2 font-medium text-slate-900">4-1 진입 채널 권고</h3>
          <p className="text-base leading-relaxed">
            {judgment.case === "A" &&
              "우선 채널: 공공조달·민간 병행. 1단계(0~6개월) 공공 입찰 모니터링 → 2단계(6~18개월) 유통사와 민간 입점 → 3단계(18개월+) 병행 확대."}
            {judgment.case === "B" &&
              "우선 채널: 민간 약국. 1단계 유통 파트너와 소량 론칭 → 2단계 채널 확대 → 3단계 공공 트랙 검토."}
            {judgment.case === "C" &&
              "우선 채널: 재평가 전 단계. 데이터·등재 보강 후 채널 재선택."}
          </p>
        </div>

        <div>
          <h3 className="mb-2 font-medium text-slate-900">4-2 가격 포지셔닝</h3>
          <p className="text-base leading-relaxed">
            공공 낙찰가:{" "}
            {tender.length > 0
              ? `표본 ${tender.length}건 (panama tender_award)`
              : "데이터 수집 중"}
            . 민간 소매:{" "}
            {retail.length > 0
              ? `표본 ${retail.length}건`
              : "데이터 수집 중"}
            . 경쟁사 비교: pa_notes COMPETITOR 표기 시 반영(현재 미수집 시 생략).
          </p>
        </div>

        <div>
          <h3 className="mb-2 font-medium text-slate-900">4-3 유통 파트너 후보</h3>
          <ul className="list-disc pl-5 text-base leading-relaxed">
            {matchedDistributors.length === 0 ? (
              <li>데이터 수집 중</li>
            ) : (
              matchedDistributors.slice(0, 8).map((d) => (
                <li key={d.id}>
                  {d.company_name}
                  {d.company_name_local
                    ? ` (${d.company_name_local})`
                    : ""}{" "}
                  — target: {d.target_market ?? "—"}
                </li>
              ))
            )}
          </ul>
        </div>

        <div>
          <h3 className="mb-2 font-medium text-slate-900">4-4 리스크·조건</h3>
          <ul className="list-disc pl-5 text-base leading-relaxed">
            {judgment.risks.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* 블록 5 — 반드시 하단 */}
      <section className="space-y-6">
        <h2 className="text-xl font-semibold text-slate-900">
          ⑤ 근거·출처
        </h2>

        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-800">5-1 참조 데이터</h3>
          <SourceTable rows={sourceAggregation} />
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-800">
            5-2 참조 사이트 (카테고리)
          </h3>
          <div className="space-y-3 text-sm leading-relaxed text-slate-700">
            <p>
              <span className="font-medium">▸ 공공조달</span> — PanamaCompra OCDS
              API, PAHO Strategic Fund, MINSA faddi
            </p>
            <p>
              <span className="font-medium">▸ 규제·등재</span> — WHO EML 2023,
              PAHO Formulary, ACODECO CABAMED
            </p>
            <p>
              <span className="font-medium">▸ 시장 거시</span> — World Bank
              Panama, KOTRA 무역관, ITA Healthcare Guide
            </p>
            <p>
              <span className="font-medium">▸ 규제 프레임워크</span> — 한-중미 FTA
              (MOTIE), 한국 위생선진국 지정(MINSA 2023.6.28), PubMed
            </p>
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-800">
            5-3 데이터 수집 시점
          </h3>
          <p className="text-sm text-slate-600">
            최종 수집: {new Date().toISOString().slice(0, 10)} · Phase A 정적
            수집(JSON seed + 공공 크롤러) · Phase B 실시간 보강은 시연 직전
            예정 · 신선도: freshness_checker 7일 기준
          </p>
        </div>

        <button
          type="button"
          disabled
          className="rounded border border-slate-300 bg-slate-100 px-4 py-2 text-sm text-slate-500"
        >
          PDF 다운로드 (W5 엔진⑦ 연동 예정)
        </button>
      </section>
    </article>
  );
}
