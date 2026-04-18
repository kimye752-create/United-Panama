"use client";

import { useMemo, useState } from "react";

import {
  buildPartnerScores,
  calculateCompositeScore,
} from "@/src/logic/partner_scorer";
import type {
  EvaluationCriterion,
  PartnerCandidate,
} from "@/src/types/phase3_partner";
import { findProductById } from "@/src/utils/product-dictionary";
import { CriterionCheckbox } from "./CriterionCheckbox";
import { PartnerCard } from "./PartnerCard";

interface Phase3PartnerDiscoveryProps {
  productId: string;
  top10Initial: PartnerCandidate[];
  isAnalysisComplete: boolean;
}

const CRITERIA: Array<{ key: EvaluationCriterion; label: string }> = [
  { key: "revenue", label: "① 매출규모" },
  { key: "pipeline", label: "② 파이프라인 (동일 성분·유사 의약품 취급 이력)" },
  { key: "gmp", label: "③ 제조소 보유 여부 (GMP 인증)" },
  { key: "import", label: "④ 수입 경험 여부" },
  { key: "pharmacy_chain", label: "⑤ 해당 국가 약국 체인 운영 여부" },
];

export function Phase3PartnerDiscovery({
  productId,
  top10Initial,
  isAnalysisComplete,
}: Phase3PartnerDiscoveryProps) {
  const [checkedItems, setCheckedItems] = useState<Set<EvaluationCriterion>>(
    new Set(["revenue"]),
  );
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const product = findProductById(productId);
  const inn = product?.who_inn_en ?? "";
  const atc4 = product?.atc4_code ?? "";

  const sortedTop10 = useMemo(() => {
    return [...top10Initial]
      .map((candidate) => {
        const scores = buildPartnerScores(candidate, inn, atc4);
        return {
          ...candidate,
          score_revenue: scores.revenue,
          score_pipeline: scores.pipeline,
          score_gmp: scores.gmp,
          score_import: scores.import,
          score_pharmacy_chain: scores.pharmacy_chain,
          composite_score: calculateCompositeScore(scores, checkedItems),
        };
      })
      .sort((a, b) => b.composite_score - a.composite_score);
  }, [atc4, checkedItems, inn, top10Initial]);

  const toggleCriterion = (criterion: EvaluationCriterion) => {
    const next = new Set(checkedItems);
    if (next.has(criterion)) {
      next.delete(criterion);
    } else {
      next.add(criterion);
    }
    setCheckedItems(next);
  };

  const downloadBuyerList = () => {
    const lines = [
      "파나마 유망 파트너 리스트 (3공정)",
      `제품: ${product?.kr_brand_name ?? productId}`,
      `선택 기준: ${Array.from(checkedItems.values()).join(", ")}`,
      "",
      ...sortedTop10.map(
        (row, idx) =>
          `${idx + 1}. ${row.company_name} | 종합점수 ${row.composite_score.toFixed(1)} | 매출 ${row.score_revenue?.toFixed(1) ?? "(미수집)"}`,
      ),
    ];
    const blob = new Blob([lines.join("\n")], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `phase3_buyers_${productId}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (!isAnalysisComplete) {
    return (
      <div className="rounded-[10px] border border-[#dce4ef] bg-[#fbfcfe] px-3 py-4 text-[12px] text-[#8a99ad]">
        파트너 매칭을 실행해 분석을 시작하세요.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <h4 className="mb-2 text-[12px] font-bold text-[#1f3e64]">
          평가 항목 선택 (다중 선택 가능)
        </h4>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {CRITERIA.map((criterion) => (
            <CriterionCheckbox
              key={criterion.key}
              label={criterion.label}
              checked={checkedItems.has(criterion.key)}
              onToggle={() => toggleCriterion(criterion.key)}
            />
          ))}
        </div>
      </div>
      <div className="space-y-2">
        {sortedTop10.map((candidate, idx) => (
          <PartnerCard
            key={candidate.id}
            rank={idx + 1}
            candidate={candidate}
            isExpanded={expandedCard === candidate.id}
            onToggleExpand={() =>
              setExpandedCard(expandedCard === candidate.id ? null : candidate.id)
            }
          />
        ))}
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={downloadBuyerList}
          className="inline-flex h-[36px] items-center rounded-[10px] border border-[#d9e1ed] bg-[#f5f8fc] px-4 text-[12px] font-bold text-[#1f3e64]"
        >
          📄 바이어 리스트 다운로드
        </button>
      </div>
    </div>
  );
}

