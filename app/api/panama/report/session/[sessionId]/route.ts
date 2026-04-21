import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  context: { params: { sessionId: string } },
): Promise<Response> {
  try {
    const sessionId = context.params.sessionId;
    if (typeof sessionId !== "string" || sessionId === "") {
      return NextResponse.json({ error: "SESSION_ID_REQUIRED" }, { status: 400 });
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from("panama_report_session")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (error !== null || data === null) {
      return NextResponse.json({ error: "SESSION_NOT_FOUND" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "UNKNOWN_ERROR";
    return NextResponse.json(
      { error: "SESSION_FETCH_FAILED", detail: message },
      { status: 500 },
    );
  }
}
