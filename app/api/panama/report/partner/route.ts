import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { generateCombinedReport } from "@/src/logic/reports/combined_generator";
import { generatePartnerReport } from "@/src/logic/reports/partner_generator";

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
    const { sessionId, weightedCriteria = {} } = body as {
      sessionId?: string;
      weightedCriteria?: Record<string, unknown>;
    };

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
    // 바이어 발굴은 시장조사만 완료돼 있으면 실행 가능하다.
    // 가격 산출은 독립 단계이며 바이어 발굴의 전제 조건이 아니다.
    if (s["market_completed_at"] === null) {
      return NextResponse.json(
        { error: "MARKET_ANALYSIS_REQUIRED", detail: "시장 조사를 먼저 실행하세요." },
        { status: 400 },
      );
    }

    const productId = s["product_id"];
    const country =
      typeof s["country"] === "string" ? s["country"] : "panama";
    if (typeof productId !== "string") {
      return NextResponse.json({ error: "SESSION_INCOMPLETE" }, { status: 400 });
    }

    const partnerReport = await generatePartnerReport({
      sessionId,
      productId,
      country,
      weightedCriteria,
    });

    const { error: upErr } = await supabase
      .from("panama_report_session")
      .update({
        partner_report_id: partnerReport.id,
        partner_completed_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    if (upErr !== null) {
      throw new Error(`세션 파트너 단계 갱신 실패: ${upErr.message}`);
    }

    /* Vercel 서버리스는 응답 반환 후 함수가 즉시 종료되어 background task 가 끊긴다.
       → 통합 보고서 생성도 동기로 실행한 뒤 응답한다. (maxDuration=300s 여유 충분) */
    let combinedReportId: string | null = null;
    try {
      const combinedReport = await generateCombinedReport(sessionId);
      combinedReportId = combinedReport.id;
      await supabase
        .from("panama_report_session")
        .update({
          combined_report_id: combinedReport.id,
          combined_generated_at: new Date().toISOString(),
        })
        .eq("id", sessionId);
    } catch (combErr) {
      /* 통합 실패해도 파트너 결과는 반환 — 사용자는 /report/combined GET 으로 재시도 가능 */
      console.error("[partner] combined report 생성 실패:", combErr);
    }

    return NextResponse.json({
      partnerReportId: partnerReport.id,
      combinedReportId,
      partnerData: partnerReport.report_data,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "UNKNOWN_ERROR";
    return NextResponse.json(
      { error: "PARTNER_GENERATION_FAILED", detail: message },
      { status: 500 },
    );
  }
}
