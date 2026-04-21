import { NextResponse } from "next/server";

import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ReportType } from "@/src/types/report_session";

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
      .from("reports")
      .select("*")
      .eq("id", idParam)
      .eq("type", typeParam)
      .single();

    if (error !== null || report === null) {
      return NextResponse.json({ error: "REPORT_NOT_FOUND" }, { status: 404 });
    }

    const row = report as Record<string, unknown>;
    const pdfPath = row["pdf_storage_path"];
    if (typeof pdfPath !== "string" || pdfPath === "") {
      return NextResponse.json({ error: "REPORT_NOT_FOUND" }, { status: 404 });
    }

    const adminClient = createSupabaseAdmin();
    const { data: pdfBlob, error: storageError } = await adminClient.storage
      .from("reports")
      .download(pdfPath);

    if (storageError !== null || pdfBlob === null) {
      return NextResponse.json(
        { error: "PDF_FETCH_FAILED", detail: storageError?.message ?? "" },
        { status: 500 },
      );
    }

    const arrayBuffer = await pdfBlob.arrayBuffer();
    const filename = `${typeParam}-${idParam.slice(0, 8)}.pdf`;

    return new Response(arrayBuffer, {
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
