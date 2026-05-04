// Migration audit - read-only row counts for both DBs
// Usage: node --env-file=.env.local scripts/migration_audit.mjs
const PANAMA_URL = process.env.SUPABASE_URL || process.env.PANAMA_DB_URL;
const PANAMA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.PANAMA_SERVICE_ROLE_KEY;
const TEAM_URL = process.env.TEAM_DB_URL;
const TEAM_KEY = process.env.TEAM_SERVICE_ROLE_KEY;

if (!PANAMA_URL || !PANAMA_KEY) {
  console.error('❌ SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY 필요');
  process.exit(1);
}
if (!TEAM_URL || !TEAM_KEY) {
  console.error('❌ TEAM_DB_URL + TEAM_SERVICE_ROLE_KEY 필요 (.env.local에 추가)');
  process.exit(1);
}

const PANAMA_TABLES = [
  'panama',
  'panama_backup_session13',
  'panama_distributors',
  'panama_eml',
  'panama_eml_backup_session20',
  'panama_ingredient_eligibility',
  'panama_macro_stats',
  'panama_news_cache',
  'panama_paper_citations',
  'panama_partner_candidates',
  'panama_partner_psi_precomputed',
  'panama_perplexity_cache',
  'panama_product_registration',
  'panama_report_cache',
  'panama_report_session',
  'panama_therapeutic_stats',
  'llm_outputs',
  'reports',
];

async function getCount(url, key, table) {
  const u = `${url}/rest/v1/${table}?select=id`;
  try {
    const r = await fetch(u, {
      method: 'HEAD',
      headers: {
        apikey: key,
        Authorization: 'Bearer ' + key,
        Prefer: 'count=exact',
      },
    });
    const cr = r.headers.get('content-range') || 'no-cr';
    const total = cr.split('/')[1] || cr;
    return { table, status: r.status, count: total };
  } catch (e) {
    return { table, status: 'ERR', count: e.message };
  }
}

async function main() {
  console.log('=== Panama personal DB row counts ===');
  console.log('table\trows');
  for (const t of PANAMA_TABLES) {
    const x = await getCount(PANAMA_URL, PANAMA_KEY, t);
    console.log(`${x.table}\t${x.count}\t(${x.status})`);
  }
  console.log();
  console.log('=== Team DB — verify panama_* still empty ===');
  const checkTables = ['panama', 'panama_distributors', 'panama_report_cache', 'panama_partner_candidates'];
  for (const t of checkTables) {
    const x = await getCount(TEAM_URL, TEAM_KEY, t);
    console.log(`${x.table}\t${x.count}\t(${x.status})`);
  }
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
