/**
 * Super Xtra VTEX catalog API — 신 8제품 키워드 매칭 dry-run (DB·INSERT 없음)
 * 검색어: `ocdsSearchTermsForProduct` (pa_panamacompra.ts)와 동일
 */
/// <reference types="node" />

import { setTimeout as delay } from "node:timers/promises";

import {
  ocdsSearchTermsForProduct,
} from "../../src/crawlers/preload/pa_panamacompra.js";
import {
  findProductByPanamaText,
  TARGET_PRODUCTS,
  type ProductMaster,
} from "../../src/utils/product-dictionary.js";
import { resolveSuperXtraProduct } from "../../src/utils/superxtra_product_matcher.js";

const BASE = "https://www.superxtra.com";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const POLITE_MS = 2000;

type VtexRaw = Record<string, unknown>;

function sleepPolite(): Promise<void> {
  return delay(POLITE_MS);
}

function getPrice(p: VtexRaw): number | null {
  const items = p.items;
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }
  const first = items[0] as Record<string, unknown>;
  const sellers = first.sellers;
  if (!Array.isArray(sellers) || sellers.length === 0) {
    return null;
  }
  const offer = (sellers[0] as Record<string, unknown>).commertialOffer as
    | Record<string, unknown>
    | undefined;
  const price = offer?.Price;
  return typeof price === "number" && Number.isFinite(price) ? price : null;
}

function productBlob(p: VtexRaw): string {
  const name = typeof p.productName === "string" ? p.productName : "";
  const desc = typeof p.description === "string" ? p.description : "";
  return `${name}\n${desc}`;
}

/** 기존 키워드 순서 매칭(교정 전 비교용) */
function matchesOurProductLegacy(p: VtexRaw, target: ProductMaster): boolean {
  const resolved = findProductByPanamaText(productBlob(p));
  return resolved !== undefined && resolved.product_id === target.product_id;
}

/** SKU별 우선순위 룰(교정 후) */
function matchesOurProductResolved(p: VtexRaw, target: ProductMaster): boolean {
  const name = typeof p.productName === "string" ? p.productName : "";
  const desc = typeof p.description === "string" ? p.description : "";
  const id = resolveSuperXtraProduct(name, desc);
  return id === target.product_id;
}

async function fetchJson(url: string): Promise<{
  status: number;
  data: unknown;
  resourcesHeader: string | null;
}> {
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": UA,
    },
  });
  const resourcesHeader = res.headers.get("resources");
  const data = (await res.json()) as unknown;
  return { status: res.status, data, resourcesHeader };
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

async function main(): Promise<void> {
  const categoryUrl = `${BASE}/api/catalog_system/pub/products/search/xtra-farmacia/medicamentos?_from=0&_to=4`;
  const subcatUrl = `${BASE}/api/catalog_system/pub/products/search/xtra-farmacia/medicamentos/trigliceridos-y-colesterol?_from=0&_to=4`;

  const catProbe = await fetchJson(categoryUrl);
  await sleepPolite();
  const subProbe = await fetchJson(subcatUrl);

  const resourcesCat = catProbe.resourcesHeader ?? "";
  const totalMedicamentos =
    /^(\d+)-(\d+)\/(\d+)/.exec(resourcesCat) !== null
      ? Number(/^(\d+)-(\d+)\/(\d+)/.exec(resourcesCat)?.[3] ?? "0")
      : null;

  const perProduct: Array<{
    brandName: string;
    productId: string;
    keywordsUsed: string[];
    apiRowsReturnedApprox: number;
    matchedCountBefore: number;
    matchedCountAfter: number;
    minPrice: number | null;
    maxPrice: number | null;
    samples: Array<{ name: string; price: number | null }>;
  }> = [];

  for (const product of TARGET_PRODUCTS) {
    const terms = ocdsSearchTermsForProduct(product);
    const seenLegacy = new Set<string>();
    const seenResolved = new Set<string>();
    const matchedLegacy: VtexRaw[] = [];
    const matchedResolved: VtexRaw[] = [];
    let rowsApprox = 0;

    for (const kw of terms) {
      await sleepPolite();
      const rows = await fetchSearchByFt(kw);
      rowsApprox += rows.length;
      for (const row of rows) {
        const pid = String(row.productId ?? "");
        if (pid === "") {
          continue;
        }
        if (matchesOurProductLegacy(row, product)) {
          if (!seenLegacy.has(pid)) {
            seenLegacy.add(pid);
            matchedLegacy.push(row);
          }
        }
        if (matchesOurProductResolved(row, product)) {
          if (!seenResolved.has(pid)) {
            seenResolved.add(pid);
            matchedResolved.push(row);
          }
        }
      }
    }

    const prices = matchedResolved
      .map((m) => getPrice(m))
      .filter((n): n is number => n !== null);
    const minP = prices.length > 0 ? Math.min(...prices) : null;
    const maxP = prices.length > 0 ? Math.max(...prices) : null;

    const samples = matchedResolved.slice(0, 3).map((m) => ({
      name: String(m.productName ?? "").slice(0, 120),
      price: getPrice(m),
    }));

    perProduct.push({
      brandName: product.kr_brand_name,
      productId: product.product_id,
      keywordsUsed: terms,
      apiRowsReturnedApprox: rowsApprox,
      matchedCountBefore: matchedLegacy.length,
      matchedCountAfter: matchedResolved.length,
      minPrice: minP,
      maxPrice: maxP,
      samples,
    });
  }

  const totalMatchedBefore = perProduct.reduce(
    (a, x) => a + x.matchedCountBefore,
    0,
  );
  const totalMatchedAfter = perProduct.reduce(
    (a, x) => a + x.matchedCountAfter,
    0,
  );

  process.stdout.write(
    JSON.stringify(
      {
        summary: {
          totalSkuMatchesLegacy: totalMatchedBefore,
          totalSkuMatchesResolved: totalMatchedAfter,
        },
        probes: {
          medicamentosCategory: {
            url: categoryUrl,
            httpStatus: catProbe.status,
            resourcesHeader: catProbe.resourcesHeader,
            totalInCategoryFromResources: totalMedicamentos,
            sampleProductFields: [
              "productId",
              "productName",
              "items[].sellers[].commertialOffer.Price (typo commertial)",
            ],
          },
          trigliceridosSubcategory: {
            url: subcatUrl,
            httpStatus: subProbe.status,
            resourcesHeader: subProbe.resourcesHeader,
          },
        },
        politeDelayMs: POLITE_MS,
        perProduct,
      },
      null,
      2,
    ) + "\n",
  );
}

main().catch((e: unknown) => {
  process.stderr.write(`${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
