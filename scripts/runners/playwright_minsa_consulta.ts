import { chromium, type Page, type Request, type Response } from "playwright";
import * as fs from "node:fs/promises";
import * as path from "node:path";

import { PLAYWRIGHT_OUTPUT_DIR, ensureDir, writeJsonFile } from "./jina_minsa_shared";

const TARGET = "https://consultamedicamentos.minsa.gob.pa/";

interface CapturedRequest {
  url: string;
  method: string;
  postData: string | null;
  resourceType: string;
}

interface CapturedResponse {
  url: string;
  status: number;
  contentType: string;
}

interface InputMeta {
  index: number;
  name: string | null;
  id: string | null;
  placeholder: string | null;
}

interface ButtonMeta {
  index: number;
  id: string | null;
  text: string;
}

function isBlockedTitle(title: string): boolean {
  const lower = title.toLowerCase();
  return (
    lower.includes("blocked") ||
    lower.includes("forbidden") ||
    lower.includes("denied") ||
    lower.includes("cloudflare")
  );
}

async function captureElements(page: Page): Promise<{
  inputs: InputMeta[];
  buttons: ButtonMeta[];
}> {
  const inputs = await page.$$(
    "input[type='text'], input[type='search'], input:not([type])",
  );
  const buttons = await page.$$("button, input[type='submit'], input[type='button']");

  const inputMeta: InputMeta[] = [];
  for (let i = 0; i < Math.min(inputs.length, 8); i++) {
    const item = inputs[i];
    inputMeta.push({
      index: i,
      name: await item.getAttribute("name"),
      id: await item.getAttribute("id"),
      placeholder: await item.getAttribute("placeholder"),
    });
  }

  const buttonMeta: ButtonMeta[] = [];
  for (let i = 0; i < Math.min(buttons.length, 8); i++) {
    const item = buttons[i];
    const text = (await item.textContent()) ?? "";
    buttonMeta.push({
      index: i,
      id: await item.getAttribute("id"),
      text: text.trim().slice(0, 80),
    });
  }
  return { inputs: inputMeta, buttons: buttonMeta };
}

async function trySearchCapture(page: Page): Promise<{
  selectedInput: string | null;
  selectedButton: string | null;
}> {
  const inputCandidates = [
    "input[name='nombre']",
    "input[name='medicamento']",
    "input[type='search']",
    "input[type='text']",
    "input:not([type])",
  ];
  const buttonCandidates = [
    "button[type='submit']",
    "button:has-text('Buscar')",
    "input[type='submit']",
    "button",
  ];

  let selectedInput: string | null = null;
  for (const selector of inputCandidates) {
    const found = await page.$(selector);
    if (found !== null) {
      await found.fill("Rosuvastatina");
      selectedInput = selector;
      break;
    }
  }

  let selectedButton: string | null = null;
  for (const selector of buttonCandidates) {
    const found = await page.$(selector);
    if (found !== null) {
      await found.click();
      selectedButton = selector;
      break;
    }
  }

  await page.waitForTimeout(5000);
  return { selectedInput, selectedButton };
}

async function main(): Promise<void> {
  await ensureDir(PLAYWRIGHT_OUTPUT_DIR);

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  const requests: CapturedRequest[] = [];
  const responses: CapturedResponse[] = [];

  page.on("request", (req: Request) => {
    if (req.resourceType() === "xhr" || req.resourceType() === "fetch") {
      requests.push({
        url: req.url(),
        method: req.method(),
        postData: req.postData(),
        resourceType: req.resourceType(),
      });
    }
  });
  page.on("response", async (res: Response) => {
    const ct = res.headers()["content-type"] ?? "";
    if (ct.includes("json") || ct.includes("xml")) {
      responses.push({
        url: res.url(),
        status: res.status(),
        contentType: ct,
      });
    }
  });

  try {
    console.log(`[Playwright] Accessing ${TARGET}`);
    await page.goto(TARGET, { waitUntil: "networkidle", timeout: 30000 });

    const title = await page.title();
    console.log(`Title: ${title}`);
    if (isBlockedTitle(title)) {
      throw new Error("봇 차단 신호(제목 기반)가 감지되어 중단합니다.");
    }

    await page.screenshot({
      path: path.join(PLAYWRIGHT_OUTPUT_DIR, "01_initial.png"),
      fullPage: true,
    });
    const html = await page.content();
    await fs.writeFile(
      path.join(PLAYWRIGHT_OUTPUT_DIR, "01_initial.html"),
      html,
      "utf-8",
    );

    const elementInfo = await captureElements(page);
    console.log(`Found ${elementInfo.inputs.length} input fields (sample)`);
    console.log(`Found ${elementInfo.buttons.length} buttons (sample)`);
    for (const item of elementInfo.inputs) {
      console.log(
        `  Input ${item.index}: name=${item.name} id=${item.id} placeholder=${item.placeholder}`,
      );
    }
    for (const item of elementInfo.buttons) {
      console.log(`  Button ${item.index}: id=${item.id} text=${item.text}`);
    }

    const searchAttempt = await trySearchCapture(page);
    await page.screenshot({
      path: path.join(PLAYWRIGHT_OUTPUT_DIR, "02_after_search.png"),
      fullPage: true,
    });
    await fs.writeFile(
      path.join(PLAYWRIGHT_OUTPUT_DIR, "02_after_search.html"),
      await page.content(),
      "utf-8",
    );

    await writeJsonFile(
      path.join(PLAYWRIGHT_OUTPUT_DIR, "01_initial_network.json"),
      { requests, responses, searchAttempt, elementInfo },
    );

    console.log("\n=== XHR/Fetch 요청 ===");
    for (const req of requests) {
      console.log(`  ${req.method} ${req.url}`);
    }
    console.log("\n=== JSON/XML 응답 ===");
    for (const res of responses) {
      console.log(`  ${res.status} ${res.url}`);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[Playwright][error] ${message}`);
    await writeJsonFile(path.join(PLAYWRIGHT_OUTPUT_DIR, "error.json"), {
      message,
      requests,
      responses,
    });
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[Playwright][fatal] ${message}`);
  process.exitCode = 1;
});
