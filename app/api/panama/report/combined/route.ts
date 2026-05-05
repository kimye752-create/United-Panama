import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { generateCombinedReport } from "@/src/logic/reports/combined_generator";
import { renderCombinedPDF } from "@/src/logic/reports/render_combined_pdf";
import { findProductById } from "@/src/utils/product-dictionary";
import type { Report } from "@/src/types/report_session";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * panama_reports 단일 row 조회 → Report 타입 변환
 */
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

export async function GET(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get("session_id");

    if (sessionId === null || sessionId === "") {
      return NextResponse.json({ error: "SESSION_ID_REQUIRED" }, { status: 400 });
    }

    const supabase = createClient();
    const { data: session, error: sErr } = await supabase
      .from("panama_report_session")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (sErr !== null || session === null) {
      return NextResponse.json({ error: "SESSION_NOT_FOUND" }, { status: 404 });
    }

    const s = session as Record<string, unknown>;
    // ── 미완료 단계 확인 ────────────────────────────────────────────
    const missing: string[] = [];
    if (s["market_completed_at"] === null)   missing.push("market");
    if (s["pricing_completed_at"] === null)  missing.push("pricing");
    if (s["partner_completed_at"] === null)  missing.push("partner");

    if (missing.length > 0) {
      return NextResponse.json(
        { error: "INCOMPLETE_SESSION", missing },
        { status: 400 },
      );
    }

    // ── 결합 보고서 행 생성 (메타만 기록, PDF 저장 안 함) ─────────────
    const prevCombinedId = s["combined_report_id"];
    if (typeof prevCombinedId === "string" && prevCombinedId !== "") {
      console.info(`[combined] previous combined_report_id=${prevCombinedId} — forcing regenerate`);
    }

    console.info(`[combined] generating for session=${sessionId}`);
    const combinedReport = await generateCombinedReport(sessionId);
    console.info(`[combined] generated id=${combinedReport.id}`);
    await supabase
      .from("panama_report_session")
      .update({
        combined_report_id: combinedReport.id,
        combined_generated_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    // ── PDF 즉석 렌더 (NZ/SG/Saudi 동일 패턴, Storage 안 씀) ─────────
    const mid = s["market_report_id"];
    const pid = s["pricing_public_report_id"];
    const privId = s["pricing_private_report_id"];
    const partId = s["partner_report_id"];
    if (
      typeof mid !== "string" ||
      typeof pid !== "string" ||
      typeof privId !== "string" ||
      typeof partId !== "string"
    ) {
      return NextResponse.json(
        { error: "SOURCE_REPORT_IDS_MISSING" },
        { status: 400 },
      );
    }

    const productId = s["product_id"];
    const country = typeof s["country"] === "string" ? s["country"] : "panama";
    if (typeof productId !== "string") {
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

    const filename = `united-panama-final-${combinedReport.id.slice(0, 8)}.pdf`;
    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "UNKNOWN_ERROR";
    return NextResponse.json(
      { error: "COMBINED_FETCH_FAILED", detail: message },
      { status: 500 },
    );
  }
}
