import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// .env.local 또는 환경변수에서 읽기
// 실행 전: export NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
// 또는 dotenv: npx tsx --env-file=.env.local scripts/check_and_run_psi.ts
const SUPABASE_URL =
  process.env["NEXT_PUBLIC_SUPABASE_URL"] ??
  "https://qyvisskkjiuqkvbrewnr.supabase.co";
const SUPABASE_KEY =
  process.env["SUPABASE_SERVICE_ROLE_KEY"] ??
  process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] ??
  "";

if (SUPABASE_KEY === "") {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY (또는 NEXT_PUBLIC_SUPABASE_ANON_KEY) 환경변수가 필요합니다.");
  console.error("   실행: npx tsx --env-file=.env.local scripts/check_and_run_psi.ts");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

async function checkPartnerCandidates(): Promise<void> {
  const names = [
    "SEVEN PHARMA PANAMA S.A.",
    "MENAFAR, S.A.",
    "APOTEX PANAMA S.A.",
    "C.G. de Haseth & Cía., S.A.",
    "Medipan S.A.",
  ];
  const { data, error } = await sb
    .from("panama_partner_candidates")
    .select("id, company_name")
    .in("company_name", names);

  if (error) {
    console.error("❌ panama_partner_candidates 조회 실패:", error.message);
    return;
  }

  console.log(`\n✅ panama_partner_candidates 에서 찾은 5사 (${data?.length ?? 0}개):`);
  (data ?? []).forEach((r: { id: string; company_name: string }) =>
    console.log(`  - ${r.company_name} (${r.id})`),
  );

  const found = (data ?? []).map((r: { company_name: string }) => r.company_name);
  const missing = names.filter((n) => !found.includes(n));
  if (missing.length > 0) {
    console.log(`\n⚠ 누락된 파트너 (${missing.length}개):`, missing);
    console.log("  → INSERT 전에 panama_partner_candidates에 추가 필요");
  }
}

async function checkPsiTable(): Promise<boolean> {
  const { error } = await sb
    .from("panama_partner_psi_precomputed")
    .select("count")
    .limit(1);

  if (error?.code === "42P01") {
    console.log("\n📋 panama_partner_psi_precomputed 테이블 없음 → DDL 실행 필요");
    return false;
  }
  if (error) {
    console.log("\n⚠ 테이블 확인 오류:", error.message);
    return false;
  }
  console.log("\n✅ panama_partner_psi_precomputed 테이블 이미 존재");
  return true;
}

async function countPsiRows(): Promise<void> {
  const { data, error } = await sb
    .from("panama_partner_psi_precomputed")
    .select("id, pipeline_tier, conflict_level, psi_base", { count: "exact" });

  if (error) {
    console.log("행 수 조회 실패:", error.message);
    return;
  }
  console.log(`\n📊 현재 PSI 테이블 행 수: ${data?.length ?? 0}개`);
  if (data && data.length > 0) {
    console.log("샘플 (상위 3행):");
    data.slice(0, 3).forEach((r: Record<string, unknown>) =>
      console.log(`  psi_base=${r["psi_base"]}, conflict=${r["conflict_level"]}`),
    );
  }
}

async function printSqlInstructions(): Promise<void> {
  const ddlPath = path.join(__dirname, "ddl", "panama_partner_psi_precomputed_ddl.sql");
  const insertPath = path.join(__dirname, "ddl", "panama_partner_psi_precomputed_insert_top5.sql");

  console.log("\n" + "=".repeat(60));
  console.log("📌 Supabase SQL Editor 실행 순서:");
  console.log("=".repeat(60));
  console.log("1. https://supabase.com/dashboard/project/qyvisskkjiuqkvbrewnr/sql/new");
  console.log("2. DDL 파일 내용 붙여넣기 → 실행:");
  console.log(`   ${ddlPath}`);
  console.log("3. INSERT 파일 내용 붙여넣기 → 실행:");
  console.log(`   ${insertPath}`);
  console.log("=".repeat(60));
}

async function main(): Promise<void> {
  console.log("🔍 Panama Supabase DB 상태 점검...");
  console.log(`   URL: ${SUPABASE_URL}`);

  await checkPartnerCandidates();
  const tableExists = await checkPsiTable();

  if (tableExists) {
    await countPsiRows();
  } else {
    await printSqlInstructions();
  }
}

main().catch((e: unknown) => {
  console.error("오류:", e);
  process.exit(1);
});
