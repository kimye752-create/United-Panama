/**
 * D1 정리: TRUNCATE + pa_price_local DECIMAL(20,4) ALTER + 타입 검증
 * Supabase MCP 미사용 시:
 * - DATABASE_URL 또는 SUPABASE_DB_PASSWORD(직접 Postgres 비밀번호)가 있으면 pg로 실행
 * - 없으면 REST DELETE로 전체 삭제만 수행 후 ALTER는 SQL 파일 수동 실행 안내
 */
import pg from "pg";
import { config as loadEnv } from "dotenv";
import { createClient } from "@supabase/supabase-js";

loadEnv();

const { Client } = pg;

function buildDirectPostgresUrl(): string | undefined {
  const explicit = process.env["DATABASE_URL"]?.trim();
  if (explicit) {
    return explicit;
  }
  const pass = process.env["SUPABASE_DB_PASSWORD"]?.trim();
  const supabaseUrl = process.env["SUPABASE_URL"]?.trim();
  if (!pass || !supabaseUrl) {
    return undefined;
  }
  let host: string;
  try {
    host = new URL(supabaseUrl).hostname;
  } catch {
    return undefined;
  }
  const ref = host.split(".")[0];
  if (!ref) {
    return undefined;
  }
  const enc = encodeURIComponent(pass);
  return `postgresql://postgres:${enc}@db.${ref}.supabase.co:5432/postgres`;
}

async function deleteAllViaRest(): Promise<{ before: number }> {
  const url = process.env["SUPABASE_URL"];
  const rawKey = process.env["SUPABASE_KEY"];
  const key = rawKey?.replace(/^\(|\)$/g, "").trim();
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_KEY가 필요합니다.");
  }
  const client = createClient(url, key);
  const { count: before, error: cntErr } = await client
    .from("panama")
    .select("*", { count: "exact", head: true });

  if (cntErr) {
    throw new Error(cntErr.message);
  }

  const { error: delErr } = await client
    .from("panama")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (delErr) {
    throw new Error(delErr.message);
  }

  return { before: before ?? 0 };
}

async function runViaPg(dbUrl: string): Promise<void> {
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  try {
    await client.query("TRUNCATE TABLE public.panama");
    await client.query(
      "ALTER TABLE public.panama ALTER COLUMN pa_price_local TYPE DECIMAL(20,4)",
    );
    const res = await client.query<{
      data_type: string;
      numeric_precision: number | null;
      numeric_scale: number | null;
    }>(
      `SELECT data_type, numeric_precision, numeric_scale
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'panama'
         AND column_name = 'pa_price_local'`,
    );
    const row = res.rows[0];
    console.log(
      "PG_MAINT_OK",
      JSON.stringify({
        pa_price_local: row,
      }),
    );
  } finally {
    await client.end();
  }
}

async function main(): Promise<void> {
  const dbUrl = buildDirectPostgresUrl();

  if (dbUrl) {
    await runViaPg(dbUrl);
    return;
  }

  console.warn(
    "[d1_panama_maint] DATABASE_URL / SUPABASE_DB_PASSWORD 없음 — TRUNCATE/ALTER는 pg 미실행. REST DELETE로 전체 행 삭제 시도.",
  );
  const { before } = await deleteAllViaRest();
  console.log("REST_DELETE_BEFORE_COUNT", before);
  console.warn(
    "[d1_panama_maint] Supabase SQL Editor에서 실행: scripts/ddl/panama_alter_pa_price_local.sql (또는 TRUNCATE + ALTER 묶음)",
  );
}

main().catch((e: Error) => {
  console.error(e.message);
  process.exit(1);
});
