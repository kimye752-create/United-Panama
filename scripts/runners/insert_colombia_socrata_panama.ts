/**
 * Colombia datos.gov.co Socrata → panama INSERT (resolveCompetitorProduct + USD 필터)
 */
/// <reference types="node" />

import { setTimeout as delay } from "node:timers/promises";

import { COLOMBIA_SOCRATA_BLOCKS } from "../../src/utils/colombia_socrata_blocks.js";
import {
  exceedsUsdUnitCap,
  isOmethylSupplementBlacklistProductName,
} from "../../src/utils/competitor_price_filters.js";
import { getSupabaseClient, insertRow } from "../../src/utils/db_connector.js";
import { findProductById } from "../../src/utils/product-dictionary.js";
import {
  innUpperForSuperXtraProductId,
  resolveCompetitorProduct,
} from "../../src/utils/superxtra_product_matcher.js";

const SOCRATA_URL = "https://www.datos.gov.co/resource/3t73-n4q9.json";
const DATASET_PAGE =
  "https://www.datos.gov.co/Salud-y-Protecci-n-Social/Precios-Medicamentos/3t73-n4q9";
const COP_PER_USD = 4000;
const POLITE_MS = 2000;
const PA_SOURCE = "datos_gov_co" as const;
const OMETHYL_ID = "f88b87b8-c0ab-4f6e-ba34-e9330d1d4e18";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

type SocrataRow = Record<string, unknown>;

function sleepPolite(): Promise<void> {
  return delay(POLITE_MS);
}

function rowKey(r: SocrataRow): string {
  return [
    String(r.principio_activo ?? ""),
    String(r.concentracion ?? ""),
    String(r.nombre_comercial ?? ""),
    String(r.fabricante ?? ""),
  ].join("|");
}

function parsePrecioCOP(r: SocrataRow): number | null {
  const raw = r.precio_por_tableta;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw;
  }
  if (typeof raw === "string") {
    const n = Number.parseFloat(raw.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function inferPremiumGradeNombre(nombre: string): "generic" | "original_brand" {
  const b = nombre
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

async function fetchByQ(q: string, limit: number): Promise<SocrataRow[]> {
  const u = new URL(SOCRATA_URL);
  u.searchParams.set("$q", q);
  u.searchParams.set("$limit", String(limit));
  try {
    const res = await fetch(u.toString(), {
      headers: { Accept: "application/json", "User-Agent": UA },
    });
    if (!res.ok) {
      throw new Error(`Socrata HTTP ${String(res.status)} ${u.toString()}`);
    }
    const data = (await res.json()) as unknown;
    return Array.isArray(data) ? (data as SocrataRow[]) : [];
  } catch (error: unknown) {
    throw new Error(
      `Colombia Socrata 조회 실패: ${error instanceof Error ? error.message : String(error)}. 네트워크·엔드포인트를 확인하세요.`,
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
    throw new Error(`기존 datos_gov_co 행 조회 실패: ${error.message}`);
  }
  const set = new Set<string>();
  for (const row of data ?? []) {
    const r = row as {
      pa_product_name_local: string | null;
      pa_ingredient_inn: string | null;
    };
    set.add(dedupKey(r.pa_product_name_local ?? "", r.pa_ingredient_inn ?? ""));
  }
  return set;
}

async function main(): Promise<void> {
  const merged = new Map<string, SocrataRow>();
  for (const block of COLOMBIA_SOCRATA_BLOCKS) {
    for (const kw of block.keywords) {
      await sleepPolite();
      const rows = await fetchByQ(kw, 50);
      for (const r of rows) {
        merged.set(rowKey(r), r);
      }
    }
  }

  const existingKeys = await loadExistingDedupKeys();
  const batchSeen = new Set<string>(existingKeys);

  const stats = {
    merged_rows: merged.size,
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

  for (const r of merged.values()) {
    const pa = String(r.principio_activo ?? "");
    const nombre = String(r.nombre_comercial ?? "");
    const combined = `${pa}\n${nombre}`;
    const productId = resolveCompetitorProduct(combined);
    if (productId === null) {
      stats.skip_no_match += 1;
      continue;
    }

    const cop = parsePrecioCOP(r);
    if (cop === null || cop <= 0) {
      stats.skip_price_le_zero += 1;
      continue;
    }
    const usd = cop / COP_PER_USD;
    if (exceedsUsdUnitCap(productId, usd)) {
      stats.skip_price_cap += 1;
      continue;
    }

    const localName = nombre.trim() !== "" ? nombre : pa;
    if (
      productId === OMETHYL_ID &&
      isOmethylSupplementBlacklistProductName(localName)
    ) {
      stats.skip_omethyl_blacklist += 1;
      continue;
    }

    const inn = innUpperForSuperXtraProductId(productId);
    const dk = dedupKey(localName, inn);
    if (batchSeen.has(dk)) {
      stats.skip_duplicate += 1;
      continue;
    }

    const master = findProductById(productId);
    const matchType =
      master?.is_combination_drug === true
        ? "competitor_same_combo"
        : "competitor_same_atc4";

    const notes = {
      self_inn_target: master?.who_inn_en ?? "",
      self_inn_atc4: master?.atc4_code ?? "",
      match_type: matchType,
      premium_grade: inferPremiumGradeNombre(localName),
      exchange_rate_used: COP_PER_USD,
      who_erp_guideline: true,
      fabricante: String(r.fabricante ?? ""),
      principio_activo: pa,
      concentracion: String(r.concentracion ?? ""),
      precio_cop_por_tableta: cop,
      socrata_row_key: rowKey(r),
    };

    const result = await insertRow({
      product_id: productId,
      market_segment: "public",
      fob_estimated_usd: null,
      confidence: 0.85,
      crawled_at: crawledAt,
      pa_source: PA_SOURCE,
      pa_source_url: DATASET_PAGE,
      pa_collected_at: collectedAt,
      pa_product_name_local: localName,
      pa_ingredient_inn: inn,
      pa_price_type: "wholesale",
      pa_price_local: usd,
      pa_currency_unit: "USD",
      pa_package_unit: "tablet",
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
