import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { findProductById } from "@/src/utils/product-dictionary";
import { renderMarketPDF } from "@/src/logic/reports/render_market_pdf";
import { renderPricingPDF } from "@/src/logic/reports/render_pricing_pdf";
import { renderPartnerPDF } from "@/src/logic/reports/render_partner_pdf";
import { renderCombinedPDF } from "@/src/logic/reports/render_combined_pdf";
import type { ReportType } from "@/src/types/report_session";
import type { Report } from "@/src/types/report_session";

export const runtime = "nodejs";

function isReportType(t: string): t is ReportType {
  return (
    t === "market" ||
    t === "pricing_public" ||
    t === "pricing_private" ||
    t === "partner" ||
    t === "combined"
  );
}

async function fetchReportRow(
  supabase: ReturnType<typeof createSupabaseServer>,
  reportId: string,
): Promise<Report> {
  const { data, error } = await supabase
    .from("panama_reports")
    .select("*")
    .eq("id", reportId)
    .single();

  if (error !== null || data === null) {
    throw new Error(
      error !== null ? `보고서 조회 실패: ${error.message}` : "보고서를 찾을 수 없습니다.",
    );
  }

  const row = data as Record<string, unknown>;
  return {
    id: String(row["id"]),
    session_id: String(row["session_id"]),
    type: row["type"] as Report["type"],
    pdf_storage_path:
      row["pdf_storage_path"] === null || row["pdf_storage_path"] === undefined
        ? null
        : String(row["pdf_storage_path"]),
    report_data:
      row["report_data"] !== null &&
      row["report_data"] !== undefined &&
      typeof row["report_data"] === "object" &&
      !Array.isArray(row["report_data"])
        ? (row["report_data"] as Record<string, unknown>)
        : null,
    metadata:
      row["metadata"] !== null &&
      row["metadata"] !== undefined &&
      typeof row["metadata"] === "object" &&
      !Array.isArray(row["metadata"])
        ? (row["metadata"] as Record<string, unknown>)
        : null,
    created_at: String(row["created_at"]),
  };
}

