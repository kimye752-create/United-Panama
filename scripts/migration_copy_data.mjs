// Copy data from Personal Panama DB → Team Shared DB
// Usage: node --env-file=.env.local scripts/migration_copy_data.mjs
// Pre-requisite: Team DB tables already created (run migration_schema.sql first).
import { writeFile } from 'node:fs/promises';

const PANAMA_URL = process.env.SUPABASE_URL || process.env.PANAMA_DB_URL;
const PANAMA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.PANAMA_SERVICE_ROLE_KEY;
const TEAM_URL = process.env.TEAM_DB_URL;
const TEAM_KEY = process.env.TEAM_SERVICE_ROLE_KEY;

if (!PANAMA_URL || !PANAMA_KEY || !TEAM_URL || !TEAM_KEY) {
  console.error('❌ 환경변수 누락. 필요: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TEAM_DB_URL, TEAM_SERVICE_ROLE_KEY');
  process.exit(1);
}

const TABLES = [
  { src: 'panama', dst: 'panama', expect: 218 },
  { src: 'panama_distributors', dst: 'panama_distributors', expect: 12 },
  { src: 'panama_eml', dst: 'panama_eml', expect: 18 },
  { src: 'panama_ingredient_eligibility', dst: 'panama_ingredient_eligibility', expect: 9 },
  { src: 'panama_macro_stats', dst: 'panama_macro_stats', expect: 1 },
  { src: 'panama_news_cache', dst: 'panama_news_cache', expect: 26 },
  { src: 'panama_paper_citations', dst: 'panama_paper_citations', expect: 12 },
  { src: 'panama_partner_candidates', dst: 'panama_partner_candidates', expect: 66 },
  { src: 'panama_partner_psi_precomputed', dst: 'panama_partner_psi_precomputed', expect: 40 },
  { src: 'panama_perplexity_cache', dst: 'panama_perplexity_cache', expect: 13 },
  { src: 'panama_product_registration', dst: 'panama_product_registration', expect: 8 },
  { src: 'panama_report_cache', dst: 'panama_report_cache', expect: 8 },
  { src: 'panama_report_session', dst: 'panama_report_session', expect: 53 },
  { src: 'panama_therapeutic_stats', dst: 'panama_therapeutic_stats', expect: 8 },
  { src: 'reports', dst: 'panama_reports', expect: 211 }, // RENAME
  { src: 'llm_outputs', dst: 'panama_llm_outputs', expect: 159 }, // RENAME
];

const BATCH_SIZE = 200;
const log = [];

function logBoth(msg) {
  console.log(msg);
  log.push(msg);
}

async function fetchAllRows(url, key, table) {
  const all = [];
  let from = 0;
  while (true) {
    const r = await fetch(`${url}/rest/v1/${table}?select=*&order=id.asc`, {
      headers: {
        apikey: key,
        Authorization: 'Bearer ' + key,
        Range: `${from}-${from + BATCH_SIZE - 1}`,
        'Range-Unit': 'items',
      },
    });
    if (!r.ok) {
      const txt = await r.text();
      throw new Error(`fetch ${table} failed: HTTP ${r.status} ${txt.slice(0, 200)}`);
    }
    const rows = await r.json();
    all.push(...rows);
    if (rows.length < BATCH_SIZE) break;
    from += BATCH_SIZE;
  }
  return all;
}

async function insertBatch(url, key, table, rows) {
  const r = await fetch(`${url}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: 'Bearer ' + key,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(rows),
  });
  if (!r.ok) {
    const txt = await r.text();
    return { ok: false, status: r.status, error: txt.slice(0, 500) };
  }
  return { ok: true };
}

async function teamCount(table) {
  const r = await fetch(`${TEAM_URL}/rest/v1/${table}?select=id`, {
    method: 'HEAD',
    headers: { apikey: TEAM_KEY, Authorization: 'Bearer ' + TEAM_KEY, Prefer: 'count=exact' },
  });
  const cr = r.headers.get('content-range') || '';
  return cr.split('/')[1] || '?';
}

async function copyTable({ src, dst, expect }) {
  logBoth(`\n=== ${src}${src !== dst ? ' → ' + dst : ''} (expect ${expect}) ===`);

  const preCount = await teamCount(dst);
  logBoth(`  [pre-check] team.${dst} current rows: ${preCount}`);

  if (parseInt(preCount, 10) > 0) {
    logBoth(`  ⚠ destination not empty (${preCount} rows). Skipping to prevent overwrite.`);
    return { table: src, status: 'SKIP_NOT_EMPTY', srcRows: 0, dstRows: preCount };
  }

  const rows = await fetchAllRows(PANAMA_URL, PANAMA_KEY, src);
  logBoth(`  [source] fetched ${rows.length} rows from panama.${src}`);

  if (rows.length !== expect) {
    logBoth(`  ⚠ row count differs from audit (expected ${expect}, got ${rows.length})`);
  }

  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const res = await insertBatch(TEAM_URL, TEAM_KEY, dst, batch);
    if (!res.ok) {
      logBoth(`  ✗ batch ${i / BATCH_SIZE + 1} FAILED: HTTP ${res.status}: ${res.error}`);
      return { table: src, status: 'INSERT_FAIL', error: res.error, inserted };
    }
    inserted += batch.length;
    logBoth(`  [batch ${Math.floor(i / BATCH_SIZE) + 1}] +${batch.length} rows (total ${inserted}/${rows.length})`);
  }

  const postCount = await teamCount(dst);
  logBoth(`  [verify] team.${dst} post-insert rows: ${postCount}`);

  return {
    table: src,
    status: parseInt(postCount, 10) === rows.length ? 'OK' : 'COUNT_MISMATCH',
    srcRows: rows.length,
    dstRows: postCount,
  };
}

async function main() {
  logBoth('========================================');
  logBoth('Panama → Team DB: Data Copy');
  logBoth(`Started: ${new Date().toISOString()}`);
  logBoth('========================================');

  const results = [];
  for (const t of TABLES) {
    try {
      const r = await copyTable(t);
      results.push(r);
    } catch (e) {
      logBoth(`  ✗ ${t.src} EXCEPTION: ${e.message}`);
      results.push({ table: t.src, status: 'EXCEPTION', error: e.message });
    }
  }

  logBoth('\n========================================');
  logBoth('SUMMARY');
  logBoth('========================================');
  logBoth('table | status | src_rows | dst_rows');
  for (const r of results) {
    logBoth(`${r.table} | ${r.status} | ${r.srcRows ?? '-'} | ${r.dstRows ?? '-'}`);
  }
  const okCount = results.filter((r) => r.status === 'OK').length;
  logBoth(`\nResult: ${okCount}/${TABLES.length} tables migrated successfully`);

  await writeFile('migration_data_log.txt', log.join('\n'));
  logBoth('\nLog saved to migration_data_log.txt');
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
