"use client";

import { useEffect, useMemo, useState } from "react";

import { Card } from "../shared/Card";
import {
  loadStoredReports,
  saveStoredReports,
  type StoredReportItem,
} from "@/src/lib/dashboard/reports_store";
import { findProductById } from "@/src/utils/product-dictionary";

function caseBadgeClass(caseGrade: StoredReportItem["caseGrade"]): string {
  if (caseGrade === "A") {
    return "bg-emerald-100 text-emerald-700";
  }
  if (caseGrade === "B") {
    return "bg-amber-100 text-amber-700";
  }
  return "bg-blue-100 text-blue-700";
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString("ko-KR");
}

export function GeneratedReportsList() {
  const [items, setItems] = useState<StoredReportItem[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFilename, setPreviewFilename] = useState<string>("panama_report.pdf");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => {
      setItems(loadStoredReports());
    };
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  useEffect(() => {
    const bootstrapFromDbCache = async () => {
      const local = loadStoredReports();
      if (local.length > 0) {
        return;
      }
      try {
        const response = await fetch("/api/panama/phase2/report");
        if (!response.ok) {
          return;
        }
        const payload = (await response.json()) as unknown;
        if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
          return;
        }
        const reportsRaw = (payload as { reports?: unknown }).reports;
        if (!Array.isArray(reportsRaw) || reportsRaw.length === 0) {
          return;
        }
        const recovered: StoredReportItem[] = [];
        for (const row of reportsRaw) {
          if (typeof row !== "object" || row === null || Array.isArray(row)) {
            continue;
          }
          const r = row as Record<string, unknown>;
          if (
            typeof r.id !== "string" ||
            typeof r.product_id !== "string" ||
            typeof r.case_grade !== "string" ||
            typeof r.generated_at !== "string"
          ) {
            continue;
          }
          const product = findProductById(r.product_id);
          if (product === undefined) {
            continue;
          }
          const caseGrade =
            r.case_grade === "A" || r.case_grade === "B" || r.case_grade === "C"
              ? r.case_grade
              : "B";
          recovered.push({
            id: r.id,
            productId: r.product_id,
            brand: product.kr_brand_name,
            inn: product.who_inn_en,
            caseGrade,
            generatedAt: r.generated_at,
          });
        }
        if (recovered.length > 0) {
          saveStoredReports(recovered);
          setItems(recovered);
        }
      } catch {
        return;
      }
    };
    void bootstrapFromDbCache();
  }, []);

  useEffect(() => {
    if (items.length === 0) {
      setSelectedReportId(null);
      setPreviewUrl((oldUrl) => {
        if (oldUrl !== null) {
          URL.revokeObjectURL(oldUrl);
        }
        return null;
      });
      return;
    }
    setSelectedReportId((prev) => prev ?? items[0].id);
  }, [items]);

  useEffect(() => {
    return () => {
      setPreviewUrl((oldUrl) => {
        if (oldUrl !== null) {
          URL.revokeObjectURL(oldUrl);
        }
        return null;
      });
    };
  }, []);

  const selectedReport = useMemo(
    () => items.find((item) => item.id === selectedReportId) ?? null,
    [items, selectedReportId],
  );

  const fetchPdfBlob = async (productId: string): Promise<{ blob: Blob; filename: string }> => {
    const response = await fetch("/api/panama/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    });
    if (!response.ok) {
      throw new Error(`PDF 생성 실패: HTTP ${String(response.status)}`);
    }
    const disposition = response.headers.get("Content-Disposition");
    let filename = "panama_report.pdf";
    if (disposition !== null) {
      const matched = disposition.match(/filename="([^"]+)"/);
      if (matched?.[1] !== undefined) {
        filename = matched[1];
      }
    }
    const blob = await response.blob();
    return { blob, filename };
  };

  const loadPreview = async (item: StoredReportItem): Promise<void> => {
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const { blob, filename } = await fetchPdfBlob(item.productId);
      const objectUrl = URL.createObjectURL(blob);
      setPreviewFilename(filename);
      setPreviewUrl((oldUrl) => {
        if (oldUrl !== null) {
          URL.revokeObjectURL(oldUrl);
        }
        return objectUrl;
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      setPreviewError(message);
      setPreviewUrl((oldUrl) => {
        if (oldUrl !== null) {
          URL.revokeObjectURL(oldUrl);
        }
        return null;
      });
    } finally {
      setPreviewLoading(false);
    }
  };

  useEffect(() => {
    if (selectedReport === null) {
      return;
    }
    void loadPreview(selectedReport);
    // selectedReport 변경 시에만 새 PDF를 불러온다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedReport?.id]);

  const clearAll = () => {
    setItems([]);
    saveStoredReports([]);
    setSelectedReportId(null);
    setPreviewError(null);
    setPreviewLoading(false);
  };

  const removeOne = (id: string) => {
    const next = items.filter((item) => item.id !== id);
    setItems(next);
    saveStoredReports(next);
    setSelectedReportId((prev) => {
      if (prev !== id) {
        return prev;
      }
      return next[0]?.id ?? null;
    });
  };

  const downloadPdf = async (item: StoredReportItem): Promise<void> => {
    setDownloadingId(item.id);
    try {
      const { blob, filename } = await fetchPdfBlob(item.productId);
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(objectUrl);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      window.alert(
        `PDF 다운로드 실패: ${message}\n해결 방법: 잠시 후 다시 시도하거나 네트워크 상태를 확인해 주세요.`,
      );
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <Card
      title="생성된 보고서"
      subtitle="1공정 분석 완료 시 자동 등록 · PDF 다운로드 · 하단 A4 미리보기"
      rightSlot={
        <button
          type="button"
          onClick={clearAll}
          className="rounded-[10px] border border-[#d7dfeb] bg-white px-3 py-1.5 text-[11px] font-bold text-[#59708d] hover:bg-[#f3f6fb]"
        >
          모두 지우기
        </button>
      }
    >
      {items.length === 0 ? (
        <div className="py-8 text-center text-[13px] leading-relaxed text-muted">
          아직 생성된 보고서가 없습니다.
          <br />
          1공정 분석을 실행하면 여기에 자동으로 등록됩니다.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <article
              key={item.id}
              className={`rounded-[13px] border bg-white p-3 ${
                selectedReportId === item.id ? "border-[#9fb6d8]" : "border-[#e2e8f1]"
              }`}
            >
              <p className="text-[13px] font-extrabold text-[#1f3e64]">1공정 보고서 - {item.brand}</p>
              <p className="mt-1 text-[11px] text-[#6f8299]">
                {item.inn} · {formatDate(item.generatedAt)}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${caseBadgeClass(item.caseGrade)}`}>
                  {item.caseGrade === "A" ? "가능" : item.caseGrade === "B" ? "조건부" : "검토"}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    void downloadPdf(item);
                  }}
                  disabled={downloadingId === item.id}
                  className="rounded-[8px] border border-[#d7dfeb] bg-[#f6f9fc] px-2.5 py-1 text-[10px] font-bold text-[#59708d]"
                >
                  {downloadingId === item.id ? "다운로드 중..." : "↓ PDF"}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedReportId(item.id)}
                  className={`rounded-[8px] border px-2.5 py-1 text-[10px] font-bold ${
                    selectedReportId === item.id
                      ? "border-[#93abd0] bg-[#eef4ff] text-[#355985]"
                      : "border-[#d7dfeb] bg-white text-[#59708d] hover:bg-[#f6f9fc]"
                  }`}
                >
                  보고서 보기
                </button>
                <button
                  type="button"
                  onClick={() => removeOne(item.id)}
                  className="rounded-[8px] border border-[#d7dfeb] bg-white px-2.5 py-1 text-[10px] font-bold text-[#788ba4] hover:bg-[#f6f9fc]"
                >
                  ✕
                </button>
              </div>
            </article>
          ))}

          {selectedReport !== null ? (
            <section className="rounded-[13px] border border-[#d9e3f1] bg-[#f9fbff] p-3">
              <p className="text-[12px] font-bold text-[#1f3e64]">
                A4 미리보기 · {selectedReport.brand}
              </p>
              <p className="mt-0.5 text-[10.5px] text-[#6f8299]">
                파일명: {previewFilename}
              </p>
              <div className="mt-2 rounded-[10px] border border-[#d9e3f1] bg-white p-1.5">
                {previewLoading ? (
                  <p className="p-6 text-center text-[12px] text-[#6f8299]">PDF 생성 중...</p>
                ) : previewError !== null ? (
                  <p className="p-6 text-center text-[12px] text-red-600">{previewError}</p>
                ) : previewUrl !== null ? (
                  <iframe
                    title={`report-preview-${selectedReport.id}`}
                    src={previewUrl}
                    className="h-[680px] w-full rounded-[8px]"
                  />
                ) : (
                  <p className="p-6 text-center text-[12px] text-[#6f8299]">
                    미리보기를 불러오지 못했습니다.
                  </p>
                )}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </Card>
  );
}