export async function GET(
  _req: Request,
  context: { params: { type: string; id: string } },
): Promise<Response> {
  try {
    const { type: typeParam, id: idParam } = context.params;
    if (!isReportType(typeParam)) {
      return NextResponse.json({ error: "INVALID_TYPE" }, { status: 400 });
    }

    const supabase = createClient();
    const { data: report, error } = await supabase
      .from("panama_reports")
      .select("*")
      .eq("id", idParam)
      .eq("type", typeParam)
      .single();

    if (error !== null || report === null) {
      return NextResponse.json({ error: "REPORT_NOT_FOUND" }, { status: 404 });
    }

    const row = report as Record<string, unknown>;

    // ── combined: on-demand 재렌더 (NZ/SG/Saudi 동일 패턴) ─────────────────────
    // 옛 동작: Storage에서 캐시된 PDF 다운로드
    // 새 동작: metadata.source_reports 에 저장된 4개 ID로 즉석 재렌더
    if (typeParam === "combined") {
      const meta = (row["metadata"] ?? {}) as Record<string, unknown>;
      const src = (meta["source_reports"] ?? {}) as Record<string, unknown>;
      const mid = src["market"];
      const pid = src["pricing_public"];
      const privId = src["pricing_private"];
      const partId = src["partner"];
      if (
        typeof mid !== "string" ||
        typeof pid !== "string" ||
        typeof privId !== "string" ||
        typeof partId !== "string"
      ) {
        return NextResponse.json(
          { error: "COMBINED_SOURCE_REPORTS_MISSING" },
          { status: 404 },
        );
      }

      const productId =
        typeof meta["product_id"] === "string" ? meta["product_id"] : null;
      const country =
        typeof meta["country"] === "string" ? meta["country"] : "panama";
      if (productId === null) {
        return NextResponse.json({ error: "PRODUCT_NOT_FOUND" }, { status: 404 });
      }
      const pm = findProductById(productId);
      if (pm === undefined) {
        return NextResponse.json({ error: "PRODUCT_NOT_FOUND" }, { status: 404 });
      }
      const product = {
        id: pm.product_id,
        name: pm.kr_brand_name,
        ingredient: pm.who_inn_en,
      };

      const supabaseFor = createSupabaseServer();
      const [marketRpt, publicRpt, privateRpt, partnerRpt] = await Promise.all([
        fetchReportRow(supabaseFor, mid),
        fetchReportRow(supabaseFor, pid),
        fetchReportRow(supabaseFor, privId),
        fetchReportRow(supabaseFor, partId),
      ]);

      const pdfBuffer = await renderCombinedPDF({
        product,
        country,
        generatedAt: new Date(),
        marketReport: marketRpt,
        publicPricingReport: publicRpt,
        privatePricingReport: privateRpt,
        partnerReport: partnerRpt,
      });

      const filename = `combined-${idParam.slice(0, 8)}.pdf`;
      return new Response(new Uint8Array(pdfBuffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    // ── individual reports: on-demand generation ──────────────────────────────
    const sessionId =
      typeof row["session_id"] === "string" ? row["session_id"] : null;
    if (sessionId === null) {
      return NextResponse.json({ error: "SESSION_NOT_FOUND" }, { status: 404 });
    }

    const supabaseServer = createSupabaseServer();

    const { data: sessionRow, error: sessionErr } = await supabaseServer
      .from("panama_report_session")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (sessionErr !== null || sessionRow === null) {
      return NextResponse.json({ error: "SESSION_NOT_FOUND" }, { status: 404 });
    }

    const session = sessionRow as Record<string, unknown>;
    const productId =
      typeof session["product_id"] === "string" ? session["product_id"] : null;
    const country =
      typeof session["country"] === "string" ? session["country"] : "panama";

    if (productId === null) {
      return NextResponse.json({ error: "PRODUCT_NOT_FOUND" }, { status: 404 });
    }

    const pm = findProductById(productId);
    if (pm === undefined) {
      return NextResponse.json({ error: "PRODUCT_NOT_FOUND" }, { status: 404 });
    }

    const product = {
      id: pm.product_id,
      name: pm.kr_brand_name,
      ingredient: pm.who_inn_en,
    };

    let pdfBuffer: Buffer;
    const filename = `${typeParam}-${idParam.slice(0, 8)}.pdf`;

    if (typeParam === "market") {
      // ── 시장조사 보고서 ────────────────────────────────────────────────────
      const marketReport = await fetchReportRow(supabaseServer, idParam);
      pdfBuffer = await renderMarketPDF({
        product,
        country,
        generatedAt: new Date(),
        marketReport,
      });
    } else if (typeParam === "pricing_public" || typeParam === "pricing_private") {
      // ── 가격전략 보고서 — 공공/민간 모두 필요 ──────────────────────────────
      const pubId = session["pricing_public_report_id"];
      const privId = session["pricing_private_report_id"];

      if (typeof pubId !== "string" || typeof privId !== "string") {
        return NextResponse.json(
          { error: "PRICING_REPORTS_NOT_FOUND" },
          { status: 404 },
        );
      }

      const [publicPricingReport, privatePricingReport] = await Promise.all([
        fetchReportRow(supabaseServer, pubId),
        fetchReportRow(supabaseServer, privId),
      ]);

      pdfBuffer = await renderPricingPDF({
        product,
        country,
        generatedAt: new Date(),
        publicPricingReport,
        privatePricingReport,
      });
    } else {
      // typeParam === "partner"
      // ── 바이어 발굴 보고서 ─────────────────────────────────────────────────
      const partnerReport = await fetchReportRow(supabaseServer, idParam);
      pdfBuffer = await renderPartnerPDF({
        product,
        country,
        generatedAt: new Date(),
        partnerReport,
      });
    }

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "UNKNOWN_ERROR";
    return NextResponse.json(
      { error: "PDF_FETCH_FAILED", detail: message },
      { status: 500 },
    );
  }
}
