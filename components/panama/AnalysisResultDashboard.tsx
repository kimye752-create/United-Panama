import { CrawlingResultCard } from "./CrawlingResultCard";
import { FeasibilityResult } from "./FeasibilityResult";
import { JudgmentBanner } from "./JudgmentBanner";
import { MarketStrategyGrid } from "./MarketStrategyGrid";
import { PdfReportViewer } from "./PdfReportViewer";
import { PerplexityPapers } from "./PerplexityPapers";
import type { DashboardBundle } from "./types";

interface AnalysisResultDashboardProps {
  dashboard: DashboardBundle;
  onReanalyze: () => void;
  loading: boolean;
}

export function AnalysisResultDashboard({
  dashboard,
  onReanalyze,
  loading,
}: AnalysisResultDashboardProps) {
  return (
    <section className="space-y-4 rounded-[12px] bg-[#f8f9fa] p-4">
      <CrawlingResultCard dashboard={dashboard} />
      <JudgmentBanner dashboard={dashboard} />
      <FeasibilityResult dashboard={dashboard} />
      <MarketStrategyGrid dashboard={dashboard} />
      <PerplexityPapers dashboard={dashboard} />
      <div className="pt-1">
        <button
          type="button"
          onClick={onReanalyze}
          disabled={loading}
          className="inline-flex h-[34px] items-center rounded-[10px] border border-slate-300 bg-white px-3 text-[12px] font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          ↺ 재분석
        </button>
      </div>
      <PdfReportViewer productId={dashboard.product.product_id} />
    </section>
  );
}
