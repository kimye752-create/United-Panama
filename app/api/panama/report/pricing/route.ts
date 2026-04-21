import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { generatePricingReport } from "@/src/logic/reports/pricing_generator";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request): Promise<Response> {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "JSON 본문 파싱 실패" }, { status: 400 });
    }
    if (body === null || typeof body !== "object") {
      return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
    }
    const { sessionId } = body as { sessionId?: string };

    if (typeof sessionId !== "string" || sessionId === "") {
      return NextResponse.json({ error: "SESSION_ID_REQUIRED" }, { status: 400 });
    }

    const supabase = createClient();

    const { data: session, error: qErr } = await supabase
      .from("panama_report_session")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (qErr !== null || session === null) {
      return NextResponse.json({ error: "SESSION_NOT_FOUND" }, { status: 404 });
    }

    const s = session as Record<string, unknown>;
    if (s["market_completed_at"] === null) {
      return NextResponse.json(
        { error: "MARKET_ANALYSIS_REQUIRED" },
        { status: 400 },
      );
    }

    const marketReportId = s["market_report_id"];
    const productId = s["product_id"];
    if (typeof marketReportId !== "string" || typeof productId !== "string") {
      return NextResponse.json(
        { error: "SESSION_INCOMPLETE" },
        { status: 400 },
      );
    }

    const base = { sessionId, marketReportId, productId };

    const [publicReport, privateReport] = await Promise.all([
      generatePricingReport({
        ...base,
        marketSegment: "public",
      }),
      generatePricingReport({
        ...base,
        marketSegment: "private",
      }),
    ]);

    const { error: upErr } = await supabase
      .from("panama_report_session")
      .update({
        pricing_public_report_id: publicReport.id,
        pricing_private_report_id: privateReport.id,
        pricing_completed_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    if (upErr !== null) {
      throw new Error(`세션 가격 단계 갱신 실패: ${upErr.message}`);
    }

    return NextResponse.json({
      publicReportId: publicReport.id,
      privateReportId: privateReport.id,
      publicData: publicReport.report_data,
      privateData: privateReport.report_data,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "UNKNOWN_ERROR";
    return NextResponse.json(
      { error: "PRICING_GENERATION_FAILED", detail: message },
      { status: 500 },
    );
  }
}
