import { NextResponse } from "next/server";

import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { generateCombinedReport } from "@/src/logic/reports/combined_generator";

export const runtime = "nodejs";
export const maxDuration = 120;

async function streamCombinedPdfByReportId(
  reportId: string,
): Promise<Response> {
  const supabase = createClient();

  const { data: report, error } = await supabase
    .from("reports")
    .select("pdf_storage_path")
    .eq("id", reportId)
    .single();

  if (error !== null || report === null) {
    throw new Error(
      error !== null ? error.message : "결합 보고서 행을 찾을 수 없습니다.",
    );
  }

  const pathRaw = (report as Record<string, unknown>)["pdf_storage_path"];
  if (typeof pathRaw !== "string" || pathRaw === "") {
    throw new Error("PDF_NOT_FOUND");
  }

  const adminClient = createSupabaseAdmin();
  const { data: pdfBlob, error: storageError } = await adminClient.storage
    .from("reports")
    .download(pathRaw);

  if (storageError !== null || pdfBlob === null) {
    throw new Error(
      storageError !== null
        ? storageError.message
        : "PDF_DOWNLOAD_FAILED",
    );
  }

  const arrayBuffer = await pdfBlob.arrayBuffer();

  return new Response(arrayBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="united-panama-final-${reportId.slice(0, 8)}.pdf"`,
    },
  });
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

    // ── 기존 combined_report_id → PDF 스트리밍 시도 ─────────────────
    const combinedId = s["combined_report_id"];
    if (typeof combinedId === "string" && combinedId !== "") {
      try {
        return await streamCombinedPdfByReportId(combinedId);
      } catch {
        // PDF_NOT_FOUND 등 — 아래에서 재생성
      }
    }

    // ── 모든 단계 완료됐으므로 즉석 생성 ────────────────────────────
    const combinedReport = await generateCombinedReport(sessionId);
    await supabase
      .from("panama_report_session")
      .update({
        combined_report_id: combinedReport.id,
        combined_generated_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    return await streamCombinedPdfByReportId(combinedReport.id);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "UNKNOWN_ERROR";
    return NextResponse.json(
      { error: "COMBINED_FETCH_FAILED", detail: message },
      { status: 500 },
    );
  }
}
