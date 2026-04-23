/// <reference types="node" />

// 현재 Supabase panama_partner_candidates 테이블 상태 점검용 일회성 스크립트
// 사용: npx tsx scripts/runners/check_partner_db.ts

import { getSupabaseClient } from "@/src/utils/db_connector";

async function main(): Promise<void> {
  const sb = getSupabaseClient();

  const { data, error, count } = await sb
    .from("panama_partner_candidates")
    .select("company_name, source_primary, address, revenue_usd, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(200);

  if (error !== null) {
    process.stderr.write(`조회 실패: ${error.message}\n`);
    process.exit(1);
  }

  process.stdout.write(`총 레코드 수: ${count ?? 0}\n`);
  process.stdout.write(`최근 상위 ${data?.length ?? 0}건:\n`);
  for (const row of data ?? []) {
    const r = row as {
      company_name: string;
      source_primary: string | null;
      address: string | null;
      revenue_usd: number | null;
    };
    process.stdout.write(
      `  · ${r.company_name.padEnd(50)} [${r.source_primary ?? "-"}] ${r.address ?? "-"}\n`,
    );
  }

  const sources = new Map<string, number>();
  for (const row of data ?? []) {
    const src = (row as { source_primary: string | null }).source_primary ?? "unknown";
    sources.set(src, (sources.get(src) ?? 0) + 1);
  }
  process.stdout.write(`\n출처별 분포:\n`);
  for (const [k, v] of sources) {
    process.stdout.write(`  · ${k}: ${v}\n`);
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`[check_partner_db] ${message}\n`);
  process.exit(1);
});
