import React from "react";

import type { Report1PayloadV3 } from "@/src/llm/report1_schema";

interface Report1V3Props {
  brandName: string;
  innEn: string;
  hsCode: string;
  caseGrade: string;
  caseVerdict: string;
  confidence: number;
  payload: Report1PayloadV3;
}

export function Report1V3(props: Report1V3Props) {
  const { brandName, innEn, hsCode, caseGrade, caseVerdict, confidence, payload } = props;
  const { public_procurement_missing, retail_missing, note: gapNote } = payload.block3_data_gaps;
  const hasGap = public_procurement_missing || retail_missing;
  const collectedDate = new Date().toISOString().slice(0, 10);

  return (
    <div className="report-a4-web-root space-y-6 bg-slate-100 py-4">
      <article className="mx-auto flex min-h-[297mm] max-w-[210mm] flex-col border border-slate-300 bg-white text-slate-900 shadow-md print:shadow-none print:border-0">
        <div className="flex flex-1 flex-col px-6 pb-4 pt-6 md:px-8 md:pt-8">
          <div className="min-h-0 flex-1 space-y-5">
            <header className="border-b-2 border-slate-800 pb-4 text-center">
              <p className="text-xs font-medium tracking-wide text-slate-600">
                KOREA UNITED PHARM INC.
              </p>
              <h1 className="mt-1 text-xl font-bold text-slate-900">
                UPharma Export AI | 파나마 1공정 시장 분석 보고서
              </h1>
              <p className="mt-2 text-xs text-slate-500">{collectedDate}</p>
              <p className="mt-2 bg-[#2c3e50] px-3 py-2.5 text-sm leading-snug text-white">
                {brandName} — {innEn} | HS {hsCode} | Case {caseGrade} | confidence{" "}
                {confidence.toFixed(2)}
              </p>
            </header>

            <section className="space-y-2">
              <h2 className="border border-slate-300 border-b-0 bg-slate-200 px-2 py-1.5 text-sm font-semibold text-slate-900">
                ① 핵심 판정
              </h2>
              <div className="rounded border border-slate-300 bg-slate-50 px-3 py-2">
                <p className="text-sm font-semibold text-slate-900">{caseVerdict}</p>
              </div>
            </section>

            <section className="space-y-2">
              <h2 className="border border-slate-300 border-b-0 bg-slate-200 px-2 py-1.5 text-sm font-semibold text-slate-900">
                ② 두괄식 판정 근거
              </h2>
              <div className="space-y-2 border border-slate-300 p-3 text-sm leading-relaxed">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">시장 / 의료</h3>
                  <p className="mt-1 text-slate-700">{payload.block2_market_medical}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">규제</h3>
                  <p className="mt-1 text-slate-700">{payload.block2_regulation}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">무역</h3>
                  <p className="mt-1 text-slate-700">{payload.block2_trade}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">조달</h3>
                  <p className="mt-1 text-slate-700">{payload.block2_procurement}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">유통</h3>
                  <p className="mt-1 text-slate-700">{payload.block2_distribution}</p>
                </div>
                {payload.block2_reference_price !== null && (
                  <div className="rounded border border-indigo-100 bg-indigo-50 px-2 py-2">
                    <h3 className="text-sm font-semibold text-indigo-900">참고 가격</h3>
                    <p className="mt-1 text-indigo-800">{payload.block2_reference_price}</p>
                  </div>
                )}
              </div>
            </section>

            <section className="space-y-2">
              <h2 className="border border-slate-300 border-b-0 bg-slate-200 px-2 py-1.5 text-sm font-semibold text-slate-900">
                ③ 시장 진출 전략
              </h2>
              <div className="space-y-2 border border-slate-300 p-3 text-sm leading-relaxed">
                {hasGap && (
                  <div className="rounded border border-yellow-200 bg-yellow-50 p-3">
                    <span className="font-semibold text-yellow-900">⚠ 데이터 수집 현황: </span>
                    <span className="text-yellow-900">{gapNote}</span>
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">3-1 진입 채널</h3>
                  <p className="mt-1 text-slate-700">{payload.block3_1_channel}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">3-2 가격 포지셔닝</h3>
                  <p className="mt-1 text-slate-700">{payload.block3_2_pricing}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">3-3 유통 파트너</h3>
                  <p className="mt-1 text-slate-700">{payload.block3_3_partners}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">3-4 리스크·조건</h3>
                  <p className="mt-1 text-slate-700">{payload.block3_4_risks}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">3-5 진출 가능성</h3>
                  <p className="mt-1 text-slate-700">{payload.block3_5_entry_feasibility}</p>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="border border-slate-300 border-b-0 bg-slate-200 px-2 py-1.5 text-sm font-semibold text-slate-900">
                ④ 근거 · 출처
              </h2>
              <div className="space-y-2 border border-slate-300 p-3">
                <h3 className="text-sm font-semibold text-slate-900">
                  4-1. Perplexity 추천 논문
                </h3>
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="w-14 border border-slate-300 p-2 text-center">No.</th>
                      <th className="border border-slate-300 p-2 text-left">논문 제목 / 출처</th>
                      <th className="border border-slate-300 p-2 text-left">한국어 요약</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payload.block4_papers.map((paper) => (
                      <tr key={paper.no}>
                        <td className="border border-slate-300 p-2 text-center align-top">
                          {paper.no}
                        </td>
                        <td className="border border-slate-300 p-2 align-top">
                          <div className="font-semibold text-slate-900">{paper.title}</div>
                          <div className="text-xs text-slate-600">[{paper.source}]</div>
                          <a
                            href={paper.url}
                            target="_blank"
                            rel="noreferrer"
                            className="break-all text-xs text-blue-600 underline"
                          >
                            {paper.url}
                          </a>
                        </td>
                        <td className="border border-slate-300 p-2 align-top text-sm text-slate-700">
                          {paper.summary_ko}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <h3 className="pt-2 text-sm font-semibold text-slate-900">
                  4-2. 사용된 DB / 기관
                </h3>
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="border border-slate-300 p-2 text-left">DB / 기관명</th>
                      <th className="border border-slate-300 p-2 text-left">설명</th>
                      <th className="border border-slate-300 p-2 text-left">링크</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payload.block4_databases.map((db, index) => (
                      <tr key={`db-${index}`}>
                        <td className="border border-slate-300 p-2 align-top font-semibold text-slate-900">
                          {db.name}
                        </td>
                        <td className="border border-slate-300 p-2 align-top text-slate-700">
                          {db.description}
                        </td>
                        <td className="border border-slate-300 p-2 align-top text-xs">
                          {db.link !== null ? (
                            <a
                              href={db.link}
                              target="_blank"
                              rel="noreferrer"
                              className="break-all text-blue-600 underline"
                            >
                              {db.link}
                            </a>
                          ) : (
                            <span className="text-slate-500">내부 데이터</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
          <footer className="mt-6 border-t border-slate-200 pt-3 text-xs text-slate-500">
            <p>최종 수집: {collectedDate}</p>
            <p>LLM 본문 생성: Anthropic Claude Haiku (Tool Use 강제 양식 V3)</p>
          </footer>
        </div>
      </article>
    </div>
  );
}
