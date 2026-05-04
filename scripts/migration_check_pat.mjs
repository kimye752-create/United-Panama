// Verify Team PAT can execute SQL via Management API
// Usage: node --env-file=.env.local scripts/migration_check_pat.mjs
// Requires .env.local: TEAM_PAT=sbp_...
const TEAM_PAT = process.env.TEAM_PAT;
const TEAM_PROJECT_REF = process.env.TEAM_PROJECT_REF || 'oynefikqoibwtfpjlizv';

if (!TEAM_PAT) {
  console.error('❌ TEAM_PAT 환경변수 필요 (.env.local에 추가)');
  process.exit(1);
}

async function execSql(query) {
  const url = `https://api.supabase.com/v1/projects/${TEAM_PROJECT_REF}/database/query`;
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + TEAM_PAT,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });
  return { status: r.status, body: await r.text() };
}

async function main() {
  console.log('Test 1: Read existing tables list');
  const r1 = await execSql(
    `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'panama%' ORDER BY table_name`
  );
  console.log('  HTTP', r1.status);
  console.log('  Body:', r1.body.slice(0, 500));

  console.log('\nTest 2: Schema introspection capability');
  const r2 = await execSql(
    `SELECT count(*) FROM information_schema.tables WHERE table_schema='public'`
  );
  console.log('  HTTP', r2.status);
  console.log('  Body:', r2.body.slice(0, 200));
}

main().catch((e) => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
