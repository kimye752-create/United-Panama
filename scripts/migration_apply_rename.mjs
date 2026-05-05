// Apply rename: reports → panama_reports, llm_outputs → panama_llm_outputs
// Usage: node scripts/migration_apply_rename.mjs
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = 'C:/Dev/United-Panama-main';

const FILES = [
  'src/logic/reports/pricing_generator.ts',
  'src/logic/reports/partner_generator.ts',
  'src/logic/reports/market_generator.ts',
  'src/logic/reports/combined_generator.ts',
  'app/api/panama/report/[type]/[id]/pdf/route.ts',
  'app/api/panama/report/session/[sessionId]/list/route.ts',
  'app/api/panama/report/delete/[id]/route.ts',
  'app/api/panama/report/combined/route.ts',
  'src/lib/llm-output-logger.ts',
];

const REPLACEMENTS = [
  { from: /\.from\("reports"\)/g, to: '.from("panama_reports")' },
  { from: /\.from\("llm_outputs"\)/g, to: '.from("panama_llm_outputs")' },
];

async function processFile(file) {
  const fullPath = join(ROOT, file);
  const content = await readFile(fullPath, 'utf8');
  let newContent = content;
  let totalChanges = 0;
  for (const rep of REPLACEMENTS) {
    const matches = (newContent.match(rep.from) || []).length;
    if (matches > 0) {
      newContent = newContent.replace(rep.from, rep.to);
      totalChanges += matches;
    }
  }
  if (totalChanges === 0) {
    return { file, changes: 0, status: 'no-change' };
  }
  await writeFile(fullPath, newContent, 'utf8');
  return { file, changes: totalChanges, status: 'updated' };
}

async function main() {
  console.log('=== Code Rename Application ===\n');
  let total = 0;
  for (const f of FILES) {
    const r = await processFile(f);
    if (r.status === 'updated') {
      console.log(`✅ ${f} (${r.changes} changes)`);
    } else {
      console.log(`(no change) ${f}`);
    }
    total += r.changes;
  }
  console.log(`\n=== Total: ${total} replacements applied ===`);
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1); });
