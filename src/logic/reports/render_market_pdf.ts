import type { DocumentProps } from "@react-pdf/renderer";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";

import {
  P1MarketDocument,
  type P1MarketDocumentProps,
} from "@/components/reports/P1MarketDocument";

/**
 * 시장조사 보고서 PDF 버퍼 생성
 */
export async function renderMarketPDF(
  props: P1MarketDocumentProps,
): Promise<Buffer> {
  const el = React.createElement(P1MarketDocument, props);
  const buf = await renderToBuffer(el as React.ReactElement<DocumentProps>);
  return Buffer.from(buf);
}
