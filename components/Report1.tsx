/**
 * 보고서 1장 — A4 문서형(표·배너) 웹 렌더링 + REPORT1_SPEC 5블록 데이터 동일
 * (이전 세로형 ①②③ 섹션 레이아웃은 제거됨 — CaseBadge·롱폼 나열 대신 표 중심)
 */
import type { AnalyzePanamaResult } from "@/src/logic/panama_analysis";
import type { Report1Payload } from "@/src/llm/report1_schema";

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
  prevalenceMetric: string;
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

/** A4 폭에 가깝게 — 인쇄 시 한 페이지에 가깝게 보이도록 */
const docShell =
  "mx-auto max-w-[210mm] bg-white text-slate-900 shadow-md border border-slate-300 print:shadow-none print:border-0";

const sectionBar =
  "bg-slate-200 text-slate-900 text-sm font-semibold px-2 py-1.5 border border-slate-300 border-b-0";

const cellLabel = "border border-slate-300 bg-slate-50 font-medium text-slate-800";
const cellValue = "border border-slate-300 text-slate-800";

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
    <article className={docShell}>
      <div className="space-y-5 p-6 md:p-8">
        <header className="border-b-2 border-slate-800 pb-4 text-center">
          <p className="text-xs font-medium tracking-wide text-slate-600">
            KOREA UNITED PHARM INC.
          </p>
          <h1 className="mt-1 text-xl font-bold text-slate-900">
            파나마 시장 분석 보고서
          </h1>
          <p className="mt-2 text-xs text-slate-500">{collectedDate}</p>
        </header>

        <div className="bg-[#2c3e50] px-3 py-2.5 text-sm leading-snug text-white">
          {product.kr_brand_name} — {product.who_inn_en} |{" "}
          {dosageForm(product.who_inn_en)} | HS {hsForProduct(product.who_inn_en)}{" "}
          | Case {judgment.case} | confidence {judgment.confidence.toFixed(2)}
        </div>

        <section>
          <h2 className={sectionBar}>1. 진출 적합 판정</h2>
          <table className="w-full border-collapse border border-slate-300 text-sm">
            <tbody>
              <tr>
                <td
                  className={`${cellLabel} w-[28%] px-2 py-2 align-middle`}
                  scope="row"
                >
                  판정
                </td>
                <td className={`${cellValue} px-2 py-2 align-middle`}>
                  {judgment.verdict}
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <section>
          <h2 className={sectionBar}>2. 판정 근거</h2>
          <table className="w-full border-collapse border border-slate-300 text-sm">
            <tbody>
              {llm.payload.block3_reasoning.map((line, i) => (
                <tr key={i}>
                  <td
                    className={`${cellLabel} w-10 text-center align-top text-xs`}
                  >
                    {i + 1}
                  </td>
                  <td className={`${cellValue} px-2 py-1.5 align-top leading-relaxed`}>
                    {line}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section>
          <h2 className={sectionBar}>3. 시장 진출 전략</h2>
          <table className="w-full border-collapse border border-slate-300 text-sm">
            <tbody>
              <tr>
                <td className={`${cellLabel} w-[28%] align-top px-2 py-2`}>
                  진입 채널 전략
                </td>
                <td className={`${cellValue} whitespace-pre-wrap px-2 py-2 align-top`}>
                  {llm.payload.block4_1_channel}
                </td>
              </tr>
              <tr>
                <td className={`${cellLabel} align-top px-2 py-2`}>
                  가격 포지셔닝
                </td>
                <td className={`${cellValue} whitespace-pre-wrap px-2 py-2 align-top`}>
                  {llm.payload.block4_2_pricing}
                </td>
              </tr>
              <tr>
                <td className={`${cellLabel} align-top px-2 py-2`}>
                  유통 파트너
                </td>
                <td className={`${cellValue} whitespace-pre-wrap px-2 py-2 align-top`}>
                  {llm.payload.block4_3_partners}
                </td>
              </tr>
              <tr>
                <td className={`${cellLabel} align-top px-2 py-2`}>
                  리스크·조건
                </td>
                <td className={`${cellValue} whitespace-pre-wrap px-2 py-2 align-top`}>
                  {llm.payload.block4_4_risks}
                </td>
              </tr>
            </tbody>
          </table>
          <p className="mt-1 text-xs text-slate-500">
            (참고) 공공·민간 표본: 낙찰 {tender.length}건 · 민간 {retail.length}건
          </p>
        </section>

        <section className="space-y-3">
          <h2 className={sectionBar}>4. 근거 및 출처</h2>
          <div>
            <p className="mb-1 text-xs font-semibold text-slate-800">참조 데이터</p>
            <SourceTable rows={sourceAggregation} />
          </div>

          <div className="rounded border border-slate-300 bg-slate-50/80 p-3 text-sm leading-relaxed text-slate-700">
            <p className="mb-2 text-xs font-semibold text-slate-800">
              참조 사이트 (카테고리)
            </p>
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

          <div className="rounded border border-slate-200 bg-white px-2 py-2 text-xs text-slate-600">
            {[
              `최종 수집: ${collectedDate}`,
              "수집 방식: L1 정적 seed (사용자 검증) + L2 조건부 크롤러",
              "의미적 신선도 판정: Phase 2 로드맵 — 해법 C (AI 2단계 게이트)",
              `LLM 본문 생성: ${formatLlmSourceLine(llm)}`,
            ].join(" · ")}
          </div>

          <PdfDownloadButton payload={pdfPayload} />
        </section>
      </div>
    </article>
  );
}
