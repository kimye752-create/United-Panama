"use client";

import { LayoutGroup } from "framer-motion";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { StoredReportItem } from "@/src/lib/dashboard/reports_store";
import { fetchPartnersForProduct } from "@/src/lib/phase3/partner-data-loader";
import { uuidToProductSlug } from "@/src/lib/phase3/product-uuid-to-slug";
import { rankPartnersForDisplay } from "@/src/lib/phase3/psi-calculator";
import type { PartnerWithDynamicPsi } from "@/src/lib/phase3/psi-calculator";
import type { PartnerWithPSI } from "@/src/lib/phase3/types";
import type { Phase3WorkflowStepIndex, PSICheckedState, PSICriterionKey } from "@/src/lib/phase3/types";

import { SelectedProductBanner } from "./SelectedProductBanner";
import { Phase3ErrorBanner } from "./Phase3ErrorBanner";
import { Phase3ReportToolbar } from "./Phase3ReportToolbar";
import { Phase3WeightPanel } from "./Phase3WeightPanel";
import { Phase3WorkflowStepper } from "./Phase3WorkflowStepper";

const Phase3DetailModal = dynamic(
  () => import("./Phase3DetailModal").then((mod) => ({ default: mod.Phase3DetailModal })),
  { ssr: false },
);

const Phase3Top10Grid = dynamic(
  () => import("./Phase3Top10Grid").then((mod) => ({ default: mod.Phase3Top10Grid })),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[400px] items-center justify-center text-slate-400">파트너 카드 로딩 중...</div>
    ),
  },
);

const Phase3RankList = dynamic(
  () => import("./Phase3RankList").then((mod) => ({ default: mod.Phase3RankList })),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[200px] items-center justify-center text-slate-400">순위 목록 로딩 중...</div>
    ),
  },
);

interface Phase3ContainerProps {
  /** 1공정 완료 여부 — 3공정 실행 버튼 등 활성화에 사용 */
  phase1Complete: boolean;
  /** 2공정 완료 여부 */
  phase2Complete: boolean;
  reports: StoredReportItem[];
}

const DEFAULT_CHECKED: PSICheckedState = {
  revenue: true,
  pipeline: true,
  manufacture: true,
  import: true,
  pharmacy: true,
};

const DEBOUNCE_MS = 300;
/** 스테퍼 단계 전환 간격(ms) — 발표용으로 짧게 유지 */
const PIPELINE_STEP_DELAYS_MS = [400, 800, 1200] as const;

