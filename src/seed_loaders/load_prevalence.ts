/**
 * Round4 prevalence + 거시 의료 인프라 — panama 9행 적재 (gemini_seed / macro)
 */
/// <reference types="node" />

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  getSupabaseClient,
  insertRow,
  PANAMA_TABLE,
  type PanamaPhase1InsertRow,
} from "../utils/db_connector.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DEFAULT_SEED_PATH = join(
  __dirname,
  "..",
  "..",
  "data",
  "seed",
  "panama",
  "round4_prevalence.json",
);

interface PrevalenceSeed {
  product_id: string;
  inn_en: string;
  target_disease: string;
  metric: string;
  source: string;
  panama_specific: boolean;
  confidence: number;
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === "object" && !Array.isArray(x);
}

function isPrevalenceSeed(x: unknown): x is PrevalenceSeed {
  if (!isRecord(x)) {
    return false;
  }
  return (
    typeof x.product_id === "string" &&
    typeof x.inn_en === "string" &&
    typeof x.target_disease === "string" &&
    typeof x.metric === "string" &&
    typeof x.source === "string" &&
    typeof x.panama_specific === "boolean" &&
    typeof x.confidence === "number" &&
    !Number.isNaN(x.confidence)
  );
}

function parsePrevalenceJson(raw: string): PrevalenceSeed[] {
  const data: unknown = JSON.parse(raw);
  if (!Array.isArray(data)) {
    throw new Error("round4_prevalence.json은 배열(JSON)이어야 합니다.");
  }
  const out: PrevalenceSeed[] = [];
  for (let i = 0; i < data.length; i++) {
    const el = data[i];
    if (!isPrevalenceSeed(el)) {
      throw new Error(
        `인덱스 ${String(i)}: PrevalenceSeed 스키마와 맞지 않습니다.`,
      );
    }
    out.push(el);
  }
  return out;
}

function buildRow(s: PrevalenceSeed, crawledAt: string): PanamaPhase1InsertRow {
  const pa_notes =
    `prevalence: ${s.target_disease} | ${s.metric} | source: ${s.source} | panama_specific: ${String(s.panama_specific)}`;
  return {
    product_id: s.product_id,
    market_segment: "macro",
    fob_estimated_usd: null,
    confidence: s.confidence,
    crawled_at: crawledAt,
    pa_source: "gemini_seed",
    pa_ingredient_inn: s.inn_en,
    pa_price_local: null,
    pa_notes,
  };
}

async function main(): Promise<void> {
  const path =
    process.env.PREVALENCE_SEED_PATH !== undefined &&
    process.env.PREVALENCE_SEED_PATH !== ""
      ? process.env.PREVALENCE_SEED_PATH
      : DEFAULT_SEED_PATH;

  const raw = await readFile(path, "utf-8");
  const seeds = parsePrevalenceJson(raw);
  if (seeds.length !== 9) {
    throw new Error(`시드는 9행이어야 합니다. 현재 ${String(seeds.length)}행.`);
  }

  const crawledAt = new Date().toISOString();
  const client = getSupabaseClient();

  let inserted = 0;
  for (const s of seeds) {
    const row = buildRow(s, crawledAt);
    const r = await insertRow(row);
    if (!r.ok) {
      throw new Error(
        `Round4 prevalence 적재 실패 (product_id=${s.product_id}): ${r.message}. Supabase 연결·RLS·중복 키를 확인하세요.`,
      );
    }
    inserted += 1;
  }

  const productIds = seeds.map((s) => s.product_id);
  const { count, error: countErr } = await client
    .from(PANAMA_TABLE)
    .select("*", { count: "exact", head: true })
    .in("product_id", productIds)
    .eq("pa_source", "gemini_seed")
    .eq("market_segment", "macro")
    .not("pa_ingredient_inn", "is", null)
    .ilike("pa_notes", "prevalence%");

  if (countErr !== null) {
    throw new Error(`COUNT 검증 실패: ${countErr.message}`);
  }

  process.stdout.write(
    `Inserted ${String(inserted)} rows. Verified count: ${String(count ?? 0)}\n`,
  );
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  process.stderr.write(`${msg}\n`);
  process.exit(1);
});
