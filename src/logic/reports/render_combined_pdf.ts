import type { DocumentProps } from "@react-pdf/renderer";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";

import { CombinedReportDocument } from "@/components/reports/CombinedReportDocument";
import type { CombinedReportDocumentProps } from "@/components/reports/CombinedReportDocument";

/**
 * 결합 PDF 버퍼 생성 — 로직 레이어에서 React.createElement로 TSX 의존 최소화
 */
export async function renderCombinedPDF(
  props: CombinedReportDocumentProps,
): Promise<Buffer> {
  const el = React.createElement(CombinedReportDocument, props);
  const buf = await renderToBuffer(
    el as React.ReactElement<DocumentProps>,
  );
  return Buffer.from(buf);
}
