/**
 * panama 테이블 — 공공 소스(acodeco, minsa, css) 건수 및 fob NULL 검증
 * Supabase .env 필요. 실패 시 한국어 메시지로 exit(1).
 */
/// <reference types="node" />

import { getSupabaseClient, PANAMA_TABLE } from "../src/utils/db_connector.js";

async function main(): Promise<void> {
  const client = getSupabaseClient();

  const src = await client
    .from(PANAMA_TABLE)
    .select("id", { count: "exact", head: true })
    .in("pa_source", ["acodeco", "minsa", "css"]);

  if (src.error !== null) {
    throw new Error(
      `공공 소스 COUNT 조회 실패: ${src.error.message}. RLS·컬럼명을 확인하세요.`,
    );
  }

  const fob = await client
    .from(PANAMA_TABLE)
    .select("id", { count: "exact", head: true })
    .not("fob_estimated_usd", "is", null);

  if (fob.error !== null) {
    throw new Error(
      `fob_estimated_usd 조회 실패: ${fob.error.message}.`,
    );
  }

  const publicCount = src.count ?? 0;
  const fobNotNull = fob.count ?? 0;

  process.stdout.write(
    JSON.stringify(
      {
        pa_source_in_acodeco_minsa_css: publicCount,
        fob_estimated_usd_not_null: fobNotNull,
      },
      null,
      2,
    ) + "\n",
  );

  if (fobNotNull !== 0) {
    process.stderr.write(
      "검증 실패: fob_estimated_usd IS NOT NULL 행이 0이 아닙니다.\n",
    );
    process.exit(1);
  }
}

main().catch((e: unknown) => {
  const msg = e instanceof Error ? e.message : String(e);
  process.stderr.write(`${msg}\n`);
  process.exit(1);
});
