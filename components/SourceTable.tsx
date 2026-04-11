/**
 * 블록 5-1 — 출처 × 건수 × 신뢰도 (Supabase 집계 결과)
 */
import type { SourceAggRow } from "@/src/logic/fetch_panama_data";

type Props = {
  rows: readonly SourceAggRow[];
};

function prettySource(paSource: string): string {
  const m: Record<string, string> = {
    worldbank: "World Bank",
    pubmed: "PubMed",
    ita: "ITA",
    kotra: "KOTRA",
    motie: "MOTIE",
    panamacompra: "PanamaCompra",
    acodeco: "ACODECO",
    minsa: "MINSA",
    css: "CSS",
    arrocha: "Arrocha",
    metroplus: "Metro Plus",
    metro_plus: "Metro Plus",
    gemini_seed: "Gemini seed",
  };
  return m[paSource] ?? paSource;
}

export function SourceTable({ rows }: Props) {
  const sorted = [...rows].sort((a, b) =>
    a.pa_source.localeCompare(b.pa_source),
  );
  return (
    <div className="overflow-x-auto rounded border border-slate-200">
      <table className="w-full text-left text-sm font-mono">
        <thead className="bg-slate-50 text-slate-700">
          <tr>
            <th className="px-3 py-2">출처</th>
            <th className="px-3 py-2">건수</th>
            <th className="px-3 py-2">신뢰도(평균)</th>
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={3} className="px-3 py-3 text-slate-500">
                데이터 수집 중
              </td>
            </tr>
          ) : (
            sorted.map((r) => (
              <tr key={r.pa_source} className="border-t border-slate-100">
                <td className="px-3 py-1.5">{prettySource(r.pa_source)}</td>
                <td className="px-3 py-1.5">{r.count}건</td>
                <td className="px-3 py-1.5">
                  {r.avgConfidence === null ? "—" : r.avgConfidence.toFixed(2)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
