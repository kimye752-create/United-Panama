import { ScoreCell } from "./ScoreCell";
import type { PartnerCandidate } from "@/src/types/phase3_partner";

interface PartnerCardProps {
  rank: number;
  candidate: PartnerCandidate & { composite_score: number };
  isExpanded: boolean;
  onToggleExpand: () => void;
}

function displayText(value: string | null): string {
  if (value === null || value.trim() === "") {
    return "(미수집)";
  }
  return value;
}

function displayBool(value: boolean | null): string {
  if (value === null) {
    return "(미수집)";
  }
  return value ? "O" : "X";
}

function deriveChannelLabel(candidate: PartnerCandidate): string {
  if (candidate.pharmacy_chain_operator === true && candidate.import_history === true) {
    return "수입·유통";
  }
  if (candidate.pharmacy_chain_operator === true) {
    return "약국 체인";
  }
  if (candidate.import_history === true) {
    return "수입사";
  }
  return "도매/기타";
}

export function PartnerCard({
  rank,
  candidate,
  isExpanded,
  onToggleExpand,
}: PartnerCardProps) {
  return (
    <article className="rounded-[16px] bg-white p-3 shadow-sh2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold text-[#1f3e64]">
            {rank}위 · 🏢 {candidate.company_name}
          </p>
          <p className="text-[10.5px] text-[#6f8299]">📍 파나마 · 💼 {deriveChannelLabel(candidate)}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[#edf4ff] px-2 py-0.5 text-[10px] font-bold text-[#1f3e64]">
            ⭐ {candidate.composite_score.toFixed(1)}
          </span>
          <button
            type="button"
            onClick={onToggleExpand}
            className="text-[10.5px] font-bold text-[#1e4e8c]"
          >
            {isExpanded ? "▲ 접기" : "▼ 상세보기"}
          </button>
        </div>
      </div>
      {isExpanded ? (
        <div className="mt-3 space-y-3 border-t border-[#ecf1f7] pt-3 text-[11px] text-[#2d4564]">
          <section>
            <p className="mb-1 font-bold">📋 1차 수집 — 연락처 & 기본 정보</p>
            <ul className="space-y-0.5">
              <li>전화: {displayText(candidate.phone)}</li>
              <li>이메일: {displayText(candidate.email)}</li>
              <li>소재지: {displayText(candidate.address)}</li>
              <li>웹사이트: {displayText(candidate.website)}</li>
              <li className="text-[10px] text-[#72859f]">
                출처: {displayText(candidate.source_primary)} ({displayText(candidate.collected_primary_at)})
              </li>
            </ul>
          </section>
          <section>
            <p className="mb-1 font-bold">🔍 2차 심층 수집 — 정량·정성</p>
            <ul className="space-y-0.5">
              <li>매출 규모: {candidate.revenue_usd === null ? "(미수집)" : `$${candidate.revenue_usd.toLocaleString("en-US")}`}</li>
              <li>임직원 수: {candidate.employee_count ?? "(미수집)"}</li>
              <li>설립연도: {candidate.founded_year ?? "(미수집)"}</li>
              <li>취급 치료영역: {(candidate.therapeutic_areas ?? []).join(", ") || "(미수집)"}</li>
              <li>GMP 제조시설: {displayBool(candidate.gmp_certified)}</li>
              <li>수입 이력: {displayBool(candidate.import_history)} {candidate.import_history === true ? `— ${displayText(candidate.import_history_detail)}` : ""}</li>
              <li>공공조달 낙찰: {candidate.public_procurement_wins ?? "(미수집)"}</li>
              <li>약국 체인: {displayBool(candidate.pharmacy_chain_operator)}</li>
              <li>MAH 가능: {displayBool(candidate.mah_capable)}</li>
              <li>한국 거래: {displayBool(candidate.korea_partnership)} {candidate.korea_partnership === true ? `— ${displayText(candidate.korea_partnership_detail)}` : ""}</li>
              <li className="text-[10px] text-[#72859f]">
                출처: {(candidate.source_secondary ?? []).join(", ") || "(미수집)"}
              </li>
            </ul>
          </section>
          <section>
            <p className="mb-1 font-bold">📊 평가 항목별 점수</p>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
              <ScoreCell label="① 매출" score={candidate.score_revenue} />
              <ScoreCell label="② 파이프라인" score={candidate.score_pipeline} />
              <ScoreCell label="③ 제조소" score={candidate.score_gmp} />
              <ScoreCell label="④ 수입" score={candidate.score_import} />
              <ScoreCell label="⑤ 약국체인" score={candidate.score_pharmacy_chain} />
            </div>
          </section>
        </div>
      ) : null}
    </article>
  );
}

