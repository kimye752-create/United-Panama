/**
 * PanamaCompra V3 운영 포털 — 고급 검색·상세·ORDEN DE COMPRA PDF 파싱 (Engine preload)
 * 고급 검색 진입: 메인 `Inicio/` → (선택) 프로모 모달 닫기 → `#/busqueda-avanzada`에서 `input#descripcion` 등.
 */
/// <reference types="node" />

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { chromium, type Browser, type Frame, type Page } from "playwright";

export {
  extractPriceFromOrdenPDF,
  type ParsedPriceData,
  type RenglonParsed,
} from "../../utils/panamacompra_pdf_parser.js";

/** SPA 메인 (프로모 모달 등 처리 후 V3 검색으로 이동) */
export const PANAMACOMPRA_V3_HOME_URL =
  "https://www.panamacompra.gob.pa/Inicio/";

/** 고급 검색 V3 (Angular 라우트) */
export const PANAMACOMPRA_V3_SEARCH_URL =
  "https://www.panamacompra.gob.pa/Inicio/#/busqueda-avanzada";

const CHROME_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/** 페이지 전환·상세 로딩 등 (요청: 5초) */
export const PANAMACOMPRA_V3_PAGE_DELAY_MS = 5000;
/** 검색어 간 (요청: 10초) */
export const PANAMACOMPRA_V3_TERM_DELAY_MS = 10000;
/** PDF 저장 직후 메모리·디스크 안정화 (요청: 3초) */
export const PANAMACOMPRA_V3_AFTER_PDF_MS = 3000;
/** 재시도 전 대기 (요청: 30초) */
export const PANAMACOMPRA_V3_RETRY_DELAY_MS = 30000;

export type SearchResult = {
  procesoNumero: string;
  estado: string;
  descripcion: string;
  entidad: string;
  fecha: string;
  detailUrl: string;
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function withRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (first: unknown) {
    const m = first instanceof Error ? first.message : String(first);
    try {
      await delay(PANAMACOMPRA_V3_RETRY_DELAY_MS);
      return await fn();
    } catch (second: unknown) {
      const m2 = second instanceof Error ? second.message : String(second);
      throw new Error(
        `${label} 재시도 후 실패: 첫 오류=${m}, 둘째=${m2}`,
      );
    }
  }
}

export function getPanamaCompraV3PdfDir(): string {
  return path.join(process.cwd(), "data", "raw", "panamacompra_v3");
}

async function ensurePdfDir(): Promise<string> {
  const dir = getPanamaCompraV3PdfDir();
  await mkdir(dir, { recursive: true });
  return dir;
}

/** 실패 분석용 — 타임스탬프 파일명 */
async function saveDebugSnapshot(page: Page, tag: string): Promise<void> {
  try {
    const dir = await ensurePdfDir();
    const ts = Date.now();
    const shot = path.join(dir, `debug_${ts}_${tag}.png`);
    const htmlPath = path.join(dir, `debug_${ts}_${tag}.html`);
    await page.screenshot({ path: shot, fullPage: true });
    const html = await page.content();
    await writeFile(htmlPath, html, "utf-8");
    process.stderr.write(
      `[PanamaCompra V3] 디버그 저장: ${shot} , ${htmlPath}\n`,
    );
  } catch {
    /* 무시 */
  }
}

/** 진입 디버그용 고정 파일명 스크린샷 */
async function saveDebugStepScreenshot(
  page: Page,
  fileName: string,
): Promise<void> {
  try {
    const dir = await ensurePdfDir();
    const shot = path.join(dir, fileName);
    await page.screenshot({ path: shot, fullPage: true });
    process.stderr.write(`[PanamaCompra V3] 단계 스크린샷: ${shot}\n`);
  } catch {
    /* 무시 */
  }
}

/**
 * Panama Business Tower 등 메인 안내 모달이 있으면 닫는다.
 * @returns 닫기 클릭을 한 번이라도 시도했으면 true
 */
