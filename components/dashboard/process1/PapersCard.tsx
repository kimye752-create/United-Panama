import { Card, IRow } from "../shared/Card";

const PAPERS = [
  "Panama Dyslipidemia Burden and Treatment Trend",
  "LATAM Statin Utilization in Public Procurement",
  "Cost-effectiveness of Rosuvastatin Combination Therapy",
] as const;

export function PapersCard() {
  return (
    <Card title="Perplexity 추천 논문">
      {PAPERS.map((paper) => (
        <IRow key={paper}>
          <div className="text-[12px] font-bold text-navy">{paper}</div>
          <div className="mt-1 text-[10.5px] text-muted">PubMed · WHO · PAHO</div>
        </IRow>
      ))}
    </Card>
  );
}
