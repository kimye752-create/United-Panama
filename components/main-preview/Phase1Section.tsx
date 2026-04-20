"use client";

import { useEffect, useMemo, useState } from "react";

import { upsertStoredReport } from "@/src/lib/dashboard/reports_store";
import { formatProductOptionLabel } from "@/src/utils/product_option_labels";
import { TARGET_PRODUCTS } from "@/src/utils/product-dictionary";

interface Phase1SectionProps {
  onCompleted: () => void;
  /** 1공정 보고서가 세션에 저장된 직후(Phase2 드롭다운 갱신용) */
  onReportGenerated?: () => void;
}

const STEP_LABELS = ["DB 조회", "Claude 분석", "논문 검색", "PDF 생성"] as const;
const STEP_STORAGE_KEY = "pa_phase1_step_v1";
const READY_PRODUCT_KEY = "pa_phase1_ready_product_v1";
const PDF_BASE64_KEY = "pa_phase1_pdf_base64_v1";
const PDF_FILENAME_KEY = "pa_phase1_pdf_filename_v1";

type EntryFeasibilityGrade =
  | "A_immediate"
  | "B_short_term"
  | "C_mid_term"
  | "D_long_term"
  | "F_blocked"
  | "unknown";

const GRADE_DISPLAY_MAP: Record<EntryFeasibilityGrade, string> = {
  A_immediate: "즉시 진입 가능",
  B_short_term: "단기 진입 가능",
  C_mid_term: "중기 진입 (WLA 트랙)",
  D_long_term: "장기 진입 (시장 교육 필요)",
  F_blocked: "진출 불가",
  unknown: "판정 보류",
};

function parseEntryGrade(payload: Record<string, unknown>): EntryFeasibilityGrade {
  const entry = payload["entryFeasibility"];
  if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
    return "unknown";
  }
  const grade = (entry as { grade?: unknown }).grade;
  if (
    grade === "A_immediate" ||
    grade === "B_short_term" ||
    grade === "C_mid_term" ||
    grade === "D_long_term" ||
    grade === "F_blocked" ||
    grade === "unknown"
  ) {
    return grade;
  }
  return "unknown";
}

function buildPhase1ToastMessage(productName: string, grade: EntryFeasibilityGrade): string {
  const gradeLabel = GRADE_DISPLAY_MAP[grade];
  return `✅ ${productName} 분석 완료 — 판정: ${gradeLabel}. 상세 결과는 보고서 탭에서 확인하세요.`;
}

