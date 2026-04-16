/**
 * Round7 시드 JSON → panama_ingredient_eligibility / panama_product_registration upsert
 */
import * as fs from "node:fs/promises";
import * as path from "node:path";

import { getSupabaseClient } from "../../src/utils/db_connector";

/** 시드 파일의 성분 1행 (DB 컬럼과 대응) */
interface SeedIngredient {
  inn: string;
  inn_es: string | null;
  atc_code: string | null;
  panama_distributable: boolean;
  example_registration_no: string | null;
  registered_brand_count: number | null;
  market_status: string;
  evidence_source: string | null;
  evidence_url: string | null;
  evidence_notes: Record<string, unknown>;
  confidence: number;
}

/** 시드 파일의 제품 1행 (선택 필드 다수) */
interface SeedProduct {
  product_id: string;
  self_brand: string;
  self_inn_combined: string;
  self_concentration: string;
  self_form: string;
  is_combination: boolean;
  is_special_form?: boolean;
  special_form_type?: string | null;
  identical_set_registered?: boolean | null;
  identical_registration_no?: string | null;
  identical_examples?: unknown;
  similar_combination_exists?: boolean | null;
  similar_examples?: unknown;
  individual_ingredients_registered?: boolean | null;
  individual_examples?: unknown;
  registration_path?: string | null;
  estimated_cost_usd?: number | null;
  estimated_duration_days?: number | null;
  market_entry_priority?: number | null;
  market_entry_category?: string | null;
  evidence_source?: string | null;
  evidence_url?: string | null;
  evidence_notes?: Record<string, unknown>;
  collected_by?: string | null;
  confidence?: number | null;
}

interface SeedFile {
  ingredients: SeedIngredient[];
  products: SeedProduct[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function readSeed(): Promise<SeedFile> {
  const seedPath = path.join(process.cwd(), "data/seed/panama/round7_registration_eligibility.json");
  const raw = await fs.readFile(seedPath, "utf8");
  const parsed: unknown = JSON.parse(raw);
  if (!isRecord(parsed)) {
    throw new Error("시드 JSON 최상위가 객체가 아닙니다.");
  }
  const ingredients = parsed["ingredients"];
  const products = parsed["products"];
  if (!Array.isArray(ingredients) || !Array.isArray(products)) {
    throw new Error("시드 JSON에 ingredients / products 배열이 필요합니다.");
  }
  return { ingredients: ingredients as SeedIngredient[], products: products as SeedProduct[] };
}

function ingredientToRow(row: SeedIngredient): Record<string, unknown> {
  return {
    inn: row.inn,
    inn_es: row.inn_es,
    atc_code: row.atc_code,
    panama_distributable: row.panama_distributable,
    example_registration_no: row.example_registration_no,
    registered_brand_count: row.registered_brand_count,
    market_status: row.market_status,
    evidence_source: row.evidence_source,
    evidence_url: row.evidence_url,
    evidence_notes: row.evidence_notes,
    confidence: row.confidence,
  };
}

function productToRow(row: SeedProduct): Record<string, unknown> {
  return {
    product_id: row.product_id,
    self_brand: row.self_brand,
    self_inn_combined: row.self_inn_combined,
    self_concentration: row.self_concentration,
    self_form: row.self_form,
    is_combination: row.is_combination,
    is_special_form: row.is_special_form ?? null,
    special_form_type: row.special_form_type ?? null,
    identical_set_registered: row.identical_set_registered ?? null,
    identical_registration_no: row.identical_registration_no ?? null,
    identical_examples: row.identical_examples ?? null,
    similar_combination_exists: row.similar_combination_exists ?? null,
    similar_examples: row.similar_examples ?? null,
    individual_ingredients_registered: row.individual_ingredients_registered ?? null,
    individual_examples: row.individual_examples ?? null,
    registration_path: row.registration_path ?? null,
    estimated_cost_usd: row.estimated_cost_usd ?? null,
    estimated_duration_days: row.estimated_duration_days ?? null,
    market_entry_priority: row.market_entry_priority ?? null,
    market_entry_category: row.market_entry_category ?? null,
    evidence_source: row.evidence_source ?? null,
    evidence_url: row.evidence_url ?? null,
    evidence_notes: row.evidence_notes ?? {},
    collected_by: row.collected_by ?? null,
    confidence: row.confidence ?? null,
  };
}

export async function insertPanamaRegistrationFromSeed(): Promise<{
  ingredientUpsertCount: number;
  productUpsertCount: number;
  ingredientErrors: string[];
  productErrors: string[];
}> {
  const seed = await readSeed();
  const sb = getSupabaseClient();
  let ingredientUpsertCount = 0;
  let productUpsertCount = 0;
  const ingredientErrors: string[] = [];
  const productErrors: string[] = [];

  for (const ing of seed.ingredients) {
    try {
      const { error } = await sb
        .from("panama_ingredient_eligibility")
        .upsert(ingredientToRow(ing), { onConflict: "inn" });
      if (error !== null) {
        throw new Error(error.message);
      }
      ingredientUpsertCount += 1;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      ingredientErrors.push(`[${ing.inn}] ${message}`);
    }
  }

  for (const prod of seed.products) {
    try {
      const { error } = await sb
        .from("panama_product_registration")
        .upsert(productToRow(prod), { onConflict: "product_id" });
      if (error !== null) {
        throw new Error(error.message);
      }
      productUpsertCount += 1;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      productErrors.push(`[${prod.product_id}] ${message}`);
    }
  }

  return {
    ingredientUpsertCount,
    productUpsertCount,
    ingredientErrors,
    productErrors,
  };
}

async function main(): Promise<void> {
  try {
    const summary = await insertPanamaRegistrationFromSeed();
    console.log("\n=== Round7 등록·유통 시드 적재 ===");
    console.log(`panama_ingredient_eligibility upsert: ${summary.ingredientUpsertCount}`);
    console.log(`panama_product_registration upsert: ${summary.productUpsertCount}`);
    if (summary.ingredientErrors.length > 0) {
      console.log("ingredient errors:");
      for (const err of summary.ingredientErrors) {
        console.log(`  - ${err}`);
      }
    }
    if (summary.productErrors.length > 0) {
      console.log("product errors:");
      for (const err of summary.productErrors) {
        console.log(`  - ${err}`);
      }
    }
    if (summary.ingredientErrors.length > 0 || summary.productErrors.length > 0) {
      process.exitCode = 1;
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      `[insert_panama_registration] 시드 적재 실패: ${message}. .env의 SUPABASE_URL/SUPABASE_KEY와 테이블 존재 여부를 확인하세요.`,
    );
    process.exitCode = 1;
  }
}

if (process.argv[1] !== undefined && process.argv[1].endsWith("insert_panama_registration.ts")) {
  void main();
}
