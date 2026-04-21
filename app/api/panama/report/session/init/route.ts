import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { generateMarketReport } from "@/src/logic/reports/market_generator";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request): Promise<Response> {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "JSON 본문 파싱 실패" }, { status: 400 });
    }
    if (body === null || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
    }
    const { productId, country = "panama" } = body as {
      productId?: string;
      country?: string;
    };

    if (typeof productId !== "string" || productId.trim() === "") {
      return NextResponse.json({ error: "PRODUCT_ID_REQUIRED" }, { status: 400 });
    }

    const supabase = createClient();

    const { data: session, error: sessionError } = await supabase
      .from("panama_report_session")
      .insert({ product_id: productId, country })
      .select()
      .single();

    if (sessionError !== null || session === null) {
      throw new Error(
        sessionError !== null
          ? sessionError.message
          : "세션 생성에 실패했습니다.",
      );
    }

    const sid = session.id as string;

    const marketReport = await generateMarketReport({
      productId,
      country,
      sessionId: sid,
    });

    const { error: upErr } = await supabase
      .from("panama_report_session")
      .update({
        market_report_id: marketReport.id,
        market_completed_at: new Date().toISOString(),
      })
      .eq("id", sid);

    if (upErr !== null) {
      throw new Error(`세션 시장조사 갱신 실패: ${upErr.message}`);
    }

    return NextResponse.json({
      sessionId: sid,
      marketReportId: marketReport.id,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "UNKNOWN_ERROR";
    return NextResponse.json(
      { error: "SESSION_INIT_FAILED", detail: message },
      { status: 500 },
    );
  }
}
