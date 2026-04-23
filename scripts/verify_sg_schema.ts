/**
 * SG 파이프라인 필수 테이블 존재 여부 확인 (anon: SELECT 1건, RLS 허용 시 성공)
 * 실행: npx tsx scripts/verify_sg_schema.ts
 */
import { config as loadEnv } from "dotenv";

import { createSupabaseServer } from "../lib/supabase-server";

loadEnv({ path: ".env.local" });
loadEnv();

const TABLES = [
  "panama_therapeutic_stats",
  "panama_paper_citations",
  "llm_outputs",
] as const;

async function main(): Promise<void> {
  const supabase = createSupabaseServer();
  for (const table of TABLES) {
    const { error } = await supabase.from(table).select("id").limit(1);
    if (error !== null) {
      throw new Error(
        `[verify_sg_schema] 테이블 "${table}" 조회 실패: ${error.message} — scripts/ddl 의 SQL을 Supabase에 적용했는지 확인하세요.`,
      );
    }
  }
  process.stdout.write(`[verify_sg_schema] OK — ${TABLES.join(", ")}\n`);
}

main().catch((e: unknown) => {
  const msg = e instanceof Error ? e.message : String(e);
  process.stderr.write(`${msg}\n`);
  process.exit(1);
});
