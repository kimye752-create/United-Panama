/**
 * Arrocha — Shopify Search Suggest API → panama (세션 17 v2)
 * pa_source: arrocha_shopify_api / market_segment: private_retail / USD=PAB 1:1
 *
 * 사전 검증: suggest.json 은 200·JSON이나 products[] 가 빈 배열일 수 있음(EasyLockdown·지역).
 * 선택: .env ARROCHA_SESSION_COOKIE 로 로그인 세션 전달 시 결과 개선 가능.
 */
/// <reference types="node" />

import { BaseCrawler, type CrawlRowData, type CrawlRunResult } from "../base/BaseCrawler.js";
import {
  TARGET_PRODUCTS,
  type ProductMaster,
} from "../../utils/product-dictionary.js";

/** 스페인어·약어 → 정규 제형 토큰 */
const FORM_MAP: Readonly<Record<string, string>> = {
  tablet: "tablet",
  capsule: "capsule",
  softgel: "capsule",
  tableta: "tablet",
  tab: "tablet",
  comp: "tablet",
  comprimido: "tablet",
  "cápsula": "capsule",
  capsula: "capsule",
  cap: "capsule",
  jarabe: "syrup",
  jbe: "syrup",
  suspensión: "suspension",
  suspension: "suspension",
  susp: "suspension",
  gotas: "drops",
  inyectable: "injection",
  amp: "injection",
  ampolla: "injection",
} as const;

const PA_SOURCE = "arrocha_shopify_api" as const;
const BASE_URL = "https://arrocha.com";
const SUGGEST_PATH = "/search/suggest.json";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/** Shopify suggest — resources.results.products */
interface ShopifySuggestProduct {
  title?: string;
  url?: string;
  price?: string;
  price_min?: number;
  type?: string;
  handle?: string;
}

interface ShopifySuggestResources {
  results?: {
    products?: ReadonlyArray<ShopifySuggestProduct>;
  };
}

interface ShopifySuggestResponse {
  resources?: ShopifySuggestResources;
}

interface ShopifyProductVariant {
  id?: number;
  title?: string;
  price?: string;
  sku?: string;
}

interface ShopifyProductBody {
  title?: string;
  body_html?: string;
  vendor?: string;
  handle?: string;
  product_type?: string;
  variants?: ReadonlyArray<ShopifyProductVariant>;
}

interface ShopifyProductJsonResponse {
  product?: ShopifyProductBody;
}

function sleepRandomBetweenInnMs(): Promise<void> {
  const ms = 1500 + Math.random() * 1500;
  return new Promise((r) => {
    setTimeout(r, ms);
  });
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/gu, " ").replace(/\s+/gu, " ").trim();
}

/** 제목·본문에서 mg/ml 패턴 추출 */
function extractStrengthMgValues(text: string): number[] {
  const out: number[] = [];
  const re = /(\d+(?:[.,]\d+)?)\s*(?:mg|MG)\b/gu;
  let m: RegExpExecArray | null = re.exec(text);
  while (m !== null) {
    const n = Number.parseFloat(m[1].replace(",", "."));
    if (Number.isFinite(n)) {
      out.push(n);
    }
    m = re.exec(text);
  }
  return out;
}