export async function closePromoModalIfPresent(page: Page): Promise<boolean> {
  const candidates = [
    page.locator('button[aria-label="Close"]'),
    page.locator("button.close"),
    page.locator(".modal-header button"),
    page.locator('button:has-text("×")'),
    page.locator(".btn-close"),
    page.locator('[data-bs-dismiss="modal"]'),
  ];
  let clicked = false;
  for (const loc of candidates) {
    try {
      const first = loc.first();
      if ((await first.count()) === 0) {
        continue;
      }
      await first.waitFor({ state: "visible", timeout: 3000 });
      await first.click({ timeout: 5000 });
      clicked = true;
      await delay(3000);
      break;
    } catch {
      /* 다음 후보 */
    }
  }
  return clicked;
}

/** 메인에서 모달 처리 후 V3 고급 검색 라우트로 이동·`input#descripcion` 대기 */
async function navigateToBusquedaAvanzadaV3(page: Page): Promise<void> {
  await page.goto(PANAMACOMPRA_V3_HOME_URL, {
    waitUntil: "load",
    timeout: 180000,
  });
  await page
    .waitForLoadState("networkidle", { timeout: 120000 })
    .catch(() => undefined);
  await delay(5000);
  await saveDebugStepScreenshot(page, "debug_01_home.png");
  await closePromoModalIfPresent(page);
  await saveDebugStepScreenshot(page, "debug_02_after_modal.png");

  await page.goto(PANAMACOMPRA_V3_SEARCH_URL, {
    waitUntil: "load",
    timeout: 180000,
  });
  await page
    .waitForLoadState("networkidle", { timeout: 120000 })
    .catch(() => undefined);

  try {
    await page.waitForFunction(
      () => window.location.hash.includes("busqueda-avanzada"),
      { timeout: 30000 },
    );
  } catch {
    const v3 = page
      .locator(
        'button:has-text("Búsqueda Avanzada V3"), a:has-text("Búsqueda Avanzada V3"), button.btn-blue-dark:has-text("V3")',
      )
      .first();
    if ((await v3.count()) > 0) {
      await v3.click({ timeout: 15000 });
    }
    await page.waitForFunction(
      () => window.location.hash.includes("busqueda-avanzada"),
      { timeout: 30000 },
    );
  }

  await page.waitForSelector("input#descripcion", {
    state: "visible",
    timeout: 15000,
  });
  await saveDebugStepScreenshot(page, "debug_03_search_page.png");
}

/** 레거시 Pliego 고급 필터 블록이 display:none일 수 있음 — 표시 후 입력·클릭 가능 */
async function ensureLegacyPliegoFiltersVisible(
  root: Page | Frame,
): Promise<void> {
  const div = root.locator("#ctl00_ContentPlaceHolder1_divFiltros");
  if ((await div.count()) === 0) {
    return;
  }
  try {
    await div.evaluate((el) => {
      (el as HTMLElement).style.display = "block";
    });
  } catch {
    /* 무시 */
  }
}

/** 메인 문서 우선 — 입력이 없을 때만 iframe 탐색 */
async function findSearchRoot(page: Page): Promise<Page | Frame> {
  const mainVisible = await page.locator("input:visible, textarea:visible").count();
  if (mainVisible > 0) {
    return page;
  }
  for (const f of page.frames()) {
    if (f === page.mainFrame()) {
      continue;
    }
    const n = await f.locator("input:visible, textarea:visible").count();
    if (n > 0) {
      return f;
    }
  }
  return page;
}

