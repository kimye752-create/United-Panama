/**
 * GET — 파나마 시장 뉴스 헤드라인 (Perplexity)
 */
import { NextResponse } from "next/server";

import { fetchPanamaDashboardNews } from "@/src/logic/fetch_panama_dashboard_news";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    const payload = await fetchPanamaDashboardNews();
    return NextResponse.json(payload);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        items: [],
        generated_at: new Date().toISOString(),
        source: "fallback" as const,
        warning: `서버 처리 실패: ${message}`,
      },
      { status: 500 },
    );
  }
}