export function Phase1Section({ onCompleted, onReportGenerated }: Phase1SectionProps) {
  const [expanded, setExpanded] = useState(true);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<number>(() => {
    if (typeof window === "undefined") {
      return 0;
    }
    const stored = window.sessionStorage.getItem(STEP_STORAGE_KEY);
    if (stored === null) {
      return 0;
    }
    const parsed = Number.parseInt(stored, 10);
    if (!Number.isFinite(parsed)) {
      return 0;
    }
    return parsed;
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [readyProductId, setReadyProductId] = useState<string | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }
    return window.sessionStorage.getItem(READY_PRODUCT_KEY);
  });
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfFilename, setPdfFilename] = useState<string | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }
    return window.sessionStorage.getItem(PDF_FILENAME_KEY);
  });
  const [productId, setProductId] = useState(TARGET_PRODUCTS[0]?.product_id ?? "");
  const [tradeName, setTradeName] = useState("");
  const [inn, setInn] = useState("");
  const [dosage, setDosage] = useState("");

  const selectedProduct = useMemo(
    () => TARGET_PRODUCTS.find((product) => product.product_id === productId) ?? null,
    [productId],
  );

  useEffect(() => {
    return () => {
      if (pdfBlobUrl !== null) {
        URL.revokeObjectURL(pdfBlobUrl);
      }
    };
  }, [pdfBlobUrl]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.sessionStorage.setItem(STEP_STORAGE_KEY, String(step));
  }, [step]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (readyProductId === null) {
      window.sessionStorage.removeItem(READY_PRODUCT_KEY);
      return;
    }
    window.sessionStorage.setItem(READY_PRODUCT_KEY, readyProductId);
  }, [readyProductId]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const storedBase64 = window.sessionStorage.getItem(PDF_BASE64_KEY);
    const storedFilename = window.sessionStorage.getItem(PDF_FILENAME_KEY);
    if (storedBase64 === null || storedFilename === null) {
      return;
    }
    try {
      const bytes = Uint8Array.from(window.atob(storedBase64), (char) =>
        char.charCodeAt(0),
      );
      const blob = new Blob([bytes], { type: "application/pdf" });
      const nextBlobUrl = URL.createObjectURL(blob);
      setPdfBlobUrl((prev) => {
        if (prev !== null) {
          URL.revokeObjectURL(prev);
        }
        return nextBlobUrl;
      });
      setPdfFilename(storedFilename);
    } catch {
      window.sessionStorage.removeItem(PDF_BASE64_KEY);
      window.sessionStorage.removeItem(PDF_FILENAME_KEY);
    }
  }, []);

  const runAnalyze = async () => {
    if (selectedProduct === null) {
      return;
    }
    setLoading(true);
    setToastMessage(null);
    setReadyProductId(null);
    setPdfFilename(null);
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(PDF_BASE64_KEY);
      window.sessionStorage.removeItem(PDF_FILENAME_KEY);
    }
    setPdfBlobUrl((prev) => {
      if (prev !== null) {
        URL.revokeObjectURL(prev);
      }
      return null;
    });
    setStep(1);
    // 약 60~70초 분석을 4단계로 나누어 단계당 약 15초씩 표시 (실제 API보다 빨리 끝나면 setStep(5)로 즉시 완료)
    const progressTimer = window.setInterval(() => {
      setStep((prev) => (prev < 4 ? prev + 1 : prev));
    }, 15000);
    try {
      const response = await fetch("/api/panama/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: selectedProduct.product_id }),
      });
      const payload = (await response.json()) as unknown;
      if (!response.ok || payload === null || typeof payload !== "object") {
        throw new Error("분석 API 응답 오류");
      }
      const result = payload as Record<string, unknown>;
      const judgment = result.judgment;
      const caseGrade =
        judgment !== null &&
        typeof judgment === "object" &&
        typeof (judgment as { case?: unknown }).case === "string"
          ? (judgment as { case: "A" | "B" | "C" }).case
          : "B";
      const pdfBase64 = result.pdfBase64;
      const nextPdfFilename = result.pdfFilename;
      const reportVersion =
        result.reportVersion === "v3" || result.reportVersion === "v1"
          ? result.reportVersion
          : "v1";
      const pdfBase64ForStore =
        typeof pdfBase64 === "string" && pdfBase64.trim() !== "" ? pdfBase64 : null;
      const pdfFilenameForStore =
        typeof nextPdfFilename === "string" && nextPdfFilename.trim() !== ""
          ? nextPdfFilename
          : null;
      upsertStoredReport({
        productId: selectedProduct.product_id,
        brand: selectedProduct.kr_brand_name,
        productBrandName: selectedProduct.kr_brand_name,
        inn: selectedProduct.who_inn_en,
        caseGrade,
        analyzedAt: new Date().toISOString(),
        pdfBase64: pdfBase64ForStore,
        pdfFilename: pdfFilenameForStore,
        reportVersion,
      });
      onReportGenerated?.();
      if (
        typeof pdfBase64 === "string" &&
        pdfBase64.trim() !== "" &&
        typeof nextPdfFilename === "string" &&
        nextPdfFilename.trim() !== ""
      ) {
        try {
          const binary = window.atob(pdfBase64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i += 1) {
            bytes[i] = binary.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: "application/pdf" });
          const nextBlobUrl = URL.createObjectURL(blob);
          setPdfBlobUrl((prev) => {
            if (prev !== null) {
              URL.revokeObjectURL(prev);
            }
            return nextBlobUrl;
          });
          setPdfFilename(nextPdfFilename);
          window.sessionStorage.setItem(PDF_BASE64_KEY, pdfBase64);
          window.sessionStorage.setItem(PDF_FILENAME_KEY, nextPdfFilename);
        } catch (error: unknown) {
          setPdfBlobUrl((prev) => {
            if (prev !== null) {
              URL.revokeObjectURL(prev);
            }
            return null;
          });
          setPdfFilename(null);
          if (typeof window !== "undefined") {
            window.sessionStorage.removeItem(PDF_BASE64_KEY);
            window.sessionStorage.removeItem(PDF_FILENAME_KEY);
          }
          window.alert(
            `PDF 변환 실패 원인: ${
              error instanceof Error ? error.message : "알 수 없는 오류"
            }\n해결 방법: 1단계 시장조사 분석을 다시 실행해 PDF를 재생성해 주세요.`,
          );
        }
      } else {
        setPdfBlobUrl((prev) => {
          if (prev !== null) {
            URL.revokeObjectURL(prev);
          }
          return null;
        });
        setPdfFilename(null);
        if (typeof window !== "undefined") {
          window.sessionStorage.removeItem(PDF_BASE64_KEY);
          window.sessionStorage.removeItem(PDF_FILENAME_KEY);
        }
      }
      setReadyProductId(selectedProduct.product_id);
      setStep(5);
      setToastMessage(
        buildPhase1ToastMessage(selectedProduct.kr_brand_name, parseEntryGrade(result)),
      );
      onCompleted();
    } catch (error: unknown) {
      window.alert(
        `1단계 시장조사 분석 실패: ${
          error instanceof Error ? error.message : "알 수 없는 오류"
        }\n해결 방법: 네트워크 연결과 서버 상태를 확인한 뒤 다시 시도해 주세요.`,
      );
    } finally {
      window.clearInterval(progressTimer);
      setLoading(false);
    }
  };

  const runPdfDownload = () => {
    if (readyProductId === null || pdfBlobUrl === null || pdfFilename === null) {
      return;
    }
    const anchor = document.createElement("a");
    anchor.href = pdfBlobUrl;
    anchor.download = pdfFilename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  return (
    <section className="rounded-[16px] border border-[#e3e9f2] bg-white shadow-sh2">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#1E3A5F] text-[13px] font-black text-white">
            1
          </span>
          <div>
            <h3 className="text-[16px] font-extrabold text-[#1f3e64]">1단계 · 시장조사</h3>
            <p className="text-[11px] text-[#7a8ba1]">제품 분석 · Claude AI · PDF 보고서 자동 생성</p>
          </div>
        </div>
        <span className="text-[14px] text-[#516882]">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded ? (
        <div className="space-y-3 border-t border-[#edf1f6] px-4 pb-4 pt-3">
          <div>
            <p className="mb-1 text-[10.5px] font-semibold text-[#667b95]">품목 선택</p>
            <div className="grid gap-2 md:grid-cols-[1fr_auto]">
              <select
                value={productId}
                onChange={(event) => setProductId(event.target.value)}
                className="h-[40px] rounded-[10px] border border-[#dce4f0] bg-[#edf2f9] px-3 text-[12px] font-semibold tracking-[-0.015em] text-[#273f60] outline-none focus:ring-2 focus:ring-[#1E3A5F]/20"
              >
                {TARGET_PRODUCTS.map((product) => (
                  <option key={product.product_id} value={product.product_id}>
                    {formatProductOptionLabel(product)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  void runAnalyze();
                }}
                disabled={loading}
                className="h-[40px] rounded-[10px] bg-[#1E4E8C] px-5 text-[12px] font-extrabold text-white hover:bg-[#1a4378] disabled:opacity-60"
              >
                ▶ 분석 실행
              </button>
            </div>
          </div>
          <div>
            <p className="mb-1 text-[10.5px] font-semibold text-[#667b95]">신약 직접 분석</p>
            <div className="grid gap-2 md:grid-cols-[1fr_1fr_1fr_auto]">
              <input
                value={tradeName}
                onChange={(event) => setTradeName(event.target.value)}
                placeholder="약품명 (예: Nexavar)"
                className="h-[40px] rounded-[10px] border border-[#dce4f0] bg-[#f7f9fc] px-3 text-[12px] text-[#2b4568] outline-none focus:ring-2 focus:ring-[#1E3A5F]/20"
              />
              <input
                value={inn}
                onChange={(event) => setInn(event.target.value)}
                placeholder="성분명 (예: sorafenib)"
                className="h-[40px] rounded-[10px] border border-[#dce4f0] bg-[#f7f9fc] px-3 text-[12px] text-[#2b4568] outline-none focus:ring-2 focus:ring-[#1E3A5F]/20"
              />
              <input
                value={dosage}
                onChange={(event) => setDosage(event.target.value)}
                placeholder="제형 (예: 200mg tablet)"
                className="h-[40px] rounded-[10px] border border-[#dce4f0] bg-[#f7f9fc] px-3 text-[12px] text-[#2b4568] outline-none focus:ring-2 focus:ring-[#1E3A5F]/20"
              />
              <button
                type="button"
                onClick={() => {
                  window.alert("신약 분석은 다음 단계에서 백엔드 연동 예정입니다.");
                }}
                className="h-[40px] rounded-[10px] bg-[#1E4E8C] px-5 text-[12px] font-extrabold text-white hover:bg-[#1a4378]"
              >
                ▶ 신약 분석
              </button>
            </div>
          </div>
          <div className="pt-1">
            <div className="grid grid-cols-4 gap-2">
              {STEP_LABELS.map((label, index) => {
                const current = index + 1;
                const done = step > current;
                const active = step === current && loading;
                return (
                  <div key={label} className="text-center">
                    <div
                      className={`mx-auto mb-1 flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
                        done
                          ? "bg-[#dff2ea] text-[#2a9a71]"
                          : active
                            ? "bg-[#dbe6f8] text-[#1f3e64]"
                            : "bg-[#eef2f8] text-[#8ea0b7]"
                      }`}
                    >
                      {done ? "✓" : current}
                    </div>
                    <p className="text-[10px] text-[#6c809a]">{label}</p>
                  </div>
                );
              })}
            </div>
            <div className="mt-2 h-[2px] w-full rounded-full bg-[#dfe7f2]">
              <div
                className="h-full rounded-full bg-[#69b89d] transition-all duration-300"
                style={{ width: `${(Math.min(Math.max(step, 0), 4) / 4) * 100}%` }}
              />
            </div>
          </div>
          {toastMessage !== null ? (
            <p className="rounded-[10px] border border-[#d2e8dc] bg-[#edf8f1] px-3 py-2 text-[11px] text-[#2f6e54]">
              {toastMessage}
            </p>
          ) : null}
          <div className="rounded-[10px] border border-[#edf1f6] bg-[#fbfcff] px-3 py-2">
            <p className="mb-2 text-[11px] font-semibold text-[#546b86]">• PDF 보고서</p>
            <button
              type="button"
              disabled={readyProductId === null || pdfBlobUrl === null || loading}
              onClick={() => {
                runPdfDownload();
              }}
              className="inline-flex h-[36px] items-center justify-center rounded-[9px] border border-[#e2e7f0] bg-[#f4f7fb] px-4 text-[12px] font-bold text-[#3e5574] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pdfBlobUrl === null ? "분석 후 다운로드 가능" : "📄 PDF 보고서 다운로드"}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

