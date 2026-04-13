/**
 * DNFD / MINSA Panamá Digital — 등록 조회 (Playwright)
 * pa_source: dnfd_consulta / market_segment: regulatory / 가격 아님 → pa_currency_unit N/A
 *
 * CAPTCHA 발견 시 throw MANUAL_INTERVENTION_REQUIRED (INSERT 없음)
 * DNFD_SKIP=1 또는 --dry-run: 브라우저 미실행
 */
/// <reference types="node" />

import { chromium, type Browser, type Page } from "playwright";

import { insertRow, validatePanamaPhase1Common, type PanamaPhase1InsertRow } from "../../utils/db_connector.js";
import { TARGET_PRODUCTS, type ProductMaster } from "../../utils/product-dictionary.js";

const PA_SOURCE = "dnfd_consulta" as const;
const TRAMITES_URL = "https://tramites-minsa.panamadigital.gob.pa";
const COMPANY_QUERY = "Korea United Pharm";

function sleepPoliteMs(): Promise<void> {
  const ms = 3000 + Math.random() * 2000;
  return new Promise((r) => {
    setTimeout(r, ms);
  });
}

function sleepMs(ms: number): Promise<void> {
  return new Promise((r) => {
    setTimeout(r, ms);
  });
}

async function detectCaptchaBlocking(page: Page): Promise<boolean> {
  const iframes = await page.locator('iframe[src*="recaptcha" i]').count();
  if (iframes > 0) {
    return true;
  }
  const hcaptcha = await page.locator('iframe[src*="hcaptcha" i]').count();
  if (hcaptcha > 0) {
    return true;
  }
  const body = await page.locator("body").innerText().catch(() => "");
  if (/captcha|verificación humana|robot/i.test(body)) {
    return true;
  }
  return false;
}

async function tryFillSearch(page: Page, query: string): Promise<boolean> {
  const selectors = [
    'input[type="search"]',
    'input[placeholder*="Buscar" i]',
    'input[placeholder*="buscar" i]',
    'input[name*="search" i]',
    'input[id*="search" i]',
    "input.form-control",
  ];
  for (const sel of selectors) {
    const loc = page.locator(sel).first();
    const n = await loc.count();
    if (n === 0) {
      continue;
    }
    const vis = await loc.isVisible().catch(() => false);
    if (!vis) {
      continue;
    }
    await loc.fill("");
    await loc.fill(query);
    await loc.press("Enter");
    await sleepMs(2500);
    return true;
  }
  return false;
}

async function scrapeResultBlob(page: Page): Promise<string> {
  const tables = page.locator("table");
  const tc = await tables.count();
  if (tc === 0) {
    return (await page.locator("main, article, body").first().innerText().catch(() => "")).slice(0, 4000);
  }
  const parts: string[] = [];
  for (let i = 0; i < Math.min(tc, 3); i++) {
    const t = await tables.nth(i).innerText().catch(() => "");
    if (t.trim() !== "") {
      parts.push(t);
    }
  }
  return parts.join("\n---\n").slice(0, 6000);
}

function buildNotes(
  p: ProductMaster,
  status: "found" | "not_found",
  blob: string,
  queryUsed: string,
): string {
  const base = `dnfd|status=${status}|query=${queryUsed}|inn=${p.who_inn_en}`;
  if (status === "not_found") {
    return `${base}|snippet=${blob.slice(0, 800).replace(/\s+/gu, " ")}`;
  }
  return `${base}|table=${blob.slice(0, 2000).replace(/\s+/gu, " ")}`;
}

async function searchAndScrape(
  page: Page,
  p: ProductMaster,
): Promise<{ notes: string; queryUsed: string }> {
  const queries = [p.who_inn_en, ...p.panama_search_keywords];
  for (const q of queries) {
    await sleepPoliteMs();
    const ok = await tryFillSearch(page, q);
    if (!ok) {
      continue;
    }
    const blob = await scrapeResultBlob(page);
    const low = blob.toLowerCase();
    const hit =
      low.includes(p.who_inn_en.toLowerCase()) ||
      p.panama_search_keywords.some((k) => low.includes(k.toLowerCase()));
    if (hit && blob.length > 20) {
      return { notes: buildNotes(p, "found", blob, q), queryUsed: q };
    }
  }
  await sleepPoliteMs();
  const lastBlob = await scrapeResultBlob(page);
  return {
    notes: buildNotes(p, "not_found", lastBlob, queries[0] ?? p.who_inn_en),
    queryUsed: queries[0] ?? p.who_inn_en,
  };
}

/**
 * 회사명 검색 1회(결과는 DOM 상태만 갱신, 별도 INSERT 없음)
 */
async function runCompanyProbe(page: Page): Promise<void> {
  await sleepPoliteMs();
  await tryFillSearch(page, COMPANY_QUERY);
}

export async function runDnfdConsultaPreload(): Promise<{
  ok: boolean;
  inserted: number;
  message: string;
}> {
  if (process.argv.includes("--dry-run") || process.env.DNFD_SKIP === "1") {
    return {
      ok: true,
      inserted: 0,
      message:
        process.env.DNFD_SKIP === "1"
          ? "DNFD_SKIP=1 — Playwright 미실행"
          : "[dry-run] dnfd_consulta INSERT 생략",
    };
  }

  let browser: Browser | undefined;
  try {
    browser = await chromium.launch({
      headless: true,
      slowMo: 200,
    });
    const page = await browser.newPage();
    await page.goto(TRAMITES_URL, {
      timeout: 45000,
      waitUntil: "domcontentloaded",
    });

    if (await detectCaptchaBlocking(page)) {
      throw new Error(
        "MANUAL_INTERVENTION_REQUIRED: CAPTCHA/봇 차단이 감지되었습니다. 브라우저에서 수동으로 tramites-minsa 포털을 연 뒤 세션 쿠키를 환경변수로 전달하는 방식을 검토하세요.",
      );
    }

    await sleepMs(1500);

    await runCompanyProbe(page);

    let inserted = 0;
    const crawledAt = new Date().toISOString();

    for (const p of TARGET_PRODUCTS) {
      const { notes } = await searchAndScrape(page, p);
      const row: PanamaPhase1InsertRow = {
        product_id: p.product_id,
        market_segment: "regulatory",
        fob_estimated_usd: null,
        confidence: 0.78,
        crawled_at: crawledAt,
        pa_source: PA_SOURCE,
        pa_source_url: TRAMITES_URL,
        pa_product_name_local: `DNFD consulta: ${p.who_inn_en}`,
        pa_currency_unit: "N/A",
        pa_price_local: null,
        pa_notes: notes,
      };
      validatePanamaPhase1Common(row);
      const r = await insertRow(row);
      if (r.ok) {
        inserted += 1;
      } else {
        process.stderr.write(`[pa_dnfd_consulta] INSERT 실패: ${r.message}\n`);
      }
    }

    await browser.close();
    browser = undefined;

    return {
      ok: true,
      inserted,
      message: `dnfd_consulta ${String(inserted)}건 적재`,
    };
  } catch (error: unknown) {
    if (browser !== undefined) {
      await browser.close().catch(() => undefined);
    }
    const msg = error instanceof Error ? error.message : String(error);
    return { ok: false, inserted: 0, message: msg };
  }
}
