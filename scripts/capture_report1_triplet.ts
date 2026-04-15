/**
 * Report1 3개 INN 캡처 (Rosumeg/Hydrine/Sereterol)
 */
/// <reference types="node" />

import { chromium } from "playwright";

type CaptureTarget = {
  key: string;
  inn: string;
};

const TARGETS: CaptureTarget[] = [
  { key: "rosumeg", inn: "Rosuvastatin + Omega-3-acid ethyl esters" },
  { key: "hydrine", inn: "Hydroxyurea" },
  { key: "sereterol", inn: "Salmeterol + Fluticasone" },
];

async function captureOne(
  page: import("playwright").Page,
  baseUrl: string,
  target: CaptureTarget,
): Promise<void> {
  const url = `${baseUrl}/panama/report?inn=${encodeURIComponent(target.inn)}`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForSelector('text=가격 포지셔닝', { timeout: 180000 });
  await page.waitForTimeout(4000);

  await page.screenshot({
    path: `data/raw/report_checks/${target.key}_report1_full.png`,
    fullPage: true,
  });

  const pricingRow = page.locator('tr:has(td:has-text("가격 포지셔닝"))').first();
  await pricingRow.screenshot({
    path: `data/raw/report_checks/${target.key}_report1_pricing_block.png`,
  });

  const strategySection = page
    .locator('section:has(h2:has-text("3. 시장 진출 전략"))')
    .first();
  await strategySection.screenshot({
    path: `data/raw/report_checks/${target.key}_report1_market_entry_block.png`,
  });
}

async function main(): Promise<void> {
  const baseUrl = process.env.REPORT_CAPTURE_BASE_URL ?? "http://localhost:3022";
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1600, height: 2400 },
  });

  for (const target of TARGETS) {
    await captureOne(page, baseUrl, target);
  }

  await browser.close();
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
