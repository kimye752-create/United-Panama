import type { DocumentProps } from "@react-pdf/renderer";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";

import {
  P2PricingDocument,
  type P2PricingDocumentProps,
} from "@/components/reports/P2PricingDocument";

/**
 * 가격전략 보고서 PDF 버퍼 생성
 */
export async function renderPricingPDF(
  props: P2PricingDocumentProps,
): Promise<Buffer> {
  const el = React.createElement(P2PricingDocument, props);
  const buf = await renderToBuffer(el as React.ReactElement<DocumentProps>);
  return Buffer.from(buf);
}
