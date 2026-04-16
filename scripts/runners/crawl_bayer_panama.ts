/**
 * Bayer·관련 공개 페이지 — Jina(`readWithJina`) 텍스트 수집 + Gadobutrol/Gadovist 언급 플래그
 * T0-1 Case B: `readWithJina` === `fetchViaJina` (`jina_minsa_shared.ts`)
 */
/// <reference types="node" />

import * as fs from "node:fs/promises";
import * as path from "node:path";

import { readWithJina } from "./jina_minsa_shared";

interface BayerResult {
  url: string;
  text: string;
  extracted_at: string;
  gadobutrol_found: boolean;
  gadovist_found: boolean;
  error?: string;
}

const URLS: string[] = [
  "https://www.bayer.com/es/pa/our-products",
  "https://www.bayer.com/es/pa/productos",
  "https://www.radiologyinfo.org/es/info/gadovist",
];

const OUT_DIR = "data/raw/bayer_panama";
const TEXT_CAP = 80000;

const OUT_FILE = path.join(process.cwd(), OUT_DIR, "gadobutrol_evidence.json");

async function main(): Promise<void> {
  await fs.mkdir(path.join(process.cwd(), OUT_DIR), { recursive: true });
  const results: BayerResult[] = [];

  for (const url of URLS) {
    try {
      const raw = await readWithJina(url);
      const text = raw.length > TEXT_CAP ? raw.slice(0, TEXT_CAP) : raw;
      results.push({
        url,
        text,
        extracted_at: new Date().toISOString(),
        gadobutrol_found: /gadobutrol/i.test(raw),
        gadovist_found: /gadovist/i.test(raw),
      });
      await new Promise((r) => setTimeout(r, 1500 + Math.random() * 1500));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[Bayer] ${url} failed:`, msg);
      results.push({
        url,
        text: "",
        extracted_at: new Date().toISOString(),
        gadobutrol_found: false,
        gadovist_found: false,
        error: msg,
      });
    }
  }

  await fs.writeFile(OUT_FILE, JSON.stringify(results, null, 2), "utf-8");

  const matches = results.filter((r) => r.gadobutrol_found || r.gadovist_found);
  console.log(`[Bayer] ${String(matches.length)}/${String(results.length)} URL(s) with Gadobutrol/Gadovist mention`);
}

if (process.argv[1] !== undefined && process.argv[1].endsWith("crawl_bayer_panama.ts")) {
  main().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}
