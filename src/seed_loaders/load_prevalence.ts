/**
 * Round4 prevalence 8행 + 거시 인프라 1행 — panama 적재 (pa_source: gemini_prevalence)
 */
/// <reference types="node" />

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildPaNotesForMacroInfra,
  buildPaNotesForPrevalenceEntry,
  parseRound4PrevalenceFile,
  type PrevalenceEntry,
  type MacroHealthcareInfraEntry,
} from "../logic/prevalence_seed_build.js";
import { insertRow, type PanamaPhase1InsertRow } from "../utils/db_connector.js";

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

const PA_SOURCE_PREVALENCE = "gemini_prevalence" as const;

function buildDrugRow(
  e: PrevalenceEntry,
  crawledAt: string,
): PanamaPhase1InsertRow {
  return {
    product_id: e.product_id,
    market_segment: "macro",
    fob_estimated_usd: null,
    confidence: 0.85,
    crawled_at: crawledAt,
    pa_source: PA_SOURCE_PREVALENCE,
    pa_ingredient_inn: e.who_inn_en,
    pa_price_local: null,
    pa_notes: buildPaNotesForPrevalenceEntry(e),
    pa_source_url: e.source_url,
    pa_collected_at: String(e.prevalence_year),
  };
}

function buildMacroRow(
  e: MacroHealthcareInfraEntry,
  crawledAt: string,
): PanamaPhase1InsertRow {
  return {
    product_id: e.product_id,
    market_segment: "macro",
    fob_estimated_usd: null,
    confidence: 0.9,
    crawled_at: crawledAt,
    pa_source: PA_SOURCE_PREVALENCE,
    pa_ingredient_inn: e.who_inn_en,
    pa_price_local: null,
    pa_notes: buildPaNotesForMacroInfra(e),
    pa_source_url: e.source_url,
    pa_collected_at: String(e.prevalence_year),
  };
}

export async function loadRound4PrevalenceFromPath(
  path: string,
): Promise<{ inserted: number }> {
  const rawText = await readFile(path, "utf-8");
  const parsed = parseRound4PrevalenceFile(JSON.parse(rawText) as unknown);
  const crawledAt = new Date().toISOString();
  let inserted = 0;
  for (const e of parsed.entries) {
    const row = buildDrugRow(e, crawledAt);
    const r = await insertRow(row);
    if (!r.ok) {
      throw new Error(
        `Round4 prevalence 적재 실패 (product_id=${e.product_id}): ${r.message}`,
      );
    }
    inserted += 1;
  }
  const macro = buildMacroRow(parsed.macro_healthcare_infra, crawledAt);
  const mr = await insertRow(macro);
  if (!mr.ok) {
    throw new Error(
      `macro_healthcare_infra 적재 실패: ${mr.message}`,
    );
  }
  inserted += 1;
  return { inserted };
}
