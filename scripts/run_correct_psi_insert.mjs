/**
 * 기존 잘못된 24행 삭제 후 panama_partner_psi_precomputed_insert_top5.sql 실행
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PAT = "sbp_0fee6ed336ea1e6ad2e72ecb3a9f5de00299b20c";
const PROJECT_REF = "qyvisskkjiuqkvbrewnr";
const API_URL = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;

async function runSQL(label, sql) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAT}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`❌ [${label}] HTTP ${res.status}: ${text.slice(0, 600)}`);
    return false;
  }
  let parsed;
  try { parsed = JSON.parse(text); } catch { parsed = text; }
  const preview = JSON.stringify(parsed).slice(0, 300);
  console.log(`✅ [${label}] ${preview}`);
  return true;
}

// Step 1: 기존 24행 삭제
console.log("=== Step 1: 기존 잘못된 행 삭제 ===");
await runSQL("DELETE existing", "DELETE FROM panama_partner_psi_precomputed");

// Step 2: 올바른 SQL 실행
console.log("\n=== Step 2: 정확한 5사×8제품 INSERT ===");
const sqlPath = join(__dirname, "ddl", "panama_partner_psi_precomputed_insert_top5.sql");
const insertSQL = readFileSync(sqlPath, "utf-8");
const ok = await runSQL("INSERT 40행 (CTE)", insertSQL);
if (!ok) {
  process.exit(1);
}

// Step 3: 검증
console.log("\n=== Step 3: 결과 검증 ===");
await runSQL("총 행수", "SELECT COUNT(*) FROM panama_partner_psi_precomputed");
await runSQL("회사별 평균 PSI",
  `SELECT c.company_name, COUNT(*) AS products, ROUND(AVG(p.psi_base),2) AS avg_psi
   FROM panama_partner_psi_precomputed p
   JOIN panama_partner_candidates c ON c.id = p.partner_id
   GROUP BY c.company_name ORDER BY avg_psi DESC`
);
await runSQL("PSI TOP10",
  `SELECT c.company_name, p.psi_base, p.conflict_level, p.pipeline_tier
   FROM panama_partner_psi_precomputed p
   JOIN panama_partner_candidates c ON c.id = p.partner_id
   ORDER BY p.psi_base DESC LIMIT 10`
);

console.log("\n✅ 완료!");
