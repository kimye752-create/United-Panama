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
}

export async function GET(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const productId = url.searchParams.get("productId");

    const supabase = createClient();

    let query = supabase
      .from("panama_report_session")
      .select("id, product_id, created_at, market_report_id, pricing_completed_at, partner_completed_at")
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
      return {
        sessionId: row.id as string,
        productId: row.product_id as string,
        productName: product?.kr_brand_name ?? row.product_id as string,
        createdAt: row.created_at as string,
        marketCompleted: row.market_report_id !== null,
        pricingCompleted: row.pricing_completed_at !== null,
        partnerCompleted: row.partner_completed_at !== null,
      };
    });

    return NextResponse.json({ items });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "UNKNOWN_ERROR";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