async function fillDescriptionField(
  page: Page,
  root: Page | Frame,
  searchTerm: string,
): Promise<void> {
  const angularPrimary = [
    root.locator('input[name="descripcion"]'),
    root.locator("input#descripcion"),
    root.locator('input[id="descripcion"]'),
  ];
  for (const loc of angularPrimary) {
    try {
      await loc.waitFor({ state: "visible", timeout: 15000 });
      await loc.scrollIntoViewIfNeeded();
      await loc.fill(searchTerm);
      return;
    } catch {
      /* 다음 후보 */
    }
  }

  const aspPliegoNombre = [
    root.locator("#ctl00_ContentPlaceHolder1_txtNombreAdquisicion"),
    root.locator('input[name*="txtNombreAdquisicion"]'),
  ];
  for (const loc of aspPliegoNombre) {
    try {
      await loc.waitFor({ state: "visible", timeout: 15000 });
      await loc.scrollIntoViewIfNeeded();
      await loc.fill(searchTerm);
      return;
    } catch {
      /* 다음 후보 */
    }
  }

  await saveDebugSnapshot(page, "no_input_descripcion_primary");

  const legacy = [
    root.locator('input[name*="txtDescripcion"]').first(),
    root.locator('input[id*="txtDescripcion"]').first(),
    root.locator("input.form-control:visible").first(),
    root.getByLabel(/pliego|nombre|descripci/i),
    root.locator(
      'input[name*="Descripcion"], input[id*="Descripcion"], input[id*="txtNombre"], textarea[name*="Descripcion"]',
    ).first(),
    root.locator('input[type="text"]:visible').first(),
    root.locator("textarea:visible").first(),
  ];
  for (const loc of legacy) {
    try {
      await loc.waitFor({ state: "visible", timeout: 45000 });
      await loc.scrollIntoViewIfNeeded();
      await loc.fill(searchTerm);
      return;
    } catch {
      /* 다음 후보 */
    }
  }
  await saveDebugSnapshot(page, "no_descripcion_any");
  throw new Error(
    "검색어 입력란을 찾지 못했습니다. Angular/ASP.NET DOM 변경 가능 — debug_*.png/html 확인.",
  );
}

/**
 * 검색 폼 입력 — name 부분일치·placeholder 다중 후보
 */
/** 날짜 필드는 Angular·레거시 후보 순 — 없으면 생략(기본값 유지) */
async function fillOptionalDateRange(
  root: Page | Frame,
  dateFrom: string,
  dateTo: string,
): Promise<void> {
  const startPick =
    'input[name="fechaDesde"], input[name="fechaInicio"], input[name="dateFrom"], input[name*="dpFechaInicio"], input[name*="FechaInicio"], input[id*="txtFechaDesde"]';
  const endPick =
    'input[name="fechaHasta"], input[name="fechaFin"], input[name="dateTo"], input[name*="dpFechaFin"], input[name*="FechaFin"], input[id*="txtFechaHasta"]';
  const d1 = root.locator(startPick).first();
  const d2 = root.locator(endPick).first();
  if ((await d1.count()) > 0) {
    await d1.fill(dateFrom).catch(() => undefined);
  }
  if ((await d2.count()) > 0) {
    await d2.fill(dateTo).catch(() => undefined);
  }
}

async function fillAdvancedSearchForm(
  page: Page,
  searchTerm: string,
  dateFrom: string,
  dateTo: string,
): Promise<void> {
  const root: Page | Frame = await findSearchRoot(page);
  await ensureLegacyPliegoFiltersVisible(root);
  await fillDescriptionField(page, root, searchTerm);
  await fillOptionalDateRange(root, dateFrom, dateTo);

  const submit = root
    .locator(
      'button[aria-label="찾아보세요"], button.btn-blue-dark[type="submit"], a#ctl00_ContentPlaceHolder1_btnBuscar, a[href*="ContentPlaceHolder1$btnBuscar"], input[type="submit"][value*="Buscar"], input[type="submit"][id*="Buscar"], button.btn-primary:has-text("Buscar"), button:has-text("Buscar"), input[type="button"][value*="Buscar"]',
    )
    .first();
  await submit.waitFor({ state: "attached", timeout: 30000 });
  await submit.click({ force: true });
  await page
    .waitForLoadState("networkidle", { timeout: 120000 })
    .catch(() => undefined);
  await page
    .waitForLoadState("domcontentloaded", { timeout: 120000 })
    .catch(() => undefined);
}

/**
 * 결과 테이블 파싱 — 첫 컬럼 링크 = 상세
 */
