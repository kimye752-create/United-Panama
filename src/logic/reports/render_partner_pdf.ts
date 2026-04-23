import type { DocumentProps } from "@react-pdf/renderer";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";

import {
  P3PartnerDocument,
  type P3PartnerDocumentProps,
} from "@/components/reports/P3PartnerDocument";

/**
 * 바이어 발굴 보고서 PDF 버퍼 생성
 */
export async function renderPartnerPDF(
  props: P3PartnerDocumentProps,
): Promise<Buffer> {
  const el = React.createElement(P3PartnerDocument, props);
  const buf = await renderToBuffer(el as React.ReactElement<DocumentProps>);
  return Buffer.from(buf);
}
