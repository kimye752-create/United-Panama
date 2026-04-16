import type { DashboardBundle } from "./types";

interface PerplexityPapersProps {
  dashboard: DashboardBundle;
}

function badgeClass(category: string): string {
  if (category.includes("거시")) {
    return "bg-blue-100 text-blue-700";
  }
  if (category.includes("규제")) {
    return "bg-violet-100 text-violet-700";
  }
  if (category.includes("가격")) {
    return "bg-emerald-100 text-emerald-700";
  }
  return "bg-slate-100 text-slate-700";
}

export function PerplexityPapers({ dashboard }: PerplexityPapersProps) {
  const papers = dashboard.perplexityPapers;

  return (
    <section className="rounded-[12px] border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[13px] font-semibold text-slate-700">● PERPLEXITY 추천 논문</p>
      {papers.length === 0 ? (
        <p className="mt-3 text-[12px] text-slate-500">
          해당 INN 관련 캐시된 논문이 없습니다. ({dashboard.perplexitySource})
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          {papers.slice(0, 6).map((paper, index) => (
            <article key={`${paper.url}-${index}`} className="rounded-[10px] border border-slate-100 p-3">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${badgeClass(paper.source)}`}>
                  {paper.source}
                </span>
                <span className="text-[10px] text-slate-500">{paper.published_at?.slice(0, 10) ?? "연도 미상"}</span>
              </div>
              <a
                href={paper.url}
                target="_blank"
                rel="noreferrer"
                className="text-[14px] font-semibold text-[#173f78] underline"
              >
                {paper.title}
              </a>
              <p className="mt-1 text-[12px] leading-relaxed text-slate-700">{paper.summary}</p>
              <p className="mt-1 text-[11px] text-slate-500">{paper.url}</p>
            </article>
          ))}
        </div>
      )}
      <p className="mt-3 text-[11px] text-emerald-700">
        ✅ 하이브리드 검색 · PubMed {papers.filter((paper) => paper.source.toLowerCase().includes("pubmed")).length}건 ·
        Perplexity {papers.filter((paper) => !paper.source.toLowerCase().includes("pubmed")).length}건
      </p>
    </section>
  );
}
