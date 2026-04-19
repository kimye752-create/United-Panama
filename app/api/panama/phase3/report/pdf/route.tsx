import { NextResponse } from "next/server";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";

import "@/lib/pdf/pdf-fonts";

import { Phase3ReportDocument } from "@/src/lib/phase3/report/Phase3ReportDocument";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Body {
  productId?: string;
}

/**
 * 3공정 파트너 매칭 PDF (@react-pdf/renderer, Node 전용)
 */
export async function POST(req: Request): Promise<Response> {
  try {
    const body = (await req.json()) as Body;
    const productId = typeof body.productId === "string" ? body.productId.trim() : "";
    if (productId === "") {
      return NextResponse.json({ error: "productId가 필요합니다." }, { status: 400 });
    }

    const pdfBuffer = await renderToBuffer(
      <Phase3ReportDocument productIdUuid={productId} generatedAt={new Date()} />,
    );

    const filename = `phase3_partner_report_${productId.slice(0, 8)}_${String(Date.now())}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "PDF 생성 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
