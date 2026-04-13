/**
 * 8 INN 시드 notes 생성 + resolvePrevalenceMetric 단건 검증 (DB 없이)
 */
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildPaNotesForPrevalenceEntry,
  parseRound4PrevalenceFile,
} from "../src/logic/prevalence_seed_build";
import { resolvePrevalenceMetric } from "../src/logic/prevalence_resolve";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SEED_PATH = join(
  __dirname,
  "..",
  "data",
  "seed",
  "panama",
  "round4_prevalence.json",
);

async function main(): Promise<void> {
  const raw = await readFile(SEED_PATH, "utf-8");
  const file = parseRound4PrevalenceFile(JSON.parse(raw) as unknown);
  process.stdout.write(
    "| INN | product_id | resolve 결과(앞 80자) |\n|---|---|---|\n",
  );
  for (const e of file.entries) {
    const notes = buildPaNotesForPrevalenceEntry(e);
    const row = { product_id: e.product_id, pa_notes: notes };
    const r = resolvePrevalenceMetric(e.product_id, [row], []);
    const short = r.length > 80 ? `${r.slice(0, 80)}…` : r;
    process.stdout.write(
      `| ${e.who_inn_en} | \`${e.product_id}\` | ${short.replace(/\|/g, "\\|")} |\n`,
    );
  }
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  process.stderr.write(`${msg}\n`);
  process.exit(1);
});
