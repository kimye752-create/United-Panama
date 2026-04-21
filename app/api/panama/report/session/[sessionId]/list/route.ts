import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import type { GeneratedReportListItem, ReportType } from "@/src/types/report_session";

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

function getReportTitle(type: ReportType): string {
  switch (type) {
    case "market":
      return "시장조사 보고서";
    case "pricing_public":
      return "수출가격 전략 보고서";
    case "pricing_private":
      return "수출가격 전략 보고서";
    case "partner":
      return "바이어 발굴 보고서";
    case "combined":
      return "최종 보고서";
    default:
      return "보고서";
  }
}

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
    const { data: reports, error } = await supabase
      .from("reports")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (error !== null) {
      throw new Error(`목록 조회 실패: ${error.message}`);
    }

    const rows = reports ?? [];
    const items: GeneratedReportListItem[] = [];

    for (const r of rows) {
      const row = r as Record<string, unknown>;
      const typeRaw = row["type"];
      if (typeof typeRaw !== "string" || !isReportType(typeRaw)) {
        continue;
      }
      const id = row["id"];
      const createdAt = row["created_at"];
      const pdfPath = row["pdf_storage_path"];
      if (typeof id !== "string" || typeof createdAt !== "string") {
        continue;
      }
      const baseTitle = getReportTitle(typeRaw);
      items.push({
        id,
        type: typeRaw,
        title: baseTitle,
        marketSegment:
          typeRaw === "pricing_public"
            ? "public"
            : typeRaw === "pricing_private"
              ? "private"
              : undefined,
        createdAt,
        hasPdf: typeof pdfPath === "string" && pdfPath.length > 0,
        isFinal: typeRaw === "combined",
      });
    }

    items.sort((a, b) => {
      if (a.isFinal && !b.isFinal) {
        return -1;
      }
      if (!a.isFinal && b.isFinal) {
        return 1;
      }
      return (
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });

    return NextResponse.json({ reports: items });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "UNKNOWN_ERROR";
    return NextResponse.json(
      { error: "LIST_FAILED", detail: message },
      { status: 500 },
    );
  }
}