async function parseResultTable(page: Page): Promise<SearchResult[]> {
  await page
    .waitForSelector("table tbody tr", { timeout: 15000 })
    .catch(() => undefined);
  await page
    .getByText(/registros?|encontrad|resultado|records?|total:\s*\d+/i)
    .first()
    .waitFor({ state: "visible", timeout: 10000 })
    .catch(() => undefined);
  await page.waitForSelector("table", { timeout: 60000 }).catch(() => undefined);

  const rows = page.locator(
    'tr[role="row"], table tbody tr, table tr',
  );
  const n = await rows.count();
  const out: SearchResult[] = [];
  for (let i = 0; i < n; i++) {
    const tr = rows.nth(i);
    const tds = tr.locator("td");
    const tdCount = await tds.count();
    if (tdCount < 3) {
      continue;
    }
    const link = tr.locator("td").first().locator("a[href]").first();
    if ((await link.count()) === 0) {
      continue;
    }
    const href = await link.getAttribute("href");
    const texto = (await link.innerText()).trim();
    if (href === null || texto === "") {
      continue;
    }
    const abs = new URL(href, page.url()).href;
    const cells: string[] = [];
    for (let c = 0; c < tdCount; c++) {
      cells.push((await tds.nth(c).innerText()).trim().replace(/\s+/g, " "));
    }
    out.push({
      procesoNumero: texto,
      estado: cells[1] ?? "",
      descripcion: cells[2] ?? "",
      entidad: cells[3] ?? "",
      fecha: cells[5] ?? cells[4] ?? "",
      detailUrl: abs,
    });
  }
  return out;
}

async function clickNextPageIfAny(page: Page): Promise<boolean> {
  const next = page.locator(
    'a:has-text("Siguiente"), a[rel="next"], a:has-text(">")',
  ).first();
  if ((await next.count()) === 0) {
    return false;
  }
  const cls = await next.getAttribute("class");
  if (cls !== null && /disabled|aspNetDisabled/i.test(cls)) {
    return false;
  }
  await next.click();
  await delay(PANAMACOMPRA_V3_PAGE_DELAY_MS);
  return true;
}

export type SearchOptions = {
  maxResults?: number;
  maxPages?: number;
  dateFrom?: string;
  dateTo?: string;
};

async function saveSearchDebugArtifacts(page: Page, reason: string): Promise<void> {
  const safe = reason.replace(/[^\w.-]+/g, "_").slice(0, 80);
  await saveDebugSnapshot(page, `search_fail_${safe}`);
}

/**
 * 이미 연 `page`에서 고급 검색 1회 실행 (브라우저는 호출 측에서 관리)
 */
