"use client";

import { useMemo, useState } from "react";

import type { StoredReportItem } from "@/src/lib/dashboard/reports_store";
import { sortAndExtractTopN } from "@/src/logic/phase3/psi_calculator";
import type { PartnerWithPSI, PSICheckedState, PSICriterionKey } from "@/src/logic/phase3/types";

interface Phase3SectionProps {
  isActive: boolean;
  reports: StoredReportItem[];
}

const CRITERION_LABELS: Record<PSICriterionKey, string> = {
  revenue: "① 매출규모",
  pipeline: "② 파이프라인 (동일/유사 의약품 취급)",
  manufacture: "③ 제조소 보유",
  import: "④ 수입 경험",
  pharmacy: "⑤ 약국체인 운영",
};

function formatReportLabel(item: StoredReportItem): string {
  const date = new Date(item.analyzedAt);
  if (Number.isNaN(date.getTime())) {
    return `1공정 보고서 · ${item.productBrandName} · 날짜 미상`;
  }
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `1공정 보고서 · ${item.productBrandName} · ${y}-${m}-${d} ${hh}:${mm}`;
}

function getConflictBlockClass(level: string): string {
  if (level === "upgrade_opportunity") {
    return "bg-[#fffbeb] border border-[#f5e6b3] text-[#7a5b00]";
  }
  if (level === "direct_competition") {
    return "bg-[#fef2f2] border border-[#f5c2c2] text-[#7f1d1d]";
  }
  if (level === "adjacent_category") {
    return "bg-[#ecfdf3] border border-[#b8e6cc] text-[#14532d]";
  }
  return "";
}

function getConflictTitle(level: string): string {
  if (level === "upgrade_opportunity") {
    return "🟡 경쟁/기회 이원 평가";
  }
  if (level === "direct_competition") {
    return "🔴 직접 경쟁 관계";
  }
  if (level === "adjacent_category") {
    return "🟢 인접 카테고리 경쟁자";
  }
  return "";
}

