/**
 * ACODECO — CABAMED 가격 통제 리스트 (공공, regulated)
 * 실패 시 Skeleton: 구조 미확정 오류 — dry-run은 mock 1건.
 */
/// <reference types="node" />

import { fileURLToPath } from "node:url";
import { normalize } from "node:path";
import * as cheerio from "cheerio";

import { BaseCrawler, type CrawlRowData } from "../base/BaseCrawler.js";
import { matchProductByLocalName } from "../../cleansing/comem_matcher.js";
import { createPoliteFetch, randomDelay } from "../../crawler/stealth_setup.js";

const PA_SOURCE = "acodeco" as const;
const BASE = "https://www.acodeco.gob.pa";
const MAX_CONSECUTIVE_ERRORS = 3;
const MAX_RESULTS_PER_INN = 20;
const MOCK_PRODUCT = "bdfc9883-6040-438a-8e7a-df01f1230682";

function isDryRun(): boolean {
  return process.argv.includes("--dry-run");
}

export class AcodecoCrawler extends BaseCrawler {
  constructor() {
    super("Acodeco", "static_pre_loaded", "public", 0.75);
  }

  protected async crawl(): Promise<CrawlRowData[]> {
    if (isDryRun()) {
      return [
        {
          product_id: MOCK_PRODUCT,
          pa_source: PA_SOURCE,
          pa_source_url: `${BASE}/dry-run`,
          pa_product_name_local: "[DRY-RUN] CABAMED mock",
          pa_price_local: 0.01,
          pa_currency_unit: "PAB",
          pa_price_type: "regulated",
          pa_decree_listed: true,
          confidence: 0.75,
        },
      ];
    }

    const politeFetch = createPoliteFetch();

    for (let attempt = 0; attempt < MAX_CONSECUTIVE_ERRORS; attempt++) {
      try {
        if (attempt > 0) {
          await randomDelay();
        }
        const res = await politeFetch(BASE, {
          headers: { Accept: "text/html,*/*" },
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const html = await res.text();
        const $ = cheerio.load(html);
        const linkEls = $("a[href]")
          .filter((_, el) => {
            const href = ($(el).attr("href") ?? "").toLowerCase();
            const tx = $(el).text().toLowerCase();
            return (
              href.includes("cabamed") ||
              href.includes("precio") ||
              tx.includes("cabamed")
            );
          })
          .toArray();

        if (linkEls.length === 0) {
          throw new Error(
            "ACODECO: prob structure needs manual inspection",
          );
        }

        const first = linkEls[0];
        if (first === undefined) {
          throw new Error(
            "ACODECO: prob structure needs manual inspection",
          );
        }
        const rawHref = $(first).attr("href") ?? "";
        const absUrl = new URL(rawHref, `${BASE}/`).href;

        await randomDelay();
        const sub = await politeFetch(absUrl, {
          headers: { Accept: "text/html,*/*" },
        });
        if (!sub.ok) {
          throw new Error(`subpage HTTP ${sub.status}`);
        }
        const subHtml = await sub.text();
        const rows = this.parsePriceRows(subHtml, absUrl);
        if (rows.length === 0) {
          throw new Error(
            "ACODECO: prob structure needs manual inspection",
          );
        }
        return rows;
      } catch {
        /* 재시도 */
      }
    }

    throw new Error("ACODECO: prob structure needs manual inspection");
  }

  /** 표·문단에서 의약품명+가격 후보 추출 후 ComEM 매칭 */
  private parsePriceRows(html: string, pageUrl: string): CrawlRowData[] {
    const $ = cheerio.load(html);
    const out: CrawlRowData[] = [];
    const perProduct = new Map<string, number>();

    $("tr").each((_, tr) => {
      const cells = $(tr).find("td,th").toArray();
      if (cells.length < 2) {
        return;
      }
      const texts = cells.map((c) => $(c).text().replace(/\s+/g, " ").trim());
      const joined = texts.join(" | ");
      const priceMatch = joined.match(/(\d+[.,]\d+|\d+)/);
      const nameGuess = texts[0] ?? joined;
      if (priceMatch === null || nameGuess.length < 3) {
        return;
      }
      const priceStr = priceMatch[0]?.replace(/\./g, "").replace(",", ".") ?? "";
      const price = Number.parseFloat(priceStr);
      if (Number.isNaN(price)) {
        return;
      }
      const m = matchProductByLocalName(nameGuess);
      if (m.productId === null || m.method === "none") {
        return;
      }
      const n = perProduct.get(m.productId) ?? 0;
      if (n >= MAX_RESULTS_PER_INN) {
        return;
      }
      perProduct.set(m.productId, n + 1);

      out.push({
        product_id: m.productId,
        pa_source: PA_SOURCE,
        pa_source_url: pageUrl,
        pa_product_name_local: nameGuess,
        pa_price_local: price,
        pa_currency_unit: "PAB",
        pa_price_type: "regulated",
        pa_decree_listed: true,
        confidence: 0.75,
      });
    });

    if (out.length > 0) {
      return out;
    }

    const bodyText = $("body").text().replace(/\s+/g, " ");
    const tokenRe =
      /([A-Za-zÁÉÍÓÚÑáéíóúñ][A-Za-zÁÉÍÓÚÑáéíóúñ0-9\s,.%-]{4,80}?)\s+(\d+[.,]\d+|\d+)/g;
    let m: RegExpExecArray | null;
    while ((m = tokenRe.exec(bodyText)) !== null) {
      const nameGuess = (m[1] ?? "").trim();
      const priceStr = (m[2] ?? "").replace(/\./g, "").replace(",", ".");
      const price = Number.parseFloat(priceStr);
      if (nameGuess.length < 4 || Number.isNaN(price)) {
        continue;
      }
      const match = matchProductByLocalName(nameGuess);
      if (match.productId === null) {
        continue;
      }
      const n = perProduct.get(match.productId) ?? 0;
      if (n >= MAX_RESULTS_PER_INN) {
        continue;
      }
      perProduct.set(match.productId, n + 1);
      out.push({
        product_id: match.productId,
        pa_source: PA_SOURCE,
        pa_source_url: pageUrl,
        pa_product_name_local: nameGuess,
        pa_price_local: price,
        pa_currency_unit: "PAB",
        pa_price_type: "regulated",
        pa_decree_listed: true,
        confidence: 0.75,
      });
    }

    return out;
  }
}

/** GitHub Actions·로컬에서 `npx tsx src/crawlers/preload/pa_acodeco.ts` 직접 실행 시 Supabase 적재 */
async function main(): Promise<void> {
  const crawler = new AcodecoCrawler();
  const result = await crawler.run();
  process.stdout.write(`${JSON.stringify(result)}\n`);
  if (!result.ok) {
    process.exit(1);
  }
}

const invoked = process.argv[1];
if (invoked !== undefined) {
  const a = normalize(fileURLToPath(import.meta.url));
  const b = normalize(invoked);
  if (a === b) {
    main().catch((e: unknown) => {
      process.stderr.write(
        `${e instanceof Error ? e.message : String(e)}\n`,
      );
      process.exit(1);
    });
  }
}
