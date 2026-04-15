/**
 * 적재 후 panama_report_cache 비우기 + 집계 SELECT (Supabase 클라이언트)
 */
/// <reference types="node" />

import { getSupabaseClient } from "../../src/utils/db_connector.js";

type Row = { pa_source: string; pa_price_local: string | number | null };

function num(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined) {
    return null;
  }
  if (typeof v === "number" && Number.isFinite(v)) {
    return v;
  }
  const n = Number.parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

function aggregateBySource(rows: Row[]): Array<{
  pa_source: string;
  cnt: number;
  min_usd: number | null;
  max_usd: number | null;
}> {
  const map = new Map<
    string,
    { cnt: number; min: number | null; max: number | null }
  >();
  for (const r of rows) {
    const p = r.pa_price_local;
    const x = num(p);
    if (x === null || x <= 0) {
      continue;
    }
    const src = r.pa_source;
    const cur = map.get(src);
    if (cur === undefined) {
      map.set(src, { cnt: 1, min: x, max: x });
    } else {
      cur.cnt += 1;
      cur.min = cur.min === null ? x : Math.min(cur.min, x);
      cur.max = cur.max === null ? x : Math.max(cur.max, x);
    }
  }
  return [...map.entries()]
    .map(([pa_source, v]) => ({
      pa_source,
      cnt: v.cnt,
      min_usd: v.min,
      max_usd: v.max,
    }))
    .sort((a, b) => b.cnt - a.cnt);
}

async function main(): Promise<void> {
  const client = getSupabaseClient();

  const del = await client
    .from("panama_report_cache")
    .delete()
    .gte("generated_at", "1970-01-01T00:00:00Z");
  if (del.error !== null) {
    throw new Error(`panama_report_cache 삭제 실패: ${del.error.message}`);
  }

  const totalRes = await client
    .from("panama")
    .select("*", { count: "exact", head: true });
  if (totalRes.error !== null) {
    throw new Error(`panama 행 수 조회 실패: ${totalRes.error.message}`);
  }

  const srcRes = await client
    .from("panama")
    .select("pa_source, pa_price_local");
  if (srcRes.error !== null) {
    throw new Error(`panama 소스별 집계 조회 실패: ${srcRes.error.message}`);
  }

  const sx = await client
    .from("panama")
    .select("product_id, pa_price_local")
    .eq("pa_source", "superxtra_vtex");
  if (sx.error !== null) {
    throw new Error(`superxtra_vtex 집계 실패: ${sx.error.message}`);
  }

  const co = await client
    .from("panama")
    .select("product_id, pa_price_local")
    .eq("pa_source", "datos_gov_co");
  if (co.error !== null) {
    throw new Error(`datos_gov_co 집계 실패: ${co.error.message}`);
  }

  function groupPid(rows: { product_id: string; pa_price_local: unknown }[]) {
    const m = new Map<
      string,
      { cnt: number; min: number | null; max: number | null }
    >();
    for (const r of rows) {
      const x = num(r.pa_price_local as string | number | null);
      if (x === null) {
        continue;
      }
      const pid = r.product_id;
      const cur = m.get(pid);
      if (cur === undefined) {
        m.set(pid, { cnt: 1, min: x, max: x });
      } else {
        cur.cnt += 1;
        cur.min = cur.min === null ? x : Math.min(cur.min, x);
        cur.max = cur.max === null ? x : Math.max(cur.max, x);
      }
    }
    return [...m.entries()]
      .map(([product_id, v]) => ({
        product_id,
        cnt: v.cnt,
        min_usd: v.min,
        max_usd: v.max,
      }))
      .sort((a, b) => b.cnt - a.cnt);
  }

  const out = {
    panama_report_cache_deleted: true,
    total_panama_rows: totalRes.count ?? null,
    by_pa_source_price_positive: aggregateBySource(
      (srcRes.data ?? []) as Row[],
    ),
    superxtra_vtex_by_product: groupPid(
      (sx.data ?? []) as { product_id: string; pa_price_local: unknown }[],
    ),
    datos_gov_co_by_product: groupPid(
      (co.data ?? []) as { product_id: string; pa_price_local: unknown }[],
    ),
  };

  process.stdout.write(JSON.stringify(out, null, 2) + "\n");
}

main().catch((e: unknown) => {
  process.stderr.write(`${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