export function Phase3Section({ isActive, reports }: Phase3SectionProps) {
  const [expanded, setExpanded] = useState(true);
  const [reportId, setReportId] = useState("");
  const [partners, setPartners] = useState<PartnerWithPSI[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchMessage, setFetchMessage] = useState<string | null>(null);

  const [checked, setChecked] = useState<PSICheckedState>({
    revenue: true,
    pipeline: false,
    manufacture: false,
    import: false,
    pharmacy: false,
  });

  const selectedReport = useMemo(
    () => reports.find((r) => r.id === reportId) ?? null,
    [reports, reportId],
  );

  const productId = selectedReport?.productId ?? null;

  const topTen = useMemo(() => {
    return sortAndExtractTopN(partners, checked, 10);
  }, [partners, checked]);

  async function runAnalysis(): Promise<void> {
    if (!isActive) {
      window.alert("3공정은 1·2공정 완료 후 활성화됩니다.");
      return;
    }
    if (productId === null) {
      setError("먼저 1공정 보고서를 선택해 주세요.");
      return;
    }

    setLoading(true);
    setError(null);
    setFetchMessage(null);

    try {
      const res = await fetch("/api/panama/phase3/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: productId }),
      });

      const data = (await res.json()) as { partners?: PartnerWithPSI[]; error?: string };

      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : `HTTP ${String(res.status)}`);
      }

      setPartners(data.partners ?? []);
      const n = data.partners?.length ?? 0;
      setFetchMessage(
        n === 0
          ? "PSI 사전 계산 데이터가 없습니다. Supabase 테이블·스크립트 적용 후 다시 시도해 주세요."
          : `파트너 ${String(n)}건을 불러왔습니다. 체크박스로 가중치를 바꾸면 목록이 재정렬됩니다.`,
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "알 수 없는 오류";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function toggleCriterion(key: PSICriterionKey): void {
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <section className="rounded-[16px] border border-[#e3e9f2] bg-white shadow-sh2">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#1E3A5F] text-[11px] font-black text-white">
            03
          </span>
          <div>
            <h3 className="text-[16px] font-extrabold text-[#1f3e64]">3공정 · 파트너 매칭 (PSI)</h3>
            <p className="text-[11px] text-[#7a8ba1]">
              사전 계산 PSI · 체크박스 가중치 재정렬 · 경쟁/기회 이원 플래그
            </p>
          </div>
        </div>
        <span className="text-[14px] text-[#516882]">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded ? (
        <div className="space-y-3 border-t border-[#edf1f6] px-4 pb-4 pt-3">
          <div>
            <p className="mb-1 text-[10.5px] font-semibold text-[#667b95]">1공정 보고서 선택</p>
            <div className="grid gap-2 md:grid-cols-[1fr_auto]">
              <select
                value={reportId}
                onChange={(event) => setReportId(event.target.value)}
                className="h-[40px] rounded-[10px] border border-[#dce4f0] bg-[#edf2f9] px-3 text-[12px] font-semibold text-[#273f60] outline-none focus:ring-2 focus:ring-[#1E3A5F]/20"
              >
                <option value="">보고서를 선택하세요</option>
                {reports.map((r) => (
                  <option key={r.id} value={r.id}>
                    {formatReportLabel(r)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  void runAnalysis();
                }}
                disabled={!isActive || loading || productId === null}
                className="h-[40px] rounded-[10px] bg-[#1E4E8C] px-5 text-[12px] font-extrabold text-white hover:bg-[#1a4378] disabled:opacity-60"
              >
                {loading ? "불러오는 중…" : "▶ 파트너 분석 실행"}
              </button>
            </div>
          </div>

          {error !== null ? (
            <div className="rounded-[10px] border border-[#f5c2c2] bg-[#fef2f2] p-3 text-[12px] text-[#991b1b]">
              {error}
            </div>
          ) : null}

          {fetchMessage !== null ? (
            <div className="rounded-[10px] border border-[#dbe3ef] bg-[#f4f7fc] p-3 text-[11px] text-[#3e5574]">
              {fetchMessage}
            </div>
          ) : null}

          <div className="rounded-[12px] border border-[#dce4ef] bg-[#f7f9fc] p-3">
            <p className="mb-2 text-[11px] font-bold text-[#1f3e64]">
              평가 기준 선택 (유나이티드 제약 확정 우선순위, 체크된 항목만 재정규화)
            </p>
            <div className="grid grid-cols-1 gap-1.5 md:grid-cols-2">
              {(Object.keys(CRITERION_LABELS) as PSICriterionKey[]).map((key) => (
                <label key={key} className="flex cursor-pointer items-center gap-2 text-[11px] text-[#2b4568]">
                  <input
                    type="checkbox"
                    className="rounded border-[#cbd5e1]"
                    checked={checked[key]}
                    onChange={() => {
                      toggleCriterion(key);
                    }}
                  />
                  <span>{CRITERION_LABELS[key]}</span>
                </label>
              ))}
            </div>
          </div>

          {topTen.length > 0 ? (
            <div className="space-y-3">
              <h4 className="text-[13px] font-extrabold text-[#1f3e64]">Top 10 추천 파트너 (동적 PSI)</h4>
              {topTen.map((p, idx) => (
                <div
                  key={`${p.partner_id}-${p.product_id}`}
                  className="rounded-[12px] border border-[#dce4ef] bg-white p-3 shadow-sh3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] text-[#8b97aa]">#{String(idx + 1)}</span>
                      <h5 className="text-[14px] font-extrabold text-[#1f3e64]">{p.company_name}</h5>
                      <p className="text-[10px] text-[#6f8299]">
                        {[p.company_type, p.city].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-[22px] font-black text-[#1E4E8C]">{String(p.dynamic_psi)}</div>
                      <div className="text-[9px] text-[#8b97aa]">동적 PSI</div>
                    </div>
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-1.5 text-[10px] md:grid-cols-5">
                    <div>
                      <div className="text-[#8b97aa]">매출</div>
                      <div className="font-semibold text-[#273f60]">{p.revenue_tier_label}</div>
                    </div>
                    <div>
                      <div className="text-[#8b97aa]">파이프라인</div>
                      <div className="font-semibold text-[#273f60]">{p.pipeline_tier_label}</div>
                    </div>
                    <div>
                      <div className="text-[#8b97aa]">제조소</div>
                      <div className="font-semibold text-[#273f60]">{p.manufacturing_label}</div>
                    </div>
                    <div>
                      <div className="text-[#8b97aa]">수입</div>
                      <div className="font-semibold text-[#273f60]">{p.import_experience_label}</div>
                    </div>
                    <div>
                      <div className="text-[#8b97aa]">약국</div>
                      <div className="font-semibold text-[#273f60]">{p.pharmacy_chain_label}</div>
                    </div>
                  </div>

                  <div className="mt-1 text-[10px] text-[#8b97aa]">
                    기본 PSI(고정 가중치): <span className="font-semibold">{String(p.psi_total_default)}</span>
                  </div>

                  {p.conflict_level !== "none" && p.conflict_insight !== null && p.conflict_insight !== "" ? (
                    <div className={`mt-2 rounded-[10px] p-2 text-[10px] leading-relaxed ${getConflictBlockClass(p.conflict_level)}`}>
                      <div className="mb-1 font-bold">{getConflictTitle(p.conflict_level)}</div>
                      <p>{p.conflict_insight}</p>
                    </div>
                  ) : null}

                  {p.pipeline_matched_products !== null && p.pipeline_matched_products.length > 0 ? (
                    <div className="mt-2 border-t border-[#edf1f6] pt-2 text-[10px]">
                      <span className="text-[#8b97aa]">현재 취급 경쟁 제품: </span>
                      <span className="font-semibold text-[#273f60]">{p.pipeline_matched_products.join(", ")}</span>
                    </div>
                  ) : null}

                  <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-[#516882]">
                    {p.phone !== null && p.phone !== "" ? <span>📞 {p.phone}</span> : null}
                    {p.email !== null && p.email !== "" ? <span>✉ {p.email}</span> : null}
                    {p.website !== null && p.website !== "" ? (
                      <a
                        href={p.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-[#1E4E8C] underline"
                      >
                        웹사이트
                      </a>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
