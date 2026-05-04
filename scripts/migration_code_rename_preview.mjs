// Preview code rename: reports → panama_reports, llm_outputs → panama_llm_outputs
// Lists all files that would be modified, with line numbers.
// DOES NOT MODIFY anything yet — for review.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const FILES = [
  // reports references
  'src/logic/reports/pricing_generator.ts',
  'src/logic/reports/partner_generator.ts',
  'src/logic/reports/market_generator.ts',
  'src/logic/reports/combined_generator.ts',
  'app/api/panama/report/[type]/[id]/pdf/route.ts',
  'app/api/panama/report/session/[sessionId]/list/route.ts',
  'app/api/panama/report/delete/[id]/route.ts',
  'app/api/panama/report/combined/route.ts',
  // llm_outputs references
  'src/lib/llm-output-logger.ts',
];

async function preview(file) {
  try {
    const content = await readFile(join('C:/Dev/United-Panama-main', file), 'utf8');
    const lines = content.split('\n');
    const changes = [];
    lines.forEach((line, i) => {
      if (/\.from\(["']reports["']\)/.test(line)) {
        changes.push({
          line: i + 1,
          from: line.trim(),
          to: line.replace(/\.from\(["']reports["']\)/, '.from("panama_reports")').trim(),
        });
      }
      if (/\.from\(["']llm_outputs["']\)/.test(line)) {
        changes.push({
          line: i + 1,
          from: line.trim(),
          to: line.replace(/\.from\(["']llm_outputs["']\)/, '.from("panama_llm_outputs")').trim(),
        });
      }
    });
    return { file, changes };
  } catch (e) {
    return { file, changes: [], error: e.message };
  }
}

async function main() {
  console.log('=== Code Rename Preview (reports → panama_reports, llm_outputs → panama_llm_outputs) ===\n');
  let totalChanges = 0;
  for (const f of FILES) {
    const r = await preview(f);
    if (r.error) {
      console.log(`✗ ${f}: ${r.error}`);
      continue;
    }
    if (r.changes.length === 0) {
      console.log(`(no changes) ${f}`);
      continue;
    }
    console.log(`\n📝 ${f} (${r.changes.length} change${r.changes.length > 1 ? 's' : ''})`);
    for (const c of r.changes) {
      console.log(`   Line ${c.line}:`);
      console.log(`   - ${c.from}`);
      console.log(`   + ${c.to}`);
    }
    totalChanges += r.changes.length;
  }
  console.log(`\n=== Total: ${totalChanges} line changes across ${FILES.length} files ===`);
}

main().catch((e) => { console.error(e); process.exit(1); });