/** "x 30", "30 comp", "caja 28" 등에서 정수 개수 */
function extractPackSize(text: string): number | null {
  const lower = text.toLowerCase();
  const xMatch = /\bx\s*(\d+)\b/u.exec(lower);
  if (xMatch !== null) {
    const n = Number.parseInt(xMatch[1], 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  const cajaMatch = /(?:caja|envase|frasco)\s*(?:x\s*)?(\d+)/iu.exec(lower);
  if (cajaMatch !== null) {
    const n = Number.parseInt(cajaMatch[1], 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  return null;
}

function normalizeFormToken(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [k, v] of Object.entries(FORM_MAP)) {
    if (lower.includes(k)) {
      return v;
    }
  }
  return null;
}

function handleFromProductUrl(url: string): string | null {
  const m = /\/products\/([^/?#]+)/iu.exec(url);
  return m !== null ? decodeURIComponent(m[1]) : null;
}

async function fetchJson<T>(url: string): Promise<T | null> {
  const headers: Record<string, string> = {
    "User-Agent": USER_AGENT,
    Accept: "application/json, text/javascript, */*;q=0.1",
    "Accept-Language": "es-PA,es;q=0.9,en;q=0.8",
  };
  const cookie = process.env.ARROCHA_SESSION_COOKIE;
  if (cookie !== undefined && cookie.trim() !== "") {
    headers.Cookie = cookie.trim();
  }
  try {
    const res = await fetch(url, { headers });
    if (!res.ok) {
      return null;
    }
    return (await res.json()) as T;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    process.stderr.write(`[pa_arrocha_v2] fetch 실패 ${url}: ${msg}\n`);
    return null;
  }
}

function textMatchesProduct(blob: string, p: ProductMaster): boolean {
  const low = blob.toLowerCase();
  if (low.includes(p.who_inn_en.toLowerCase())) {
    return true;
  }
  return p.panama_search_keywords.some((k) =>
    low.includes(k.trim().toLowerCase()),
  );
}

function buildSuggestUrl(q: string): string {
  const params = new URLSearchParams();
  params.set("q", q);
  params.set("resources[type]", "product");
  params.set("resources[limit]", "10");
  return `${BASE_URL}${SUGGEST_PATH}?${params.toString()}`;
}

function parsePriceUsd(raw: string | undefined): number | null {
  if (raw === undefined || raw === "") {
    return null;
  }
  const t = raw.replace(/[^\d.,]/gu, "").replace(",", ".");
  const n = Number.parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

/**
 * 경쟁품 3단 필터: INN/키워드 → 제형(injection 제외) → 용량 숫자 1건 이상
 */
function passesCompetitorFilters(
  title: string,
  body: string,
  p: ProductMaster,
): { ok: boolean; formNorm: string | null } {
  const blob = `${title}\n${body}`;
  if (!textMatchesProduct(blob, p)) {
    return { ok: false, formNorm: null };
  }
  const formNorm = normalizeFormToken(blob);
  if (formNorm === "injection") {
    return { ok: false, formNorm };
  }
  const strengths = extractStrengthMgValues(blob);
  if (strengths.length === 0) {
    return { ok: false, formNorm };
  }
  return { ok: true, formNorm };
}

export class ArrochaShopifyV2Crawler extends BaseCrawler {
  constructor() {
    super("ArrochaShopifyV2", "static_pre_loaded", "private_retail", 0.85);
  }

  protected async crawl(): Promise<CrawlRowData[]> {
    const out: CrawlRowData[] = [];
    const collectedAt = new Date().toISOString();

    for (const p of TARGET_PRODUCTS) {
      await sleepRandomBetweenInnMs();

      let bestRow: CrawlRowData | null = null;

      for (const kw of p.panama_search_keywords) {
        const suggestUrl = buildSuggestUrl(kw);
        const sug = await fetchJson<ShopifySuggestResponse>(suggestUrl);
        const suggestItems = sug?.resources?.results?.products ?? [];

        for (const sp of suggestItems) {
          const url = sp.url ?? "";
          const title = sp.title ?? "";
          const handle =
            sp.handle ?? (url !== "" ? handleFromProductUrl(url) : null);
          if (handle === null || handle === "") {
            continue;
          }

          const productUrl = `${BASE_URL}/products/${handle}.json`;
          const detail = await fetchJson<ShopifyProductJsonResponse>(productUrl);
          const body = detail?.product;
          if (body === undefined) {
            continue;
          }

          const fullTitle = body.title ?? title;
          const html = body.body_html ?? "";
          const plain = stripHtml(html);
          const vendor = body.vendor ?? "";
          const variant0 = body.variants?.[0];
          const totalPrice = parsePriceUsd(variant0?.price ?? sp.price);

          const filter = passesCompetitorFilters(fullTitle, plain, p);
          if (!filter.ok || filter.formNorm === null) {
            continue;
          }

          const pack =
            extractPackSize(fullTitle) ??
            extractPackSize(plain) ??
            extractPackSize(variant0?.title ?? "");
          const strengths = extractStrengthMgValues(`${fullTitle}\n${plain}`);
          const strengthMg =
            strengths.length > 0 ? strengths[0] : null;

          if (strengthMg === null || pack === null || totalPrice === null) {
            continue;
          }
          if (pack <= 0) {
            continue;
          }

          const unitPrice = totalPrice / pack;

          const pa_notes = [
            `pa_brand_name_local=${vendor || fullTitle.slice(0, 80)}`,
            `pa_manufacturer=${vendor}`,
            `pa_form=${filter.formNorm}`,
            `pa_strength_mg=${String(strengthMg)}`,
            `pa_pack_size=${String(pack)}`,
            `pa_total_price_usd=${totalPrice.toFixed(4)}`,
            `pa_unit_price_usd=${unitPrice.toFixed(6)}`,
            `keyword=${kw}`,
            `handle=${handle}`,
          ].join("|");

          const pathPart = url.startsWith("/") ? url : `/${url}`;
          bestRow = {
            product_id: p.product_id,
            pa_source: PA_SOURCE,
            pa_source_url: `${BASE_URL}${pathPart}`,
            pa_product_name_local: fullTitle.slice(0, 500),
            pa_ingredient_inn: p.who_inn_en,
            pa_price_type: "retail_normal",
            pa_price_local: unitPrice,
            pa_currency_unit: "USD",
            pa_package_unit: `${String(pack)} u × ${filter.formNorm}`,
            pa_collected_at: collectedAt,
            pa_notes: pa_notes,
            pa_stock_status: "unknown",
            confidence: 0.85,
          };
          break;
        }

        if (bestRow !== null) {
          break;
        }
      }

      if (bestRow !== null) {
        out.push(bestRow);
      }
    }

    return out;
  }
}

/** LLM 미사용 — Shopify API만 (MAX_LLM_CALLS_PER_RUN=0 과 동일 정책) */
export async function runArrochaShopifyV2(): Promise<CrawlRunResult> {
  return new ArrochaShopifyV2Crawler().run();
}
