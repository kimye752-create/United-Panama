/**
 * Super Xtra VTEX → panama INSERT (resolveSuperXtraProduct + 가격·건기식 필터)
 */
/// <reference types="node" />

import { setTimeout as delay } from "node:timers/promises";

import { ocdsSearchTermsForProduct } from "../../src/crawlers/preload/pa_panamacompra.js";
import { getSupabaseClient, insertRow } from "../../src/utils/db_connector.js";
import {
  exceedsUsdUnitCap,
  isOmethylSupplementBlacklistProductName,
} from "../../src/utils/competitor_price_filters.js";
import {
  findProductById,
  TARGET_PRODUCTS,
} from "../../src/utils/product-dictionary.js";
import {
  innUpperForSuperXtraProductId,
  resolveSuperXtraProduct,
} from "../../src/utils/superxtra_product_matcher.js";
import {
  vtexAvailableQuantity,
  vtexFirstCategoryName,
  vtexListPriceUsd,
  vtexMeasurementUnit,
  vtexPriceUsd,
  vtexProductIdString,
  vtexStoreSlug,
  type VtexProduct,
} from "../../src/utils/vtex_product_helpers.js";

const BASE = "https://www.superxtra.com";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const POLITE_MS = 2000;
const PA_SOURCE = "superxtra_vtex" as const;
const OMETHYL_ID = "f88b87b8-c0ab-4f6e-ba34-e9330d1d4e18";

function sleepPolite(): Promise<void> {
  return delay(POLITE_MS);
}

function inferPremiumGrade(productName: string): "generic" | "original_brand" {
  const b = productName
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
  const brands = [
    "crestor",
    "lipitor",
    "omacor",
    "vascepa",
    "pletal",
    "seretide",
  ];
  for (const x of brands) {
    if (b.includes(x)) {
      return "original_brand";
    }
  }
  if (
    /\bmk\b/.test(b) ||
    b.includes("normon") ||
    b.includes("genfar") ||
    b.includes("la sante") ||
    b.includes("generico")
  ) {
    return "generic";
  }
  return "generic";
}

function dedupKey(productName: string, inn: string): string {
  return `${productName.trim()}\t${inn.trim()}`.toLowerCase();
}

async function fetchSearchByFt(keyword: string): Promise<VtexProduct[]> {
  const url = `${BASE}/api/catalog_system/pub/products/search?ft=${encodeURIComponent(keyword)}&_from=0&_to=49`;
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": UA },
    });
    if (res.status >= 400) {
      throw new Error(`Super Xtra HTTP ${String(res.status)}: ${url}`);
    }
    const data = (await res.json()) as unknown;
    return Array.isArray(data) ? (data as VtexProduct[]) : [];
  } catch (error: unknown) {
    throw new Error(
      `Super Xtra 검색 실패(네트워크·차단 가능): ${error instanceof Error ? error.message : String(error)}. VPN·UA·간격을 확인하세요.`,
    );
  }
}

async function loadExistingDedupKeys(): Promise<Set<string>> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("panama")
    .select("pa_product_name_local, pa_ingredient_inn")
    .eq("pa_source", PA_SOURCE);
  if (error !== null) {
    throw new Error(
      `기존 superxtra_vtex 행 조회 실패: ${error.message}. RLS·컬럼명을 확인하세요.`,
    );
  }
  const set = new Set<string>();
  for (const row of data ?? []) {
    const r = row as {
      pa_product_name_local: string | null;
      pa_ingredient_inn: string | null;
    };
    const n = r.pa_product_name_local ?? "";
    const inn = r.pa_ingredient_inn ?? "";
    set.add(dedupKey(n, inn));
  }
  return set;
}

async function main(): Promise<void> {
  const collected = new Map<string, VtexProduct>();
  for (const product of TARGET_PRODUCTS) {
    const terms = ocdsSearchTermsForProduct(product);
    for (const kw of terms) {
      await sleepPolite();
      const rows = await fetchSearchByFt(kw);
      for (const row of rows) {
        const pid = vtexProductIdString(row);
        if (pid !== "") {
          collected.set(pid, row);
        }
      }
    }
  }

  const existingKeys = await loadExistingDedupKeys();
  const batchSeen = new Set<string>(existingKeys);

  const stats = {
    collected: collected.size,
    inserted: 0,
    skip_no_match: 0,
    skip_price_le_zero: 0,
    skip_price_cap: 0,
    skip_omethyl_blacklist: 0,
    skip_duplicate: 0,
    skip_insert_fail: 0,
  };

  const crawledAt = new Date().toISOString();
  const collectedAt = crawledAt;

  for (const [, p] of collected) {
    const name = typeof p.productName === "string" ? p.productName : "";
    const desc = typeof p.description === "string" ? p.description : "";
    const productId = resolveSuperXtraProduct(name, desc);
    if (productId === null) {
      stats.skip_no_match += 1;
      continue;
    }

    const price = vtexPriceUsd(p);
    if (price === null || price <= 0) {
      stats.skip_price_le_zero += 1;
      continue;
    }

    if (exceedsUsdUnitCap(productId, price)) {
      stats.skip_price_cap += 1;
      continue;
    }

    if (
      productId === OMETHYL_ID &&
      isOmethylSupplementBlacklistProductName(name)
    ) {
      stats.skip_omethyl_blacklist += 1;
      continue;
    }

    const inn = innUpperForSuperXtraProductId(productId);
    const dk = dedupKey(name, inn);
    if (batchSeen.has(dk)) {
      stats.skip_duplicate += 1;
      continue;
    }

    const master = findProductById(productId);
    const matchType =
      master?.is_combination_drug === true
        ? "competitor_same_combo"
        : "competitor_same_atc4";

    const listP = vtexListPriceUsd(p);
    const hasDiscount =
      listP !== null && listP > price + 1e-6;
    const paPriceType = hasDiscount ? "retail_promo" : "retail_normal";

    const slug = vtexStoreSlug(p);
    const paUrl =
      slug !== "" ? `${BASE}/${slug}/p` : `${BASE}/p`;

    const qty = vtexAvailableQuantity(p);
    const stock = qty > 0 ? "in_stock" : "out_of_stock";

    const premium = inferPremiumGrade(name);

    const notes = {
      self_inn_target: master?.who_inn_en ?? "",
      self_inn_atc4: master?.atc4_code ?? "",
      match_type: matchType,
      premium_grade: premium,
      list_price: listP,
      discount_price: hasDiscount ? price : null,
      vtex_product_id: vtexProductIdString(p),
      vtex_category: vtexFirstCategoryName(p),
    };

    const result = await insertRow({
      product_id: productId,
      market_segment: "private",
      fob_estimated_usd: null,
      confidence: 0.8,
      crawled_at: crawledAt,
      pa_source: PA_SOURCE,
      pa_source_url: paUrl,
      pa_collected_at: collectedAt,
      pa_product_name_local: name,
      pa_ingredient_inn: inn,
      pa_price_type: paPriceType,
      pa_price_local: price,
      pa_currency_unit: "USD",
      pa_package_unit: vtexMeasurementUnit(p),
      pa_stock_status: stock,
      pa_notes: JSON.stringify(notes),
    });

    if (result.ok) {
      stats.inserted += 1;
      batchSeen.add(dk);
    } else {
      stats.skip_insert_fail += 1;
    }
  }

  process.stdout.write(JSON.stringify({ pa_source: PA_SOURCE, stats }, null, 2) + "\n");
}

main().catch((e: unknown) => {
  process.stderr.write(`${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
