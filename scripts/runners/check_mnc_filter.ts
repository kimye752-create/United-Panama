/// <reference types="node" />

// 글로벌 MNC 필터의 실제 효과 검증용 일회성 스크립트
// 사용: npx tsx scripts/runners/check_mnc_filter.ts

import { getSupabaseClient } from "@/src/utils/db_connector";
import { isGlobalMnc } from "@/src/logic/global_mnc_filter";

async function main(): Promise<void> {
  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from("panama_partner_candidates")
    .select("company_name, source_primary")
    .limit(300);

  if (error !== null || data === null) {
    process.stderr.write(`조회 실패: ${error?.message ?? "no data"}\n`);
    process.exit(1);
  }

  const excluded: string[] = [];
  const kept: string[] = [];

  for (const row of data as Array<{ company_name: string }>) {
    if (isGlobalMnc(row.company_name)) {
      excluded.push(row.company_name);
    } else {
      kept.push(row.company_name);
    }
  }

  process.stdout.write(`총 레코드: ${data.length}\n`);
  process.stdout.write(`제외 (글로벌 MNC): ${excluded.length}\n`);
  for (const name of excluded) process.stdout.write(`  ✗ ${name}\n`);

  process.stdout.write(`\n유지 (파나마 로컬 + LATAM 중견): ${kept.length}\n`);
  for (const name of kept) process.stdout.write(`  ✓ ${name}\n`);
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`[check_mnc_filter] ${message}\n`);
  process.exit(1);
});
