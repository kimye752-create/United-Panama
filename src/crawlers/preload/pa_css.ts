/**
 * CSS 사회보장기금 — 의약품 조달 PDF 배치 (공공 tender_award)
 * PDF 파싱 실패 시 Skeleton + dry-run mock.
 */
/// <reference types="node" />

import * as cheerio from "cheerio";

import { BaseCrawler, type CrawlRowData } from "../base/BaseCrawler.js";
import { matchProductByLocalName } from "../../cleansing/comem_matcher.js";
import {
  createPoliteFetch,
  randomDelay,
} from "../../crawler/stealth_setup.js";
import { extractPdfText } from "../../utils/pdf_parser.js";

const PA_SOURCE = "css" as const;
const BASE = "https://www.css.gob.pa";
const MAX_FETCH_ERRORS = 3;
const MAX_RESULTS_PER_INN = 20;

function isDryRun(): boolean {
  return process.argv.includes("--dry-run");
}

export class CssCrawler extends BaseCrawler {
  constructor() {
    super("Css", "static_pre_loaded", "public", 0.8);
  }

  protected async crawl(): Promise<CrawlRowData[]> {
    if (isDryRun()) {
      return [
        {
          product_id: "fcae4399-aa80-4318-ad55-89d6401c10a9",
          pa_source: PA_SOURCE,
          pa_source_url: `${BASE}/dry-run.pdf`,
          pa_product_name_local: "[DRY-RUN] CSS licitación mock",
          pa_price_local: 0.02,
          pa_currency_unit: "USD",
          pa_price_type: "tender_award",
          confidence: 0.8,
        },
      ];
    }

    const politeFetch = createPoliteFetch();
    let homeHtml = "";

    for (let e = 0; e < MAX_FETCH_ERRORS; e++) {
      try {
        if (e > 0) {
          await randomDelay();
        }
        const res = await politeFetch(BASE, {
          headers: { Accept: "text/html,*/*" },
        });
        if (!res.ok) {
          continue;
        }
        homeHtml = await res.text();
        break;
      } catch {
        /* 다음 시도 */
      }
    }

    if (homeHtml === "") {
      throw new Error(
        "CSS: PDF batch structure needs manual inspection (home fetch)",
      );
    }

    const $ = cheerio.load(homeHtml);
    let pdfHref: string | undefined;
    $("a[href]").each((_, el) => {
      const raw = $(el).attr("href") ?? "";
      if (raw.toLowerCase().includes(".pdf")) {
        pdfHref = raw;
        return false;
      }
      return undefined;
    });

    if (pdfHref === undefined || pdfHref === "") {
      throw new Error(
        "CSS: PDF batch structure needs manual inspection (no pdf link)",
      );
    }

    const pdfUrl = new URL(pdfHref, `${BASE}/`).href;
    let text: string;
    try {
      text = await extractPdfText(pdfUrl);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(
        `CSS: PDF batch structure needs manual inspection (${msg})`,
      );
    }

    const lines = text.split(/[\r\n]+/).map((l) => l.trim()).filter(Boolean);
    const out: CrawlRowData[] = [];
    const perProduct = new Map<string, number>();

    for (const line of lines) {
      const priceMatch = line.match(/(\d+[.,]\d{2,}|\d+\.\d{2,})/);
      if (priceMatch === null) {
        continue;
      }
      const priceStr = priceMatch[0]?.replace(/\./g, "").replace(",", ".") ?? "";
      const price = Number.parseFloat(priceStr);
      const namePart = line
        .slice(0, line.indexOf(priceMatch[0]))
        .trim();
      if (namePart.length < 4 || Number.isNaN(price)) {
        continue;
      }
      const m = matchProductByLocalName(namePart);
      if (m.productId === null) {
        continue;
      }
      const n = perProduct.get(m.productId) ?? 0;
      if (n >= MAX_RESULTS_PER_INN) {
        continue;
      }
      perProduct.set(m.productId, n + 1);
      out.push({
        product_id: m.productId,
        pa_source: PA_SOURCE,
        pa_source_url: pdfUrl,
        pa_product_name_local: namePart,
        pa_price_local: price,
        pa_currency_unit: "USD",
        pa_price_type: "tender_award",
        confidence: 0.8,
      });
    }

    if (out.length === 0) {
      throw new Error(
        "CSS: PDF batch structure needs manual inspection (no INN match)",
      );
    }

    return out;
  }
}
