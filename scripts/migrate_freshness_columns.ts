/**
 * 기존 panama 행에 pa_refresh_cycle·pa_item_collected_at·(필요 시) pa_notes 일괄 보강
 */
/// <reference types="node" />

import { getSupabaseClient, PANAMA_TABLE } from "../src/utils/db_connector";
import type { MarketSegment } from "../src/utils/db_connector";
import type { PanamaPhase1InsertRow } from "../src/utils/db_connector";
import { applyPanamaFreshnessToInsertRow } from "../src/utils/panama_freshness_attach";

const PAGE = 200;

interface DbPanamaRow {
  id: string;
  product_id: string;
  market_segment: string;
  confidence: number | string | null;
  crawled_at: string;
  pa_source: string | null;
  pa_notes: string | null;
}

function toSegment(s: string): MarketSegment {
  const allowed: readonly MarketSegment[] = [
    "public",
    "private",
    "macro",
    "regulatory_milestone",
    "private_retail",
    "regulatory",
  ];
  if (allowed.includes(s as MarketSegment)) {
    return s as MarketSegment;
  }
  return "macro";
}

async function main(): Promise<void> {
  const client = getSupabaseClient();
  let from = 0;
  let updated = 0;
  for (;;) {
    const { data, error } = await client
      .from(PANAMA_TABLE)
      .select("id, product_id, market_segment, confidence, crawled_at, pa_source, pa_notes")
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error !== null) {
      throw new Error(`조회 실패: ${error.message}`);
    }
    const rows = (data ?? []) as DbPanamaRow[];
    if (rows.length === 0) {
      break;
    }
    for (const row of rows) {
      const confRaw = row.confidence;
      const conf =
        typeof confRaw === "number"
          ? confRaw
          : typeof confRaw === "string"
            ? Number.parseFloat(confRaw)
            : 0.8;
      const confidence = Number.isFinite(conf) ? conf : 0.8;

      const synthetic: PanamaPhase1InsertRow = {
        product_id: row.product_id,
        market_segment: toSegment(row.market_segment),
        fob_estimated_usd: null,
        confidence,
        crawled_at: row.crawled_at,
        pa_source: row.pa_source ?? "unknown",
        pa_notes: row.pa_notes ?? "",
      };
      const enriched = applyPanamaFreshnessToInsertRow(synthetic);
      const cycle = enriched.pa_refresh_cycle;
      const itemAt = enriched.pa_item_collected_at ?? null;
      const notes = enriched.pa_notes;

      const { error: upErr } = await client
        .from(PANAMA_TABLE)
        .update({
          pa_refresh_cycle: cycle,
          pa_item_collected_at: itemAt,
          pa_notes: notes,
        })
        .eq("id", row.id);
      if (upErr !== null) {
        throw new Error(`UPDATE 실패 id=${row.id}: ${upErr.message}`);
      }
      updated += 1;
    }
    if (rows.length < PAGE) {
      break;
    }
    from += PAGE;
  }
  process.stdout.write(
    JSON.stringify({ ok: true, updatedRows: updated }) + "\n",
  );
}

main().catch((e: unknown) => {
  process.stderr.write(
    `${e instanceof Error ? e.message : String(e)}\n`,
  );
  process.exit(1);
});
