/**
 * PSI 테이블 마이그레이션 실행 스크립트
 * npx tsx scripts/run_psi_migration.ts
 */
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";

if (!url || !key) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL 또는 키가 비어 있습니다.");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

async function execSql(label: string, sql: string): Promise<void> {
  console.log(`\n▶ ${label} 실행 중...`);
  const { error } = await supabase.rpc("exec_sql", { sql });
  if (error) {
    // exec_sql RPC가 없을 경우 REST 직접 호출
    const res = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ sql }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`${label} 실패 (${res.status}): ${body}`);
    }
  }
  console.log(`✅ ${label} 완료`);
}

async function execSqlDirect(label: string, sql: string): Promise<void> {
  console.log(`\n▶ ${label} 실행 중 (management API)...`);
  // Supabase Management API: POST /v1/projects/{ref}/database/query
  const projectRef = url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  if (!projectRef) throw new Error("프로젝트 ref 추출 실패");

  const res = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ query: sql }),
    },
  );

  const body = await res.text();
  if (!res.ok) {
    throw new Error(`${label} 실패 (${res.status}): ${body}`);
  }
  console.log(`✅ ${label} 완료:`, body.slice(0, 200));
}

async function main() {
  const ddlPath = path.join(
    __dirname,
    "ddl",
    "panama_partner_psi_precomputed_ddl.sql",
  );
  const insertPath = path.join(
    __dirname,
    "ddl",
    "panama_partner_psi_precomputed_insert_top5.sql",
  );

  const ddlSql = fs.readFileSync(ddlPath, "utf-8");
  const insertSql = fs.readFileSync(insertPath, "utf-8");

  try {
    await execSqlDirect("DDL — panama_partner_psi_precomputed 테이블 생성", ddlSql);
    await execSqlDirect("INSERT — 상위 5사 × 8제품 = 40행", insertSql);

    // 검증
    const { data, error } = await supabase
      .from("panama_partner_psi_precomputed")
      .select("count")
      .limit(1);

    if (error) {
      console.log("\n⚠ 검증 쿼리 실패:", error.message);
    } else {
      console.log("\n🎉 마이그레이션 완료! 테이블 접근 성공.");
    }
  } catch (err) {
    console.error("\n❌ 실패:", err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

void main();
