"use client";

import { useEffect, useMemo, useState } from "react";

interface PdfReportViewerProps {
  productId: string;
}

export function PdfReportViewer({ productId }: PdfReportViewerProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [filename, setFilename] = useState<string>("panama_report.pdf");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPdf = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/panama/pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId }),
        });
        if (!response.ok) {
          throw new Error(`PDF 생성 실패: HTTP ${String(response.status)}`);
        }
        const disposition = response.headers.get("Content-Disposition");
        if (disposition !== null) {
          const matched = disposition.match(/filename="([^"]+)"/);
          if (matched?.[1] !== undefined) {
            setFilename(matched[1]);
          }
        }
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        setPdfUrl((oldUrl) => {
          if (oldUrl !== null) {
            URL.revokeObjectURL(oldUrl);
          }
          return objectUrl;
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        setPdfUrl(null);
      } finally {
        setLoading(false);
      }
    };
    void loadPdf();
    return () => {
      setPdfUrl((oldUrl) => {
        if (oldUrl !== null) {
          URL.revokeObjectURL(oldUrl);
        }
        return null;
      });
    };
  }, [productId]);

  const downloadHref = useMemo(() => pdfUrl ?? "#", [pdfUrl]);

  return (
    <section className="rounded-[12px] border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[13px] font-semibold text-slate-700">● PDF 보고서</p>
      <div className="mt-3 flex items-center gap-3">
        <a
          href={downloadHref}
          download={filename}
          className={`inline-flex h-[38px] items-center rounded-[10px] border border-slate-300 px-4 text-[13px] font-bold text-slate-700 ${
            pdfUrl === null ? "pointer-events-none opacity-50" : ""
          }`}
        >
          ↓ PDF 보고서 다운로드
        </a>
        <span className="text-[12px] text-slate-500">{filename}</span>
      </div>
      <div className="mt-3 rounded-[10px] border border-slate-300 bg-[#f8f9fb] p-2">
        {loading ? (
          <p className="p-6 text-center text-[12px] text-slate-500">PDF 생성 중...</p>
        ) : error !== null ? (
          <p className="p-6 text-center text-[12px] text-red-600">{error}</p>
        ) : pdfUrl !== null ? (
          <iframe
            title="panama-pdf-viewer"
            src={pdfUrl}
            className="h-[620px] w-full rounded-[8px] bg-white"
          />
        ) : (
          <p className="p-6 text-center text-[12px] text-slate-500">PDF를 불러오지 못했습니다.</p>
        )}
      </div>
    </section>
  );
}
