/**
 * GET /api/panama/report/sessions?productId=xxx
 * 시장조사 완료된 세션 목록 반환 (드롭다운용)
 */
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { findProductById } from "@/src/utils/product-dictionary";

export const runtime = "nodejs";

export interface SessionListItem {
  sessionId: string;
  productId: string;
  productName: string;
  createdAt: string;        // ISO
  marketCompleted: boolean;
  pricingCompleted: boolean;
  partnerCompleted: boolean;
  combinedCompleted: boolean;
  // report IDs (null if not yet generated)
  marketReportId: string | null;
  pricingPublicReportId: string | null;
  pricingPrivateReportId: string | null;
  partnerReportId: string | null;
  combinedReportId: string | null;
}

export async function GET(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const productId = url.searchParams.get("productId");

    const supabase = createClient();

    let query = supabase
      .from("panama_report_session")
      .select("id, product_id, created_at, market_report_id, pricing_public_report_id, pricing_private_report_id, partner_report_id, combined_report_id, pricing_completed_at, partner_completed_at, combined_generated_at")
      .not("market_report_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(30);

    if (typeof productId === "string" && productId.trim() !== "") {
      query = query.eq("product_id", productId.trim());
    }

    const { data, error } = await query;

    if (error !== null) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const items: SessionListItem[] = (data ?? []).map((row) => {
      const product = findProductById(row.product_id as string);
      const r = row as Record<string, unknown>;
      return {
        sessionId: r["id"] as string,
        productId: r["product_id"] as string,
        productName: product?.kr_brand_name ?? (r["product_id"] as string),
        createdAt: r["created_at"] as string,
        marketCompleted: r["market_report_id"] !== null,
        pricingCompleted: r["pricing_completed_at"] !== null,
        partnerCompleted: r["partner_completed_at"] !== null,
        combinedCompleted: r["combined_generated_at"] !== null,
        marketReportId: typeof r["market_report_id"] === "string" ? r["market_report_id"] : null,
        pricingPublicReportId: typeof r["pricing_public_report_id"] === "string" ? r["pricing_public_report_id"] : null,
        pricingPrivateReportId: typeof r["pricing_private_report_id"] === "string" ? r["pricing_private_report_id"] : null,
        partnerReportId: typeof r["partner_report_id"] === "string" ? r["partner_report_id"] : null,
        combinedReportId: typeof r["combined_report_id"] === "string" ? r["combined_report_id"] : null,
      };
    });

    return NextResponse.json({ items });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "UNKNOWN_ERROR";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
