import { NextResponse } from "next/server";

import {
  fetchExchangeRateUsdKrw,
  upsertExchangeRateToDb,
} from "@/src/crawlers/realtime/exchange_rate_exim";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  try {
    const rate = await fetchExchangeRateUsdKrw();
    await upsertExchangeRateToDb(rate);

    return NextResponse.json({
      krwPerUsd: rate.rate,
      source: rate.source,
      asOf: rate.actualSearchDate,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "환율 조회 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
