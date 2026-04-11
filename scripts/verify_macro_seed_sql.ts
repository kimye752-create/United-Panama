/**
 * Phase 1-5: 사용자 제공 SQL과 동일한 조건을 REST로 집계 (임시 검증 스크립트)
 */
import { getSupabaseClient } from "../src/utils/db_connector.js";

interface PanamaRow {
  pa_source: string | null;
  fob_estimated_usd: number | null;
  market_segment: string;
}

async function main(): Promise<void> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("panama")
    .select("pa_source, fob_estimated_usd, market_segment")
    .eq("market_segment", "macro");

  if (error !== null) {
    process.stderr.write(`조회 실패: ${error.message}\n`);
    process.exit(1);
  }

  const rows = (data ?? []) as PanamaRow[];

  const q1 = rows.filter(
    (r) => r.pa_source !== null && r.pa_source !== "gemini_seed",
  ).length;

  const q2 = rows.filter(
    (r) =>
      r.pa_source !== null &&
      r.pa_source !== "gemini_seed" &&
      r.fob_estimated_usd !== null,
  ).length;

  const dist = new Map<string, number>();
  for (const r of rows) {
    if (r.pa_source === null || r.pa_source === "gemini_seed") {
      continue;
    }
    const k = r.pa_source;
    dist.set(k, (dist.get(k) ?? 0) + 1);
  }

  const { count: totalPanama, error: errTotal } = await client
    .from("panama")
    .select("*", { count: "exact", head: true });

  if (errTotal !== null) {
    process.stderr.write(`전체 건수 조회 실패: ${errTotal.message}\n`);
    process.exit(1);
  }

  process.stdout.write(
    JSON.stringify(
      {
        note: "macro이면서 pa_source IS DISTINCT FROM gemini_seed 에 가깝게 필터( pa_source null 제외 )",
        total_panama_rows: totalPanama ?? null,
        query1_count_macro_non_gemini: q1,
        query2_count_fob_not_null_violation: q2,
        query3_group_by_pa_source: Object.fromEntries(
          [...dist.entries()].sort((a, b) => a[0].localeCompare(b[0], "en")),
        ),
      },
      null,
      2,
    ) + "\n",
  );
}

main().catch((e: unknown) => {
  process.stderr.write(`${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
