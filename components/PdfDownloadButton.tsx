/**
 * Report1 PDF 다운로드 — Phase 2 예정 (현재 비활성)
 */
"use client";

import type { Report1PdfProps } from "@/lib/pdf/Report1Document";

export type PdfDownloadClientPayload = Omit<
  Report1PdfProps,
  "llmPayload" | "collectedAt"
> & {
  productId: string;
  emlWho: boolean;
  emlPaho: boolean;
  prevalenceMetric: string;
  distributorNames: string[];
  panamacompraCount: number;
  rawDataDigest: string;
};

type Props = {
  payload: PdfDownloadClientPayload;
};

export function PdfDownloadButton({ payload: _payload }: Props) {
  // async function handleDownload(): Promise<void> {
  //   setLoading(true);
  //   try {
  //     const res = await fetch("/api/panama/pdf", {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({
  //         productId: payload.productId,
  //         caseGrade: payload.caseGrade,
  //         caseVerdict: payload.caseVerdict,
  //         confidence: payload.confidence,
  //         emlWho: payload.emlWho,
  //         emlPaho: payload.emlPaho,
  //         prevalenceMetric: payload.prevalenceMetric,
  //         distributorNames: payload.distributorNames,
  //         panamacompraCount: payload.panamacompraCount,
  //         rawDataDigest: payload.rawDataDigest,
  //         sourceRows: payload.sourceRows,
  //         dosageForm: payload.dosageForm,
  //         hsCode: payload.hsCode,
  //       }),
  //     });
  //     if (!res.ok) {
  //       window.alert("PDF 생성 실패");
  //       return;
  //     }
  //     const blob = await res.blob();
  //     const url = URL.createObjectURL(blob);
  //     const a = document.createElement("a");
  //     a.href = url;
  //     const safe = payload.brandName.replace(/[^\w\-가-힣]+/g, "_").slice(0, 40);
  //     a.download = `UPharma_Panama_Report_${safe}.pdf`;
  //     document.body.appendChild(a);
  //     a.click();
  //     document.body.removeChild(a);
  //     URL.revokeObjectURL(url);
  //   } finally {
  //     setLoading(false);
  //   }
  // }

  return (
    <button
      type="button"
      onClick={() => {
        return;
      }}
      disabled
      className="cursor-not-allowed rounded bg-slate-800 px-4 py-2 text-sm font-medium text-white opacity-50"
      aria-disabled="true"
    >
      PDF 다운로드 (Phase 2)
    </button>
  );
}