/** 3공정 파트너 발굴 UI A단계 — 스테퍼·가중치·계층 카드·모달 */
export function Phase3Container({ phase1Complete, phase2Complete, reports }: Phase3ContainerProps) {
  const [expanded, setExpanded] = useState(true);
  const [reportId, setReportId] = useState("");
  const [partners, setPartners] = useState<PartnerWithPSI[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchMessage, setFetchMessage] = useState<string | null>(null);
  const [checked, setChecked] = useState<PSICheckedState>({ ...DEFAULT_CHECKED });
  const [debouncedChecked, setDebouncedChecked] = useState<PSICheckedState>({ ...DEFAULT_CHECKED });
  const [modalPartner, setModalPartner] = useState<PartnerWithDynamicPsi | null>(null);
  /** 실행 버튼 클릭 후 ~분석 완료까지 true — 스테퍼는 이 구간에서만 표시 */
  const [isExecuting, setIsExecuting] = useState(false);
  /** 내부 파이프라인 단계(0~3), 4=4단계 모두 완료 */
  const [pipelineStep, setPipelineStep] = useState<Phase3WorkflowStepIndex>(0);
  const [pdfLoading, setPdfLoading] = useState(false);
  const progressTimersRef = useRef<number[]>([]);

  const selectedReport = useMemo(
    () => reports.find((r) => r.id === reportId) ?? null,
    [reports, reportId],
  );
  /** 세션 저장 항목의 productId (빈 문자열은 미선택과 동일 처리) */
  const productId = useMemo(() => {
    if (selectedReport === null) {
      return null;
    }
    const raw = selectedReport.productId.trim();
    return raw.length > 0 ? raw : null;
  }, [selectedReport]);

  const selectedProductSlug = useMemo(() => uuidToProductSlug(productId), [productId]);

  function clearProgressTimers(): void {
    for (const id of progressTimersRef.current) {
      window.clearTimeout(id);
    }
    progressTimersRef.current = [];
  }

  useEffect(() => {
    return () => {
      for (const id of progressTimersRef.current) {
        window.clearTimeout(id);
      }
      progressTimersRef.current = [];
    };
  }, []);

  const handleReportChange = useCallback((id: string): void => {
    setReportId(id);
    setPartners([]);
    setFetchMessage(null);
    setError(null);
    setModalPartner(null);
    setIsExecuting(false);
    setPipelineStep(0);
    clearProgressTimers();
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebouncedChecked(checked);
    }, DEBOUNCE_MS);
    return () => {
      window.clearTimeout(id);
    };
  }, [checked]);

  const ranked = useMemo(() => {
    return rankPartnersForDisplay(partners, debouncedChecked, 20);
  }, [partners, debouncedChecked]);

  const top10 = useMemo(() => ranked.slice(0, 10), [ranked]);
  const rest = useMemo(() => ranked.slice(10, 20), [ranked]);

  const openPartnerById = useCallback((partnerId: string): void => {
    const p = ranked.find((x) => x.partner_id === partnerId) ?? null;
    setModalPartner(p);
  }, [ranked]);

  const runAnalysis = useCallback(async (): Promise<void> => {
    if (productId === null || reportId === "") {
      setError("먼저 1공정 보고서를 선택해 주세요.");
      return;
    }

    setIsExecuting(true);
    setPipelineStep(0);
    clearProgressTimers();
    progressTimersRef.current = [
      window.setTimeout(() => {
        setPipelineStep(1);
      }, PIPELINE_STEP_DELAYS_MS[0]),
      window.setTimeout(() => {
        setPipelineStep(2);
      }, PIPELINE_STEP_DELAYS_MS[1]),
      window.setTimeout(() => {
        setPipelineStep(3);
      }, PIPELINE_STEP_DELAYS_MS[2]),
    ];

    setLoading(true);
    setError(null);
    setFetchMessage(null);

    try {
      const { partners: list, error: fetchErr } = await fetchPartnersForProduct(productId);
      if (fetchErr !== null) {
        throw new Error(fetchErr);
      }
      setPartners(list);
      setPipelineStep(4);
      const n = list.length;
      setFetchMessage(
        n === 0
          ? "표시할 파트너 데이터가 없습니다. partners-data 설정을 확인해 주세요."
          : `파트너 ${String(n)}건을 불러왔습니다. 체크박스 가중치 변경은 ${String(DEBOUNCE_MS)}ms 후 반영됩니다.`,
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "알 수 없는 오류";
      setError(message);
      setPipelineStep(0);
    } finally {
      clearProgressTimers();
      setLoading(false);
      setIsExecuting(false);
    }
  }, [productId, reportId]);

  function toggleCriterion(key: PSICriterionKey): void {
    setChecked((prev) => {
      const next: PSICheckedState = { ...prev, [key]: !prev[key] };
      const activeCount = (Object.keys(next) as PSICriterionKey[]).filter((k) => next[k]).length;
      if (activeCount === 0) {
        window.alert("평가 기준은 최소 1개 이상 선택해야 합니다.");
        return prev;
      }
      return next;
    });
  }

  function resetDefaults(): void {
    setChecked({ ...DEFAULT_CHECKED });
  }

  const handleDownloadPhase3Pdf = useCallback(async (): Promise<void> => {
    if (productId === null) {
      window.alert("1공정 보고서를 선택한 뒤 다시 시도해 주세요.");
      return;
    }
    setPdfLoading(true);
    try {
      const res = await fetch("/api/panama/phase3/report/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      if (!res.ok) {
        const errJson = (await res.json()) as { error?: string };
        throw new Error(errJson.error ?? `HTTP ${String(res.status)}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `phase3_partner_report_${productId.slice(0, 8)}_${String(Date.now())}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "PDF 다운로드에 실패했습니다.";
      window.alert(message);
    } finally {
      setPdfLoading(false);
    }
  }, [productId]);

  return (
    <section className="rounded-[16px] border border-[#e3e9f2] bg-white shadow-sh2">
      <button
        type="button"
        onClick={() => {
          setExpanded((prev) => !prev);
        }}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#1E3A5F] text-[11px] font-black text-white">
            03
          </span>
          <div>
            <h3 className="text-[16px] font-extrabold text-[#1f3e64]">3공정 · 파트너 매칭 (PSI)</h3>
            <p className="text-[11px] text-[#7a8ba1]">동적 PSI · 가중치 재분배 · Top 20 계층 · 상세 모달</p>
          </div>
        </div>
        <span className="text-[14px] text-[#516882]">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded ? (
        <div className="space-y-3 border-t border-[#edf1f6] px-4 pb-4 pt-3">
          <div>
            <p className="mb-1 text-[10.5px] font-semibold text-[#667b95]">1공정 보고서 · 실행</p>
            <div className="mb-2 space-y-2">
              {phase1Complete && !phase2Complete ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
                  <div className="mb-1 font-medium text-amber-900">
                    ✅ 1공정 완료. 지금 파트너 매칭을 실행할 수 있습니다.
                  </div>
                  <div className="text-xs text-amber-700">
                    💡 2공정(FOB가격 역산)까지 완료하면 파트너와 전략적인 가격협의를 할 수 있습니다.
                  </div>
                </div>
              ) : null}
              {phase1Complete && phase2Complete ? (
                <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm">
                  <div className="font-medium text-green-900">
                    ✅ 1·2공정 완료. 전체 맥락이 반영된 파트너 매칭을 실행합니다.
                  </div>
                </div>
              ) : null}
              {!phase1Complete ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                  <div className="text-slate-700">
                    📋 1공정 보고서와 품목을 선택하면 파트너 매칭을 실행할 수 있습니다.
                  </div>
                </div>
              ) : null}
            </div>
            <Phase3ReportToolbar
              reports={reports}
              reportId={reportId}
              onReportChange={handleReportChange}
              loading={loading}
              productId={productId}
              onRun={() => {
                void runAnalysis();
              }}
            />
          </div>

          <Phase3WeightPanel checked={checked} onToggle={toggleCriterion} onResetDefaults={resetDefaults} />

          {isExecuting ? <Phase3WorkflowStepper currentStep={pipelineStep} /> : null}

          {error !== null ? <Phase3ErrorBanner message={error} /> : null}

          {fetchMessage !== null ? (
            <div className="rounded-[10px] border border-[#dbe3ef] bg-[#f4f7fc] p-3 text-[11px] text-[#3e5574]">
              {fetchMessage}
            </div>
          ) : null}

          {ranked.length > 0 ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void handleDownloadPhase3Pdf();
                  }}
                  disabled={pdfLoading || productId === null}
                  className="rounded-[10px] border border-[#c7d7ea] bg-[#f4f7fc] px-3 py-2 text-[11px] font-extrabold text-[#1E3A5F] hover:bg-[#e8eef8] disabled:opacity-50"
                >
                  {pdfLoading ? "PDF 생성 중…" : "📄 파트너 매칭 보고서 PDF"}
                </button>
              </div>
              <SelectedProductBanner productSlug={selectedProductSlug} />
              <LayoutGroup id="phase3-partner-morph">
                <Phase3Top10Grid partners={top10} onCardClick={openPartnerById} />
                <Phase3RankList partners={rest} onRowClick={openPartnerById} />
              </LayoutGroup>
            </div>
          ) : null}
        </div>
      ) : null}

      <Phase3DetailModal
        partner={modalPartner?.partner_meta ?? null}
        selectedProductSlug={selectedProductSlug}
        onClose={() => {
          setModalPartner(null);
        }}
      />
    </section>
  );
}
