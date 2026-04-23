/**
 * Supabase Management API를 통해 DDL + INSERT 실행
 * node scripts/run_ddl_via_api.mjs
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
    console.error(`❌ [${label}] HTTP ${res.status}: ${text.slice(0, 400)}`);
    return false;
  }
  let parsed;
  try { parsed = JSON.parse(text); } catch { parsed = text; }
  console.log(`✅ [${label}]`, JSON.stringify(parsed).slice(0, 200));
  return true;
}

// ── Step 1: DDL ──────────────────────────────────────────────
const ddlPath = join(__dirname, "ddl", "panama_partner_psi_precomputed_ddl.sql");
const ddlSql = readFileSync(ddlPath, "utf-8");

console.log("\n=== Step 1: DDL 실행 ===");
const ddlOk = await runSQL("CREATE TABLE + indexes + trigger", ddlSql);
if (!ddlOk) {
  console.error("DDL 실패 — 중단");
  process.exit(1);
}

// ── Step 2: 파트너 ID 조회 ────────────────────────────────────
console.log("\n=== Step 2: 파트너 ID 조회 ===");
const partnerRes = await fetch(API_URL, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${PAT}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    query: `SELECT id, company_name FROM panama_partner_candidates
            WHERE company_name IN (
              'Representaciones Rodríguez de Salud',
              'SEVEN PHARMA PANAMA',
              'MENAFAR, SA - Panama',
              'Medipan, S.A.',
              'APOTEX',
              'Haseth Pharmaceutical'
            ) ORDER BY company_name`,
  }),
});

const partnerText = await partnerRes.text();
if (!partnerRes.ok) {
  console.error("파트너 조회 실패:", partnerText);
  process.exit(1);
}

const partners = JSON.parse(partnerText);
console.log("조회된 파트너:");
partners.forEach(p => console.log(`  ${p.company_name}: ${p.id}`));

const byName = {};
partners.forEach(p => { byName[p.company_name] = p.id; });

// ── Step 3: 제품 목록 (product_id는 product-dictionary의 product_id 컬럼 없이 UUID로 관리)
// panama_partner_psi_precomputed의 product_id는 실제 products 테이블 UUID
// 여기서는 product_id를 gen_random_uuid()로 채우되, 실제 매핑은 나중에 업데이트
// 현재 구현: product_id 컬럼은 아직 별도 products 테이블 없으므로 UPharma 8개 품목의
// 고정 UUID를 사용 (product-dictionary와 연동)
console.log("\n=== Step 3: 품목 고정 UUID 확인 ===");

// product-dictionary.ts의 product_id 필드 값 (문자열 ID → UUID 변환 필요시 사용)
// 실제 panama_partner_psi_precomputed.product_id는 UUID 타입
// 임시로 name-based deterministic UUID 생성
const PRODUCTS = [
  { name: "에소트론정 40mg",    id: "11111111-0001-0000-0000-000000000001" },
  { name: "올로스타정",          id: "11111111-0002-0000-0000-000000000002" },
  { name: "올메텍정 20mg",      id: "11111111-0003-0000-0000-000000000003" },
  { name: "레일라정",            id: "11111111-0004-0000-0000-000000000004" },
  { name: "뉴론틴캡슐 300mg",   id: "11111111-0005-0000-0000-000000000005" },
  { name: "에나폰정 5mg",       id: "11111111-0006-0000-0000-000000000006" },
  { name: "딜라트렌정 25mg",    id: "11111111-0007-0000-0000-000000000007" },
  { name: "알포스타딜주",        id: "11111111-0008-0000-0000-000000000008" },
];

// ── Step 4: PSI 데이터 40행 구성 ────────────────────────────────
// 상위 5사: Rodríguez, SEVEN PHARMA, MENAFAR, Medipan, APOTEX
// (Haseth는 데이터 부족으로 제외, 대신 5사만)

const COMPANY_KEYS = [
  "Representaciones Rodríguez de Salud",
  "SEVEN PHARMA PANAMA",
  "MENAFAR, SA - Panama",
  "Medipan, S.A.",
  "APOTEX",
];

// 회사별 기본 점수 프로파일
const COMPANY_PROFILE = {
  "Representaciones Rodríguez de Salud": {
    revenue_score: 40, pipeline_score: 60, manufacturing_score: 0,
    import_experience_score: 100, pharmacy_chain_score: 50,
  },
  "SEVEN PHARMA PANAMA": {
    revenue_score: 20, pipeline_score: 40, manufacturing_score: 100,
    import_experience_score: 100, pharmacy_chain_score: 50,
  },
  "MENAFAR, SA - Panama": {
    revenue_score: 40, pipeline_score: 60, manufacturing_score: 0,
    import_experience_score: 100, pharmacy_chain_score: 100,
  },
  "Medipan, S.A.": {
    revenue_score: 20, pipeline_score: 40, manufacturing_score: 0,
    import_experience_score: 50, pharmacy_chain_score: 50,
  },
  "APOTEX": {
    revenue_score: 80, pipeline_score: 80, manufacturing_score: 100,
    import_experience_score: 100, pharmacy_chain_score: 0,
  },
};

// 제품별 pipeline_tier / conflict_level (간략화)
const PRODUCT_CONFLICT = {
  "에소트론정 40mg":   { pipeline_tier: 3, conflict_level: "adjacent_category",    insight: "PPI 계열 유사 제품 보유. 에소메프라졸 복합제 업그레이드 제안 가능." },
  "올로스타정":        { pipeline_tier: 2, conflict_level: "upgrade_opportunity",   insight: "단일 성분 스타틴 취급 → 복합제(로수바+에제티미브) 업그레이드 기회." },
  "올메텍정 20mg":    { pipeline_tier: 3, conflict_level: "adjacent_category",      insight: "ARB 계열 단일 성분 다수 보유. 복합제 포트폴리오 확장 여지." },
  "레일라정":          { pipeline_tier: 5, conflict_level: "none",                  insight: "경쟁 성분 없음. 신규 카테고리 진입으로 파트너십 시너지 기대." },
  "뉴론틴캡슐 300mg": { pipeline_tier: 2, conflict_level: "direct_competition",    insight: "가바펜틴 제네릭 직접 경쟁. 규격·포장 차별화 전략 필요." },
  "에나폰정 5mg":     { pipeline_tier: 4, conflict_level: "adjacent_category",      insight: "ACE억제제 인접 ATC 보유. 복합 항고혈압제 포트폴리오 보완 가능." },
  "딜라트렌정 25mg":  { pipeline_tier: 3, conflict_level: "adjacent_category",      insight: "베타차단제 계열 인접. 심부전·고혈압 통합 라인업 제안 가능." },
  "알포스타딜주":      { pipeline_tier: 5, conflict_level: "none",                  insight: "틈새 혈관 확장제. 해당 파트너 포트폴리오에 없는 신규 품목." },
};

function calcPsi(profile) {
  return (
    profile.revenue_score * 0.35 +
    profile.pipeline_score * 0.28 +
    profile.manufacturing_score * 0.20 +
    profile.import_experience_score * 0.12 +
    profile.pharmacy_chain_score * 0.05
  );
}

const rows = [];
for (const company of COMPANY_KEYS) {
  const partnerId = byName[company];
  if (!partnerId) {
    console.warn(`⚠ 파트너 ID 없음: ${company}`);
    continue;
  }
  const prof = COMPANY_PROFILE[company];
  for (const product of PRODUCTS) {
    const conflict = PRODUCT_CONFLICT[product.name];
    const psi = calcPsi(prof);
    rows.push({
      partner_id: partnerId,
      product_id: product.id,
      pipeline_tier: conflict.pipeline_tier,
      conflict_level: conflict.conflict_level,
      conflict_insight: conflict.insight,
      revenue_tier: prof.revenue_score === 80 ? 2 : prof.revenue_score === 60 ? 3 : prof.revenue_score === 40 ? 4 : 5,
      revenue_score: prof.revenue_score,
      pipeline_score: prof.pipeline_score,
      manufacturing_score: prof.manufacturing_score,
      import_experience_score: prof.import_experience_score,
      pharmacy_chain_score: prof.pharmacy_chain_score,
      psi_base: Math.round(psi * 100) / 100,
      notes: `자동 생성 (run_ddl_via_api.mjs)`,
    });
  }
}

console.log(`\n=== Step 4: ${rows.length}행 UPSERT ===`);

if (rows.length === 0) {
  console.error("삽입할 행이 없습니다. 파트너 ID 확인 필요.");
  process.exit(1);
}

// VALUES 절 생성
function esc(v) {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return String(v);
  return `'${String(v).replace(/'/g, "''")}'`;
}

const valuesClauses = rows.map(r =>
  `(${esc(r.partner_id)},${esc(r.product_id)},${r.pipeline_tier},${esc(r.conflict_level)},${esc(r.conflict_insight)},${r.revenue_tier},${r.revenue_score},${r.pipeline_score},${r.manufacturing_score},${r.import_experience_score},${r.pharmacy_chain_score},${r.psi_base},${esc(r.notes)})`
).join(",\n");

const insertSQL = `
INSERT INTO panama_partner_psi_precomputed
  (partner_id, product_id, pipeline_tier, conflict_level, conflict_insight,
   revenue_tier, revenue_score, pipeline_score, manufacturing_score,
   import_experience_score, pharmacy_chain_score, psi_base, notes)
VALUES
${valuesClauses}
ON CONFLICT (partner_id, product_id) DO UPDATE SET
  pipeline_tier           = EXCLUDED.pipeline_tier,
  conflict_level          = EXCLUDED.conflict_level,
  conflict_insight        = EXCLUDED.conflict_insight,
  revenue_tier            = EXCLUDED.revenue_tier,
  revenue_score           = EXCLUDED.revenue_score,
  pipeline_score          = EXCLUDED.pipeline_score,
  manufacturing_score     = EXCLUDED.manufacturing_score,
  import_experience_score = EXCLUDED.import_experience_score,
  pharmacy_chain_score    = EXCLUDED.pharmacy_chain_score,
  psi_base                = EXCLUDED.psi_base,
  notes                   = EXCLUDED.notes,
  updated_at              = now()
`;

const insertOk = await runSQL(`UPSERT ${rows.length}행`, insertSQL);
if (!insertOk) process.exit(1);

// ── Step 5: 결과 확인 ────────────────────────────────────────
console.log("\n=== Step 5: 결과 확인 ===");
await runSQL("COUNT", "SELECT COUNT(*) FROM panama_partner_psi_precomputed");
await runSQL("TOP5", `
  SELECT c.company_name, COUNT(*) AS products, ROUND(AVG(p.psi_base),2) AS avg_psi
  FROM panama_partner_psi_precomputed p
  JOIN panama_partner_candidates c ON c.id = p.partner_id
  GROUP BY c.company_name ORDER BY avg_psi DESC LIMIT 5
`);

console.log("\n✅ 완료!");
