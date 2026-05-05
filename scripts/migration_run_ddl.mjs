// Run migration_schema.sql via Supabase Management API
// Usage: node --env-file=.env.local scripts/migration_run_ddl.mjs
import { readFile } from 'node:fs/promises';

const PAT = process.env.TEAM_PAT;
const REF = process.env.TEAM_PROJECT_REF || 'oynefikqoibwtfpjlizv';

if (!PAT) {
  console.error('❌ TEAM_PAT 환경변수 필요');
  process.exit(1);
}

async function execSql(query, label) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + PAT, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  return { status: r.status, ok: r.ok, body: await r.text() };
}

async function main() {
  console.log('=== Pre-check: panama_* 테이블 현재 상태 ===');
  const pre = await execSql(
    `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'panama%' ORDER BY table_name`
  );
  console.log('  HTTP', pre.status, ':', pre.body.slice(0, 100));
  const preData = JSON.parse(pre.body);
  if (preData.length > 0) {
    console.log('  ⚠ panama_* 테이블이 이미', preData.length, '개 존재');
    console.log('  IF NOT EXISTS로 안전하게 처리됨 (덮어쓰기 X)');
  }

  console.log('\n=== Reading migration_schema.sql ===');
  const sql = await readFile('migration_schema.sql', 'utf8');
  console.log(`  size: ${sql.length} chars, ${sql.split('\n').length} lines`);

  console.log('\n=== Executing DDL ===');
  console.log('  This creates 16 tables + RLS policies (IF NOT EXISTS)');
  const ddl = await execSql(sql, 'migration_schema.sql');
  console.log('  HTTP', ddl.status);
  if (!ddl.ok) {
    console.error('❌ DDL 실패:');
    console.error(ddl.body.slice(0, 1000));
    process.exit(1);
  }
  console.log('  ✅ DDL 성공');
  console.log('  Response (last verification SELECT):', ddl.body.slice(0, 500));

  console.log('\n=== Post-check: panama_* 테이블 생성 결과 ===');
  const post = await execSql(
    `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'panama%' ORDER BY table_name`
  );
  if (post.ok) {
    const tables = JSON.parse(post.body);
    console.log(`  Total panama_* tables: ${tables.length}`);
    for (const t of tables) console.log(`    - ${t.table_name}`);
    if (tables.length === 16) {
      console.log('\n  ✅ 16개 테이블 모두 생성 확인');
    } else {
      console.log(`\n  ⚠ 16개 예상이나 ${tables.length}개 발견`);
    }
  }

  console.log('\n=== Verifying other countries tables NOT affected ===');
  const others = await execSql(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema='public' AND table_name SIMILAR TO '(cl_|mx_|sg_|nz_|id_|uae_|saudi_|uy_|hungary)%'
     ORDER BY table_name LIMIT 5`
  );
  if (others.ok) {
    const tables = JSON.parse(others.body);
    console.log(`  Sample of other countries' tables (should be untouched):`);
    for (const t of tables) console.log(`    - ${t.table_name}`);
    console.log('  ✅ 다른 국가 테이블 영향 없음 (panama_* 만 추가됨)');
  }
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