export async function searchPanamaCompraV3OnPage(
  page: Page,
  searchTerm: string,
  dateFrom: string,
  dateTo: string,
  options?: SearchOptions,
): Promise<SearchResult[]> {
  const maxResults = Math.min(options?.maxResults ?? 50, 50);
  const maxPages = Math.min(options?.maxPages ?? 5, 10);

  try {
    return await withRetry(`search[${searchTerm}]`, async () => {
      await navigateToBusquedaAvanzadaV3(page);
      await fillAdvancedSearchForm(page, searchTerm, dateFrom, dateTo);
      await delay(2000);
      await saveDebugStepScreenshot(page, "debug_04_after_search.png");

      const merged: SearchResult[] = [];
      const seen = new Set<string>();
      for (let pg = 0; pg < maxPages; pg++) {
        const batch = await parseResultTable(page);
        for (const r of batch) {
          if (!seen.has(r.detailUrl)) {
            seen.add(r.detailUrl);
            merged.push(r);
          }
          if (merged.length >= maxResults) {
            return merged.slice(0, maxResults);
          }
        }
        const more = await clickNextPageIfAny(page);
        if (!more) {
          break;
        }
      }
      return merged.slice(0, maxResults);
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    await saveSearchDebugArtifacts(page, msg);
    throw error;
  }
}

/**
 * Rosuvastatina 등 단일 키워드 — 기본 날짜·상위 5건 (브라우저 자동)
 */
export async function searchPanamaCompraV3(
  searchTerm: string,
  options?: SearchOptions,
): Promise<SearchResult[]> {
  const dateFrom =
    options?.dateFrom ??
    process.env.PANAMACOMPRA_V3_FROM ??
    "01-01-2024";
  const dateTo =
    options?.dateTo ?? process.env.PANAMACOMPRA_V3_TO ?? "14-04-2026";
  const maxResults = options?.maxResults ?? 5;
  const maxPages = options?.maxPages ?? 5;
  const browser = await launchPanamaCompraV3Browser();
  try {
    const page = await newPanamaCompraV3Page(browser);
    return await searchPanamaCompraV3OnPage(page, searchTerm, dateFrom, dateTo, {
      maxResults,
      maxPages,
    });
  } finally {
    await browser.close();
  }
}

/**
 * 날짜를 명시하는 검색 (다중 키워드 러너용)
 */
export async function searchPanamaCompraV3WithDates(
  searchTerm: string,
  dateFrom: string,
  dateTo: string,
  options?: SearchOptions,
): Promise<SearchResult[]> {
  const browser = await launchPanamaCompraV3Browser();
  try {
    const page = await newPanamaCompraV3Page(browser);
    return await searchPanamaCompraV3OnPage(
      page,
      searchTerm,
      dateFrom,
      dateTo,
      options,
    );
  } finally {
    await browser.close();
  }
}

export async function launchPanamaCompraV3Browser(): Promise<Browser> {
  /** 디버깅 시 PANAMACOMPRA_V3_HEADFUL=1 (브라우저 표시) */
  const headful = process.env.PANAMACOMPRA_V3_HEADFUL === "1";
  return chromium.launch({
    headless: !headful,
    args: ["--disable-blink-features=AutomationControlled"],
  });
}

export async function newPanamaCompraV3Page(browser: Browser): Promise<Page> {
  const context = await browser.newContext({
    userAgent: CHROME_UA,
    locale: "es-PA",
    ignoreHTTPSErrors: true,
  });
  return context.newPage();
}

/**
 * 상세 페이지에서 ORDEN DE COMPRA PDF 저장 — 절대 경로 또는 null
 */
export async function fetchProcessDetail(
  page: Page,
  detailUrl: string,
  procesoNumero: string,
): Promise<string | null> {
  const safeName = procesoNumero.replace(/[^\w.-]+/g, "_").slice(0, 120);

  try {
    await withRetry(`detail[${procesoNumero}]`, async () => {
      await page.goto(detailUrl, {
        waitUntil: "domcontentloaded",
        timeout: 120000,
      });
      await delay(PANAMACOMPRA_V3_PAGE_DELAY_MS);
    });

    await page.getByText(/compra|orden|documento/i).first().isVisible().catch(() => undefined);

    const links = page.locator('a[href$=".pdf"], a[href*=".pdf"]');
    const k = await links.count();
    let chosenIndex = -1;
    for (let i = 0; i < k; i++) {
      const a = links.nth(i);
      const txt = (
        (await a.innerText()) +
        (await a.getAttribute("title")) +
        (await a.getAttribute("href"))
      ).toLowerCase();
      const href = await a.getAttribute("href");
      if (href === null) {
        continue;
      }
      if (
        /orden\s*(de)?\s*compra/i.test(txt) ||
        /orden-de-compra/i.test(href.toLowerCase())
      ) {
        chosenIndex = i;
        break;
      }
    }
    if (chosenIndex < 0 && k > 0) {
      chosenIndex = 0;
    }
    if (chosenIndex < 0) {
      return null;
    }

    const chosen = links.nth(chosenIndex);
    const chosenHref = await chosen.getAttribute("href");
    if (chosenHref === null) {
      return null;
    }
    const pdfUrl = new URL(chosenHref, page.url()).href;
    const dir = await ensurePdfDir();
    const dest = path.join(dir, `${safeName}.pdf`);

    try {
      const buf = await withRetry(`pdfDownload[${procesoNumero}]`, async () => {
        const resp = await page.context().request.get(pdfUrl, {
          timeout: 120000,
        });
        if (!resp.ok()) {
          throw new Error(`PDF HTTP ${String(resp.status())}`);
        }
        return Buffer.from(await resp.body());
      });
      await writeFile(dest, buf);
    } catch {
      try {
        const [download] = await Promise.all([
          page.waitForEvent("download", { timeout: 120000 }),
          chosen.click(),
        ]);
        await download.saveAs(dest);
      } catch {
        return null;
      }
    }

    await delay(PANAMACOMPRA_V3_AFTER_PDF_MS);
    return dest;
  } catch {
    return null;
  }
}
