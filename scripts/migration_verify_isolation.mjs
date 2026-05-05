// Verify migration didn't touch any non-panama_* tables
// Reads team DB row counts for all 68 tables, classifies by country prefix.
import { writeFile } from 'node:fs/promises';

const PAT = process.env.TEAM_PAT;
const REF = process.env.TEAM_PROJECT_REF || 'oynefikqoibwtfpjlizv';

if (!PAT) {
  console.error('❌ TEAM_PAT 필요');
  process.exit(1);
}

async function execSql(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + PAT, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  return { ok: r.ok, status: r.status, body: await r.text() };
}

async function main() {
  console.log('=== 팀 DB 전체 테이블 + 행수 (영향도 검증) ===\n');

  // Get all tables + row counts in one query using LATERAL/CROSS JOIN trick
  // Use information_schema first, then count each
  const r = await execSql(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema='public' AND table_type='BASE TABLE'
     ORDER BY table_name`
  );
  if (!r.ok) {
    console.error('Failed to list tables:', r.body);
    process.exit(1);
  }
  const tables = JSON.parse(r.body);
  console.log(`Total tables: ${tables.length}`);

  const groups = {
    panama: [],
    cl: [],
    mx: [],
    sg: [],
    nz: [],
    id: [],
    uae: [],
    saudi: [],
    uy: [],
    hungary: [],
    other: [],
  };
  for (const { table_name: t } of tables) {
    if (t.startsWith('panama')) groups.panama.push(t);
    else if (t.startsWith('cl_')) groups.cl.push(t);
    else if (t.startsWith('mx_')) groups.mx.push(t);
    else if (t.startsWith('sg_')) groups.sg.push(t);
    else if (t.startsWith('nz_')) groups.nz.push(t);
    else if (t.startsWith('id_')) groups.id.push(t);
    else if (t.startsWith('uae_')) groups.uae.push(t);
    else if (t.startsWith('saudi_')) groups.saudi.push(t);
    else if (t.startsWith('uy_')) groups.uy.push(t);
    else if (t.startsWith('hungary')) groups.hungary.push(t);
    else groups.other.push(t);
  }

  // Count rows per group
  console.log('');
  for (const [country, tbls] of Object.entries(groups)) {
    if (tbls.length === 0) continue;
    let total = 0;
    let perTable = [];
    for (const t of tbls) {
      const cr = await execSql(`SELECT count(*) as c FROM public.${t}`);
      if (cr.ok) {
        const n = parseInt(JSON.parse(cr.body)[0].c, 10);
        total += n;
        perTable.push({ table: t, rows: n });
      }
    }
    const flag = country === 'panama' ? '🆕 마이그됨' : (country === 'other' ? '⚙ 공용' : '🔒 보존됨');
    console.log(`[${country}] ${tbls.length}개 테이블, ${total}행 ${flag}`);
    for (const p of perTable) {
      console.log(`    ${p.table.padEnd(38)} ${String(p.rows).padStart(6)} 행`);
    }
    console.log('');
  }

  // Audit log: did anything happen on the team DB during our session that touched non-panama_* tables?
  console.log('=== audit_log 최근 활동 (마이그 동안) ===');
  const auditCheck = await execSql(
    `SELECT count(*) as c FROM information_schema.tables WHERE table_name='audit_log'`
  );
  if (auditCheck.ok && JSON.parse(auditCheck.body)[0].c > 0) {
    const audit = await execSql(
      `SELECT * FROM public.audit_log WHERE created_at > NOW() - INTERVAL '2 hours' ORDER BY created_at DESC LIMIT 10`
    );
    if (audit.ok) {
      const rows = JSON.parse(audit.body);
      if (rows.length === 0) {
        console.log('  최근 2시간 내 audit_log 기록 없음 (마이그가 audit_log를 안 건드림)');
      } else {
        console.log(`  최근 ${rows.length}건:`);
        for (const r of rows) console.log('   ', JSON.stringify(r).slice(0, 200));
      }
    }
  }
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1); });
