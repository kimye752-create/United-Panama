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

    /* Next.js 14: after() 미지원 — 응답 후 결합본은 별도 클라이언트로 백그라운드 실행 */
    void (async () => {
      const sb = createClient();
      try {
        const combinedReport = await generateCombinedReport(sessionId);
        await sb
          .from("panama_report_session")
          .update({
            combined_report_id: combinedReport.id,
            combined_generated_at: new Date().toISOString(),
          })
          .eq("id", sessionId);
      } catch {
        /* 백그라운드 결합 실패 — 사용자는 /report/combined GET 즉석 생성으로 복구 가능 */
      }
    })();

    return NextResponse.json({
      partnerReportId: partnerReport.id,
      combinedReportPending: true,
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
