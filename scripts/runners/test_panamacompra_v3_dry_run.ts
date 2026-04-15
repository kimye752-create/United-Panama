/**
 * PanamaCompra V3 — Rosuvastatina 상위 5건 dry-run (INSERT 없음)
 */
/// <reference types="node" />

import {
  extractPriceFromOrdenPDF,
  fetchProcessDetail,
  launchPanamaCompraV3Browser,
  newPanamaCompraV3Page,
  PANAMACOMPRA_V3_AFTER_PDF_MS,
  PANAMACOMPRA_V3_PAGE_DELAY_MS,
  searchPanamaCompraV3OnPage,
} from "../../src/crawlers/preload/pa_panamacompra_v3.js";
import { resolvePanamaCompraProduct } from "../../src/utils/competitor_price_filters.js";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

type RowOut = {
  idx: number;
  procesoNumero: string;
  entidadShort: string;
  pdfOk: boolean;
  parseOk: boolean;
  unitPab: number | null;
  proveedor: string;
  productId: string | null;
  rawSnippet: string | null;
};

async function main(): Promise<void> {
  const keyword = "Rosuvastatina";
  const dateFrom = process.env.PANAMACOMPRA_V3_FROM ?? "01-01-2024";
  const dateTo = process.env.PANAMACOMPRA_V3_TO ?? "14-04-2026";
  const topN = Math.min(
    5,
    Math.max(1, Number.parseInt(process.env.PANAMACOMPRA_V3_TOP_N ?? "5", 10)),
  );

  const browser = await launchPanamaCompraV3Browser();
  const page = await newPanamaCompraV3Page(browser);
  const rows: RowOut[] = [];
  let searchCount = 0;

  try {
    const results = await searchPanamaCompraV3OnPage(
      page,
      keyword,
      dateFrom,
      dateTo,
      { maxResults: topN, maxPages: 5 },
    );
    searchCount = results.length;

    let i = 0;
    for (const r of results) {
      i += 1;
      const entidadShort = r.entidad.slice(0, 24) || "—";
      let pdfPath: string | null = null;
      try {
        pdfPath = await fetchProcessDetail(page, r.detailUrl, r.procesoNumero);
      } catch {
        pdfPath = null;
      }

      if (pdfPath === null) {
        rows.push({
          idx: i,
          procesoNumero: r.procesoNumero,
          entidadShort,
          pdfOk: false,
          parseOk: false,
          unitPab: null,
          proveedor: "—",
          productId: null,
          rawSnippet: null,
        });
        await delay(PANAMACOMPRA_V3_PAGE_DELAY_MS);
        continue;
      }

      await delay(PANAMACOMPRA_V3_AFTER_PDF_MS);

      let parsed;
      try {
        parsed = await extractPriceFromOrdenPDF(pdfPath, r.procesoNumero);
      } catch {
        rows.push({
          idx: i,
          procesoNumero: r.procesoNumero,
          entidadShort,
          pdfOk: true,
          parseOk: false,
          unitPab: null,
          proveedor: "—",
          productId: null,
          rawSnippet: null,
        });
        await delay(PANAMACOMPRA_V3_PAGE_DELAY_MS);
        continue;
      }

      const first = parsed.renglones[0];
      const parseOk =
        first !== undefined && Number.isFinite(first.precioUnitario);
      const unitPab =
        first !== undefined && Number.isFinite(first.precioUnitario)
          ? first.precioUnitario
          : null;
      const atc = first?.atcCode ?? "";
      const pid = resolvePanamaCompraProduct(r.descripcion, atc);

      rows.push({
        idx: i,
        procesoNumero: r.procesoNumero,
        entidadShort,
        pdfOk: true,
        parseOk,
        unitPab,
        proveedor: parsed.proveedor.slice(0, 40) || "—",
        productId: pid,
        rawSnippet: parseOk ? null : parsed.rawTextFirstPage.slice(0, 400),
      });

      await delay(PANAMACOMPRA_V3_PAGE_DELAY_MS);
    }
  } finally {
    await browser.close();
  }

  const pdfOk = rows.filter((x) => x.pdfOk).length;
  const parseOk = rows.filter((x) => x.parseOk).length;
  const matchOk = rows.filter((x) => x.productId !== null).length;
  const units = rows
    .map((x) => x.unitPab)
    .filter((n): n is number => n !== null && Number.isFinite(n));
  const avg =
    units.length > 0
      ? units.reduce((a, b) => a + b, 0) / units.length
      : null;

  const lines: string[] = [];
  lines.push("## PanamaCompra V3 dry-run — Rosuvastatina 상위 5건");
  lines.push("");
  lines.push("| # | 공정번호 | 발주(요약) | PDF DL | 파싱 | 단가(PAB) | 낙찰업체 | 매칭 product_id |");
  lines.push("|---|----------|------------|--------|------|-----------|----------|-----------------|");
  for (const row of rows) {
    lines.push(
      `| ${String(row.idx)} | ${row.procesoNumero} | ${row.entidadShort} | ${row.pdfOk ? "OK" : "FAIL"} | ${row.parseOk ? "OK" : "FAIL"} | ${row.unitPab !== null ? row.unitPab.toFixed(4) : "—"} | ${row.proveedor} | ${row.productId ?? "—"} |`,
    );
  }
  lines.push("");
  lines.push("### 요약");
  lines.push(`- 검색 결과(상한 ${String(topN)}건): ${String(searchCount)}건`);
  lines.push(`- PDF 다운로드 성공: ${String(pdfOk)}건`);
  lines.push(`- PDF 파싱 성공: ${String(parseOk)}건`);
  lines.push(`- 신 8제품 매칭 성공: ${String(matchOk)}건`);
  lines.push(
    `- 평균 단가(PAB): ${avg !== null ? avg.toFixed(4) : "—"}`,
  );
  lines.push("");
  for (const row of rows) {
    if (row.rawSnippet !== null) {
      lines.push(`### 파싱 실패 raw (공정 ${row.procesoNumero})`);
      lines.push("```");
      lines.push(row.rawSnippet);
      lines.push("```");
    }
  }

  process.stdout.write(lines.join("\n") + "\n");
  process.stdout.write(
    "\nJSON: " +
      JSON.stringify(
        {
          keyword,
          searchCount,
          pdfOk,
          parseOk,
          matchOk,
          avgUnitPab: avg,
          rows,
        },
        null,
        2,
      ) +
      "\n",
  );
}

main().catch((e: unknown) => {
  process.stderr.write(`${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
