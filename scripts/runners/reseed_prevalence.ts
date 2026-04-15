/**
 * round4 prevalence 기존 시드 행 삭제 후 재적재 (Supabase)
 * DELETE: product_id IN (9) AND pa_source IN ('gemini_seed','gemini_prevalence') — worldbank 등 거시 행은 유지
 */
/// <reference types="node" />

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";

import { parseRound4PrevalenceFile } from "../../src/logic/prevalence_seed_build.js";
import { loadRound4PrevalenceFromPath } from "../../src/seed_loaders/load_prevalence.js";
import { getSupabaseClient, PANAMA_TABLE } from "../../src/utils/db_connector.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DEFAULT_PATH = join(
  __dirname,
  "..",
  "..",
  "data",
  "seed",
  "panama",
  "round4_prevalence.json",
);

async function deleteOldPrevalenceRows(productIds: readonly string[]): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client
    .from(PANAMA_TABLE)
    .delete()
    .in("product_id", productIds)
    .in("pa_source", ["gemini_seed", "gemini_prevalence"]);
  if (error !== null) {
    throw new Error(
      `기존 prevalence 시드 삭제 실패: ${error.message}. RLS·service_role 키를 확인하세요.`,
    );
  }
}

/** true면 JSON 파싱만 검증하고 Supabase 삭제·INSERT는 하지 않음 */
const isDryRun =
  process.argv.includes("--dry-run") || process.argv.includes("-n");

async function main(): Promise<void> {
  const path =
    process.env.PREVALENCE_SEED_PATH !== undefined &&
    process.env.PREVALENCE_SEED_PATH !== ""
      ? process.env.PREVALENCE_SEED_PATH
      : DEFAULT_PATH;

  const raw = await readFile(path, "utf-8");
  const file = parseRound4PrevalenceFile(JSON.parse(raw) as unknown);

  if (isDryRun) {
    process.stdout.write(
      `[dry-run] OK — entries ${String(file.entries.length)}건 + macro_healthcare_infra 1건 파싱됨 (${path})\n`,
    );
    return;
  }
  const productIds = [
    ...file.entries.map((e) => e.product_id),
    file.macro_healthcare_infra.product_id,
  ];

  process.stdout.write(
    `삭제 대상 product_id ${String(productIds.length)}건 (gemini_seed|gemini_prevalence만)…\n`,
  );
  await deleteOldPrevalenceRows(productIds);

  const { inserted } = await loadRound4PrevalenceFromPath(path);
  process.stdout.write(`재적재 완료: ${String(inserted)}행 INSERT\n`);
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  process.stderr.write(`${msg}\n`);
  process.exit(1);
});
