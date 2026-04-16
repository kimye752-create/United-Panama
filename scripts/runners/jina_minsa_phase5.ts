import * as path from "node:path";

import { getSupabaseClient } from "../../src/utils/db_connector";
import { TARGET_PRODUCTS } from "../../src/utils/product-dictionary";
import { OUTPUT_DIR, SELF_INNS_ES, readJsonFile, writeJsonFile } from "./jina_minsa_shared";

interface ExtractedRegistration {
  product: string;
  inn: string;
  source_file: string;
  registration_numbers: string[];
  context_snippets: string[];
}

interface IngredientEligibilityUpsertRow {
  inn: string;
  panama_distributable: boolean;
  market_status: string;
  example_registration_no: string | null;
  evidence_notes: Record<string, unknown>;
  updated_at: string;
}

interface ProductRegistrationUpsertRow {
  product_id: string;
  identical_set_registered: boolean;
  similar_combination_exists: boolean;
  identical_registration_no: string | null;
  identical_examples: string[];
  similar_examples: string[];
  estimated_duration_days: number;
  estimated_cost_usd: number;
  registration_path: string;
  evidence_notes: Record<string, unknown>;
  updated_at: string;
}

interface Phase5Summary {
  generated_at: string;
  ingredient_upsert_count: number;
  product_upsert_count: number;
  ingredient_errors: string[];
  product_errors: string[];
}

function normalizeInnKey(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function buildEvidence(
  sourceFile: string | null,
  registrationNumbers: string[],
  contextSnippets: string[],
): Record<string, unknown> {
  return {
    primary_source_url: "https://r.jina.ai/https://www.minsa.gob.pa",
    collection_method: "jina_reader_uncensored_fetch",
    collection_date: new Date().toISOString(),
    registrations_extracted: registrationNumbers,
    source_text_file: sourceFile,
    context_snippets: contextSnippets.slice(0, 3),
  };
}

export async function runPhase5(): Promise<Phase5Summary> {
  const phase4Path = path.join(OUTPUT_DIR, "_phase4_registrations.json");
  let phase4Result: ExtractedRegistration[] = [];
  try {
    phase4Result = await readJsonFile<ExtractedRegistration[]>(phase4Path);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[Phase5] Phase4 결과 없음: ${message}. 빈 근거로 진행합니다.`);
  }

  const registrationByInn = new Map<string, ExtractedRegistration>();
  for (const item of phase4Result) {
    registrationByInn.set(normalizeInnKey(item.inn.replace(/_/g, " ")), item);
  }

  const ingredientRows: IngredientEligibilityUpsertRow[] = [];
  for (const innItem of SELF_INNS_ES) {
    const key = normalizeInnKey(innItem.inn);
    const found = registrationByInn.get(key);
    const regs = found?.registration_numbers ?? [];
    ingredientRows.push({
      inn: innItem.inn,
      panama_distributable: regs.length > 0,
      market_status: regs.length > 0 ? "available" : "unknown",
      example_registration_no: regs[0] ?? null,
      evidence_notes: buildEvidence(
        found?.source_file ?? null,
        regs,
        found?.context_snippets ?? [],
      ),
      updated_at: new Date().toISOString(),
    });
  }

  const productRows: ProductRegistrationUpsertRow[] = [];
  for (const product of TARGET_PRODUCTS) {
    const productInnParts = product.who_inn_en
      .split("+")
      .map((part) => normalizeInnKey(part))
      .filter((part) => part !== "");
    const matchedRegistrations: string[] = [];
    const matchedSources: string[] = [];
    for (const part of productInnParts) {
      const source = SELF_INNS_ES.find(
        (x) => normalizeInnKey(x.inn) === normalizeInnKey(part),
      );
      const found = source ? registrationByInn.get(normalizeInnKey(source.inn)) : undefined;
      if (found !== undefined) {
        matchedRegistrations.push(...found.registration_numbers);
        matchedSources.push(found.source_file);
      }
    }
    const dedupRegs = [...new Set(matchedRegistrations)];
    const isRegistered = dedupRegs.length > 0;
    const isCombo = product.is_combination_drug === true;
    productRows.push({
      product_id: product.product_id,
      identical_set_registered: isRegistered && isCombo,
      similar_combination_exists: isRegistered && !isCombo,
      identical_registration_no: dedupRegs[0] ?? null,
      identical_examples: dedupRegs,
      similar_examples: dedupRegs,
      estimated_duration_days: isRegistered ? 35 : 45,
      estimated_cost_usd: 500,
      registration_path: "wla_korea_fast",
      evidence_notes: buildEvidence(
        matchedSources[0] ?? null,
        dedupRegs,
        [],
      ),
      updated_at: new Date().toISOString(),
    });
  }

  const sb = getSupabaseClient();
  let ingredientUpsertCount = 0;
  let productUpsertCount = 0;
  const ingredientErrors: string[] = [];
  const productErrors: string[] = [];

  for (const row of ingredientRows) {
    try {
      const { error } = await sb
        .from("panama_ingredient_eligibility")
        .upsert(row, { onConflict: "inn" });
      if (error !== null) {
        throw new Error(error.message);
      }
      ingredientUpsertCount += 1;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      ingredientErrors.push(`[${row.inn}] ${message}`);
    }
  }

  for (const row of productRows) {
    try {
      const { error } = await sb
        .from("panama_product_registration")
        .upsert(row, { onConflict: "product_id" });
      if (error !== null) {
        throw new Error(error.message);
      }
      productUpsertCount += 1;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      productErrors.push(`[${row.product_id}] ${message}`);
    }
  }

  const summary: Phase5Summary = {
    generated_at: new Date().toISOString(),
    ingredient_upsert_count: ingredientUpsertCount,
    product_upsert_count: productUpsertCount,
    ingredient_errors: ingredientErrors,
    product_errors: productErrors,
  };
  await writeJsonFile(path.join(OUTPUT_DIR, "_phase5_summary.json"), summary);
  return summary;
}

async function main(): Promise<void> {
  const summary = await runPhase5();
  console.log("\n=== Phase 5 결과 ===");
  console.log(`panama_ingredient_eligibility upsert: ${summary.ingredient_upsert_count}`);
  console.log(`panama_product_registration upsert: ${summary.product_upsert_count}`);
  if (summary.ingredient_errors.length > 0) {
    console.log("ingredient errors:");
    for (const error of summary.ingredient_errors) {
      console.log(`  - ${error}`);
    }
  }
  if (summary.product_errors.length > 0) {
    console.log("product errors:");
    for (const error of summary.product_errors) {
      console.log(`  - ${error}`);
    }
  }
}

if (process.argv[1] !== undefined && process.argv[1].endsWith("jina_minsa_phase5.ts")) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[Phase5][fatal] ${message}`);
    process.exitCode = 1;
  });
}
