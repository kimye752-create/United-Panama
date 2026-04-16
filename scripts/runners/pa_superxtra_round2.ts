/**
 * Super Xtra VTEX — Round2 키워드만 재검색, JSON 저장만 (Supabase INSERT 없음)
 */
/// <reference types="node" />

import { setTimeout as delay } from "node:timers/promises";
import * as fs from "node:fs/promises";
import * as path from "node:path";

const BASE = "https://www.superxtra.com";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const POLITE_MS = 2000;
const MAX_SKUS = 50;

type VtexRaw = Record<string, unknown>;

const SEARCH_GROUPS: readonly {
  readonly theme: string;
  readonly keywords: readonly string[];
}[] = [
  { theme: "mosapride", keywords: ["mosaprida", "gastrointestinal procinetico"] },
  { theme: "omega3_rx", keywords: ["omacor", "lovaza", "omega-3 receta"] },
  { theme: "gadobutrol", keywords: ["gadobutrol", "gadovist"] },
] as const;

async function fetchJson(url: string): Promise<{ status: number; data: unknown }> {
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": UA,
    },
  });
  const data = (await res.json()) as unknown;
  return { status: res.status, data };
}

async function fetchSearchByFt(keyword: string): Promise<VtexRaw[]> {
  const url = `${BASE}/api/catalog_system/pub/products/search?ft=${encodeURIComponent(keyword)}&_from=0&_to=49`;
  const { status, data } = await fetchJson(url);
  if (status >= 400) {
    throw new Error(`HTTP ${String(status)} ${url}`);
  }
  if (!Array.isArray(data)) {
    return [];
  }
  return data as VtexRaw[];
}

function skuKey(p: VtexRaw): string {
  const id = p.productId;
  return typeof id === "number" || typeof id === "string" ? String(id) : "";
}

function summarize(p: VtexRaw): Record<string, unknown> {
  return {
    productId: p.productId ?? null,
    productName: p.productName ?? null,
    brand: p.brand ?? null,
    linkText: p.linkText ?? null,
  };
}

async function main(): Promise<void> {
  const outDir = path.join(process.cwd(), "data", "raw", "panama_superxtra");
  await fs.mkdir(outDir, { recursive: true });

  const byId = new Map<string, { theme: string; keyword: string; product: VtexRaw }>();
  const searchLog: Array<{ theme: string; keyword: string; rowCount: number }> = [];

  outer: for (const group of SEARCH_GROUPS) {
    for (const keyword of group.keywords) {
      if (byId.size >= MAX_SKUS) {
        break outer;
      }
      await delay(POLITE_MS);
      const rows = await fetchSearchByFt(keyword);
      searchLog.push({ theme: group.theme, keyword, rowCount: rows.length });
      for (const row of rows) {
        if (byId.size >= MAX_SKUS) {
          break outer;
        }
        const id = skuKey(row);
        if (id === "") {
          continue;
        }
        if (!byId.has(id)) {
          byId.set(id, { theme: group.theme, keyword, product: row });
        }
      }
    }
  }

  const products = [...byId.entries()].map(([productId, meta]) => ({
    productId,
    matched_theme: meta.theme,
    matched_keyword: meta.keyword,
    summary: summarize(meta.product),
  }));

  const outPath = path.join(outDir, "round2_gemini_verified.json");
  await fs.writeFile(
    outPath,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        max_skus: MAX_SKUS,
        collected: products.length,
        primary_source_strength_hint: "high",
        note: "VTEX 검색 API = 소매 카탈로그 1차 출처. DB INSERT 없음.",
        search_log: searchLog,
        products,
      },
      null,
      2,
    ),
    "utf-8",
  );
  console.log(`[pa_superxtra_round2] ${String(products.length)} SKU → ${outPath}`);
}

if (process.argv[1] !== undefined && process.argv[1].endsWith("pa_superxtra_round2.ts")) {
  main().catch((e: unknown) => {
    console.error(`[pa_superxtra_round2] ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  });
}
