// Extract schemas from Personal Panama DB via OpenAPI definitions
// Usage: node --env-file=.env.local scripts/migration_extract_schemas.mjs
import { writeFile } from 'node:fs/promises';

const PANAMA_URL = process.env.SUPABASE_URL || process.env.PANAMA_DB_URL;
const PANAMA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.PANAMA_SERVICE_ROLE_KEY;

if (!PANAMA_URL || !PANAMA_KEY) {
  console.error('❌ SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY 필요 (.env.local)');
  process.exit(1);
}

// Tables to migrate, with rename mapping
const TABLES = [
  { src: 'panama', dst: 'panama' },
  { src: 'panama_distributors', dst: 'panama_distributors' },
  { src: 'panama_eml', dst: 'panama_eml' },
  { src: 'panama_ingredient_eligibility', dst: 'panama_ingredient_eligibility' },
  { src: 'panama_macro_stats', dst: 'panama_macro_stats' },
  { src: 'panama_news_cache', dst: 'panama_news_cache' },
  { src: 'panama_paper_citations', dst: 'panama_paper_citations' },
  { src: 'panama_partner_candidates', dst: 'panama_partner_candidates' },
  { src: 'panama_partner_psi_precomputed', dst: 'panama_partner_psi_precomputed' },
  { src: 'panama_perplexity_cache', dst: 'panama_perplexity_cache' },
  { src: 'panama_product_registration', dst: 'panama_product_registration' },
  { src: 'panama_report_cache', dst: 'panama_report_cache' },
  { src: 'panama_report_session', dst: 'panama_report_session' },
  { src: 'panama_therapeutic_stats', dst: 'panama_therapeutic_stats' },
  { src: 'reports', dst: 'panama_reports' }, // RENAME
  { src: 'llm_outputs', dst: 'panama_llm_outputs' }, // RENAME
];

async function getOpenAPI() {
  const r = await fetch(`${PANAMA_URL}/rest/v1/?apikey=${PANAMA_KEY}`, {
    headers: { apikey: PANAMA_KEY, Authorization: 'Bearer ' + PANAMA_KEY, Accept: 'application/openapi+json' },
  });
  return await r.json();
}

// Map OpenAPI types/format to PostgreSQL types
function mapType(prop) {
  const f = prop.format || '';
  const t = prop.type || '';
  if (f === 'uuid') return 'uuid';
  if (f === 'timestamp with time zone' || f === 'timestamptz') return 'timestamptz';
  if (f === 'timestamp without time zone' || f === 'timestamp') return 'timestamp';
  if (f === 'date') return 'date';
  if (f === 'jsonb') return 'jsonb';
  if (f === 'json') return 'json';
  if (f === 'text') return 'text';
  if (f === 'character varying' || f === 'varchar') return 'text';
  if (f === 'boolean' || t === 'boolean') return 'boolean';
  if (f === 'bigint' || f === 'int8') return 'bigint';
  if (f === 'integer' || f === 'int4' || t === 'integer') return 'integer';
  if (f === 'smallint' || f === 'int2') return 'smallint';
  if (f === 'numeric') return 'numeric';
  if (f === 'real' || f === 'float4') return 'real';
  if (f === 'double precision' || f === 'float8') return 'double precision';
  if (t === 'string') return 'text';
  if (t === 'number') return 'numeric';
  if (t === 'array') {
    const itemFmt = prop.items?.format || prop.items?.type || 'text';
    return mapType({ format: itemFmt, type: 'string' }) + '[]';
  }
  return 'text';
}

function genCreateTable(tableName, def, srcName) {
  const props = def.properties || {};
  const required = new Set(def.required || []);
  const lines = [];
  lines.push(`CREATE TABLE IF NOT EXISTS public.${tableName} (`);
  const colLines = [];
  for (const [colName, prop] of Object.entries(props)) {
    let t = mapType(prop);
    let def_clause = '';
    if (colName === 'id' && t === 'uuid') {
      def_clause = ' DEFAULT gen_random_uuid()';
    }
    if (colName === 'crawled_at' && t === 'timestamptz') {
      def_clause = ' DEFAULT NOW()';
    }
    if (colName === 'created_at' && (t === 'timestamptz' || t === 'timestamp')) {
      def_clause = ' DEFAULT NOW()';
    }
    if (colName === 'updated_at' && (t === 'timestamptz' || t === 'timestamp')) {
      def_clause = ' DEFAULT NOW()';
    }
    let line = `  ${colName.padEnd(28)} ${t}`;
    if (colName === 'id') line += ' PRIMARY KEY';
    else if (required.has(colName)) line += ' NOT NULL';
    if (def_clause) line += def_clause;
    colLines.push(line);
  }
  lines.push(colLines.join(',\n'));
  lines.push(');');
  return lines.join('\n');
}

const RLS_DISABLED_TABLES = new Set(['panama_reports', 'panama_llm_outputs']);

function genRLS(tableName) {
  if (RLS_DISABLED_TABLES.has(tableName)) {
    return `
-- ${tableName}: RLS DISABLED (matches Personal DB behavior — reports/llm_outputs were created without RLS)
ALTER TABLE public.${tableName} DISABLE ROW LEVEL SECURITY;
`;
  }
  return `
-- RLS for ${tableName}
ALTER TABLE public.${tableName} ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_full_access_${tableName}" ON public.${tableName};
CREATE POLICY "service_role_full_access_${tableName}"
  ON public.${tableName} FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "anon_read_only_${tableName}" ON public.${tableName};
CREATE POLICY "anon_read_only_${tableName}"
  ON public.${tableName} FOR SELECT
  TO anon
  USING (true);
`;
}

async function main() {
  const api = await getOpenAPI();
  const defs = api.definitions || {};
  const out = [];

  out.push('-- ============================================================');
  out.push('-- Panama → Team DB Migration: Schema (DDL only)');
  out.push('-- Auto-generated from Personal DB OpenAPI introspection');
  out.push(`-- Generated: ${new Date().toISOString()}`);
  out.push('-- ============================================================');
  out.push('');
  out.push('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
  out.push('');

  let missingDefs = [];
  for (const { src, dst } of TABLES) {
    const def = defs[src];
    if (!def) {
      missingDefs.push(src);
      out.push(`-- ⚠ MISSING DEFINITION: ${src} → ${dst} (skipped, manual review needed)`);
      out.push('');
      continue;
    }
    out.push(`-- ── Table: ${src}${src !== dst ? ` → renamed to ${dst}` : ''} ──`);
    out.push(genCreateTable(dst, def, src));
    out.push(genRLS(dst));
    out.push('');
  }

  out.push('-- ============================================================');
  out.push('-- Verification: count tables created');
  out.push('-- ============================================================');
  out.push(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'panama%' ORDER BY table_name;`);

  const sql = out.join('\n');
  await writeFile('migration_schema.sql', sql);
  console.log('✅ Generated migration_schema.sql');
  console.log(`   Total length: ${sql.length} chars`);
  console.log(`   Tables generated: ${TABLES.length - missingDefs.length}/${TABLES.length}`);
  if (missingDefs.length > 0) {
    console.log(`   ⚠ Missing definitions: ${missingDefs.join(', ')}`);
  }
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
