/**
 * panama: SELECT pa_source, COUNT(*) GROUP BY pa_source (REST 집계)
 */
import { config as loadEnv } from "dotenv";
import { createClient } from "@supabase/supabase-js";

loadEnv();

const url = process.env["SUPABASE_URL"];
const rawKey = process.env["SUPABASE_KEY"];
const key = rawKey?.replace(/^\(|\)$/g, "").trim();

if (!url || !key) {
  console.error("SUPABASE_URL / SUPABASE_KEY 필요");
  process.exit(1);
}

const client = createClient(url, key);

async function main(): Promise<void> {
  const { data, error } = await client.from("panama").select("pa_source");

  if (error) {
    console.error(error.message);
    process.exit(1);
  }

  const rows = data ?? [];
  const map = new Map<string, number>();
  for (const r of rows) {
    const s = (r.pa_source as string | null) ?? "";
    map.set(s, (map.get(s) ?? 0) + 1);
  }

  const sorted = [...map.entries()].sort((a, b) =>
    a[0].localeCompare(b[0], "en"),
  );

  console.log("TOTAL", rows.length);
  for (const [pa_source, c] of sorted) {
    console.log(`${pa_source}\t${c}`);
  }
}

main().catch((e: Error) => {
  console.error(e.message);
  process.exit(1);
});
