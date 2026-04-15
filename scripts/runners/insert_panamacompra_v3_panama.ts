/**
 * PanamaCompra V3 — dry-run 전용 (INSERT·DB 적재 없음, 단계 7 STOP)
 * Claude GO 후 INSERT는 별도 스크립트/플래그로 추가 예정
 */
/// <reference types="node" />

import {
  extractPriceFromOrdenPDF,
  fetchProcessDetail,
  launchPanamaCompraV3Browser,
  newPanamaCompraV3Page,
  PANAMACOMPRA_V3_TERM_DELAY_MS,
  searchPanamaCompraV3OnPage,
  type SearchResult,
} from "../../src/crawlers/preload/pa_panamacompra_v3.js";
import { resolvePanamaCompraProduct } from "../../src/utils/competitor_price_filters.js";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

const SEARCH_TERMS = [
  "Rosuvastatina",
  "Atorvastatina",
  "Cilostazol",
  "Hidroxiurea",
  "Hidroxicarbamida",
  "Mosaprida",
  "Salmeterol",
  "Fluticasona",
  "Gadobutrol",
] as const;

type RowStat = {
  keyword: string;
  searchResults: number;
  pdfDownloaded: number;
  pdfParseOk: number;
  matched: number;
  unitPrices: number[];
  errors: string[];
};

function finiteMean(xs: number[]): number | null {
  if (xs.length === 0) {
    return null;
  }
  const s = xs.reduce((a, b) => a + b, 0);
  return s / xs.length;
}

async function main(): Promise<void> {
  const dateFrom = process.env.PANAMACOMPRA_V3_FROM ?? "01-01-2024";
  const dateTo = process.env.PANAMACOMPRA_V3_TO ?? "14-04-2026";
  const maxResults = Math.min(
    Math.max(
      1,
      Number.parseInt(process.env.PANAMACOMPRA_V3_MAX_RESULTS ?? "8", 10),
    ),
    10,
  );
  const maxKeywords = Math.min(
    SEARCH_TERMS.length,
    Math.max(
      1,
      Number.parseInt(
        process.env.PANAMACOMPRA_V3_MAX_KEYWORDS ?? String(SEARCH_TERMS.length),
        10,
      ),
    ),
  );

  const rows: RowStat[] = [];
  const browser = await launchPanamaCompraV3Browser();
  const page = await newPanamaCompraV3Page(browser);

  try {
    for (let ki = 0; ki < maxKeywords; ki++) {
      const keyword = SEARCH_TERMS[ki] ?? "";
      const errList: string[] = [];
      let searchList: SearchResult[] = [];
      try {
        searchList = await searchPanamaCompraV3OnPage(
          page,
          keyword,
          dateFrom,
          dateTo,
          { maxResults, maxPages: 5 },
        );
      } catch (error: unknown) {
        errList.push(
          error instanceof Error ? error.message : String(error),
        );
      }

      let pdfDl = 0;
      let parseOk = 0;
      let matched = 0;
      const prices: number[] = [];

      for (const r of searchList) {
        const pdfPath = await fetchProcessDetail(
          page,
          r.detailUrl,
          r.procesoNumero,
        );
        if (pdfPath !== null) {
          pdfDl += 1;
        } else {
          errList.push(`${r.procesoNumero}: PDF 다운로드 실패`);
        }

        if (pdfPath === null) {
          continue;
        }

        let priceData;
        try {
          priceData = await extractPriceFromOrdenPDF(pdfPath, r.procesoNumero);
        } catch (error: unknown) {
          errList.push(
            `${r.procesoNumero} PDF파싱: ${error instanceof Error ? error.message : String(error)}`,
          );
          continue;
        }

        const first = priceData.renglones[0];
        const hasLine =
          first !== undefined && Number.isFinite(first.precioUnitario);
        if (hasLine) {
          parseOk += 1;
        }

        const atcForMatch = first?.atcCode ?? "";
        const pid = resolvePanamaCompraProduct(r.descripcion, atcForMatch);
        if (pid !== null) {
          matched += 1;
        }

        if (first !== undefined && Number.isFinite(first.precioUnitario)) {
          prices.push(first.precioUnitario);
        }
      }

      rows.push({
        keyword,
        searchResults: searchList.length,
        pdfDownloaded: pdfDl,
        pdfParseOk: parseOk,
        matched,
        unitPrices: prices,
        errors: errList,
      });

      if (ki < maxKeywords - 1) {
        await delay(PANAMACOMPRA_V3_TERM_DELAY_MS);
      }
    }
  } finally {
    await browser.close();
  }

  const table = rows.map((row) => ({
    keyword: row.keyword,
    searchResults: row.searchResults,
    pdfDownloaded: row.pdfDownloaded,
    pdfParseOk: row.pdfParseOk,
    matched: row.matched,
    avgUnitPab: finiteMean(row.unitPrices),
  }));

  process.stdout.write(
    JSON.stringify(
      {
        mode: "dry-run",
        dateFrom,
        dateTo,
        maxResultsPerKeyword: maxResults,
        keywordsProcessed: maxKeywords,
        summaryTable: table,
        skipReasonSampleErrors: rows.map((r) => ({
          keyword: r.keyword,
          errors: r.errors.slice(0, 5),
        })),
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
