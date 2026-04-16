import { NextResponse } from "next/server";

import { createSupabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ReportCacheRow {
  id: string;
  product_id: string;
  case_grade: string;
  generated_at: string;
}

export async function GET(): Promise<Response> {
  try {
    const sb = createSupabaseServer();
    const { data, error } = await sb
      .from("panama_report_cache")
      .select("id, product_id, case_grade, generated_at")
      .order("generated_at", { ascending: false })
      .limit(30);

    if (error !== null) {
      return NextResponse.json({ reports: [], warning: error.message }, { status: 200 });
    }
    return NextResponse.json({
      reports: (data ?? []) as ReportCacheRow[],
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { reports: [], warning: `2공정 보고서 목록 조회 실패: ${message}` },
      { status: 200 },
    );
  }
}
