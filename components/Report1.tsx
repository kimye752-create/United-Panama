/**
 * 보고서 1장 — REPORT1_SPEC 5개 블록 (LLM 본문 + 규칙 기반 메타)
 */
import type { AnalyzePanamaResult } from "@/src/logic/panama_analysis";
import type { Report1Payload } from "@/src/llm/report1_schema";

import { CaseBadge } from "./CaseBadge";
import type { PdfDownloadClientPayload } from "./PdfDownloadButton";
import { PdfDownloadButton } from "./PdfDownloadButton";
import { SourceTable } from "./SourceTable";

export type LlmBundle = {
  payload: Report1Payload;
  source: "cache" | "opus" | "sonnet" | "fallback";
  modelUsed: string;
};

type Props = {
  data: AnalyzePanamaResult;
  llm: LlmBundle;
  rawDataDigest: string;
  prevalenceMetric: string | null;
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

function formatLlmSourceLine(bundle: LlmBundle): string {
  if (bundle.source === "cache") {
    return "cache (24h TTL)";
  }
  if (bundle.source === "fallback") {
    return "규칙 기반 템플릿";
  }
  return bundle.modelUsed;
}

export function Report1({
  data,
  llm,
  rawDataDigest,
  prevalenceMetric,
}: Props) {
  const { product, judgment, priceRows, matchedDistributors, sourceAggregation } =
    data;

  const tender = priceRows.filter((r) => r.pa_price_type === "tender_award");
  const retail = priceRows.filter((r) =>
    ["retail_normal", "retail_promo"].includes(r.pa_price_type ?? ""),
  );

  const collectedDate = new Date().toISOString().slice(0, 10);

  const pdfPayload: PdfDownloadClientPayload = {
    productId: product.product_id,
    brandName: product.kr_brand_name,
    innEn: product.who_inn_en,
    dosageForm: dosageForm(product.who_inn_en),
    hsCode: hsForProduct(product.who_inn_en),
    caseGrade: judgment.case,
    caseVerdict: judgment.verdict,
    confidence: judgment.confidence,
    emlWho: data.emlWho,
    emlPaho: data.emlPaho,
    prevalenceMetric,
    distributorNames: matchedDistributors.map((d) => d.company_name),
    panamacompraCount: data.panamacompraCount,
    rawDataDigest,
    sourceRows: sourceAggregation.map((r) => ({
      source: r.pa_source,
      count: r.count,
      avgConfidence: r.avgConfidence ?? 0,
    })),
  };

  return (
    <article className="mx-auto max-w-4xl space-y-10 px-4 py-10 text-slate-800">
      <h1 className="text-3xl font-bold text-[#1B2A4A]">
        파나마 시장 진출 적합 분석 — {product.kr_brand_name}
      </h1>

      {/* 블록 1 */}
      <section className="space-y-2 border-b border-slate-200 pb-6">
        <h2 className="text-xl font-semibold text-[#1B2A4A]">① 제품 식별</h2>
        <div className="grid gap-1 text-base">
          <p>
            <span className="font-medium">브랜드명</span> | {product.kr_brand_name}{" "}
            | <span className="font-medium">WHO INN</span> |{" "}
            {product.who_inn_en} | <span className="font-medium">함량·제형</span>{" "}
            | {dosageForm(product.who_inn_en)} |{" "}
            <span className="font-medium">HS</span> |{" "}
            {hsForProduct(product.who_inn_en)} |{" "}
            <span className="font-medium">Case</span> | {judgment.case} |{" "}
            <span className="font-medium">confidence</span> |{" "}
            {judgment.confidence.toFixed(2)}
          </p>
        </div>
      </section>

      {/* 블록 2 */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[#1B2A4A]">② 핵심 판정</h2>
        <CaseBadge judgment={judgment} />
      </section>

      {/* 블록 3 — LLM */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[#1B2A4A]">
          ③ 두괄식 판정 근거
        </h2>
        <ol className="list-inside list-decimal space-y-2 text-base leading-relaxed text-slate-800">
          {llm.payload.block3_reasoning.map((line, i) => (
            <li key={i} className="pl-1">
              {line}
            </li>
          ))}
        </ol>
      </section>

      {/* 블록 4 — LLM */}
      <section className="space-y-6 border-b border-slate-200 pb-8">
        <h2 className="text-xl font-semibold text-[#1B2A4A]">
          ④ 시장 진출 전략
        </h2>

        <div>
          <h3 className="mb-2 font-medium text-[#1B2A4A]">4-1 진입 채널 권고</h3>
          <p className="whitespace-pre-wrap text-base leading-relaxed">
            {llm.payload.block4_1_channel}
          </p>
        </div>

        <div>
          <h3 className="mb-2 font-medium text-[#1B2A4A]">4-2 가격 포지셔닝</h3>
          <p className="whitespace-pre-wrap text-base leading-relaxed">
            {llm.payload.block4_2_pricing}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            (참고) 공공·민간 표본: 낙찰 {tender.length}건 · 민간 {retail.length}건
          </p>
        </div>

        <div>
          <h3 className="mb-2 font-medium text-[#1B2A4A]">4-3 유통 파트너 후보</h3>
          <p className="whitespace-pre-wrap text-base leading-relaxed">
            {llm.payload.block4_3_partners}
          </p>
        </div>

        <div>
          <h3 className="mb-2 font-medium text-[#1B2A4A]">4-4 리스크·조건</h3>
          <p className="whitespace-pre-wrap text-base leading-relaxed">
            {llm.payload.block4_4_risks}
          </p>
        </div>
      </section>

      {/* 블록 5 */}
      <section className="space-y-6">
        <h2 className="text-xl font-semibold text-[#1B2A4A]">
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
          <div className="whitespace-pre-line text-sm text-slate-600">
            {[
              `최종 수집: ${collectedDate}`,
              "수집 방식: L1 정적 seed (사용자 검증) + L2 조건부 크롤러",
              "의미적 신선도 판정: Phase 2 로드맵 — 해법 C (AI 2단계 게이트)",
              `LLM 본문 생성: ${formatLlmSourceLine(llm)}`,
            ].join("\n")}
          </div>
        </div>

        <PdfDownloadButton payload={pdfPayload} />
      </section>
    </article>
  );
}
