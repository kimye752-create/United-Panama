/**
 * ACODECO CABAMED XLSX 다운로드 — URL 패턴 → 전월 → 메인 페이지 링크 폴백
 */
/// <reference types="node" />

import { mkdir, writeFile, copyFile } from "node:fs/promises";
import { join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

import * as cheerio from "cheerio";

import { createPoliteFetch, randomDelay } from "../../crawler/stealth_setup.js";

const BASE = "https://www.acodeco.gob.pa";
const FILENAME = "CABAMED-Formato-Publicacion-Farmacias-Privadas.xlsx";

const SEED_DIR = join(process.cwd(), "data", "seed", "panama");
const ARCHIVE_DIR = join(SEED_DIR, "archive");
const OUT_PATH = join(SEED_DIR, "acodeco_cabamed.xlsx");

function buildPatternUrl(y: number, m: number): string {
  const mm = String(m).padStart(2, "0");
  return `${BASE}/inicio/wp-content/uploads/${String(y)}/${mm}/${FILENAME}`;
}

async function downloadOnce(url: string): Promise<Buffer> {
  const politeFetch = createPoliteFetch();
  const res = await politeFetch(url, {
    headers: { Accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,*/*" },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${String(res.status)}`);
  }
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

/** 전월 (UTC 기준) */
function prevMonth(y: number, m: number): { y: number; m: number } {
  if (m <= 1) {
    return { y: y - 1, m: 12 };
  }
  return { y, m: m - 1 };
}

async function tryMainPageLink(): Promise<Buffer> {
  const politeFetch = createPoliteFetch();
  await randomDelay();
  const res = await politeFetch(`${BASE}/inicio/`, {
    headers: { Accept: "text/html,*/*" },
  });
  if (!res.ok) {
    throw new Error(`메인 페이지 HTTP ${String(res.status)}`);
  }
  const html = await res.text();
  const $ = cheerio.load(html);
  const candidates = $("a[href]")
    .map((_, el) => ($(el).attr("href") ?? "").trim())
    .get()
    .filter((href) => {
      const h = href.toLowerCase();
      return h.endsWith(".xlsx") && h.includes("cabamed");
    });
  if (candidates.length === 0) {
    throw new Error("메인 페이지에서 CABAMED .xlsx 링크를 찾지 못했습니다.");
  }
  const abs = new URL(candidates[0] as string, `${BASE}/`).href;
  await randomDelay();
  return downloadOnce(abs);
}

/**
 * XLSX 바이너리를 시드 경로에 저장하고 아카이브에 복사함.
 */
export async function fetchCabamedXlsx(): Promise<string> {
  const now = new Date();
  let y = now.getUTCFullYear();
  let m = now.getUTCMonth() + 1;

  const errors: string[] = [];
  const urlsTried: string[] = [];

  for (let attempt = 0; attempt < 2; attempt++) {
    const url = buildPatternUrl(y, m);
    urlsTried.push(url);
    try {
      const buf = await downloadOnce(url);
      await mkdir(SEED_DIR, { recursive: true });
      await mkdir(ARCHIVE_DIR, { recursive: true });
      await writeFile(OUT_PATH, buf);
      const stamp = `${String(y)}${String(m).padStart(2, "0")}`;
      const arch = join(ARCHIVE_DIR, `acodeco_cabamed_${stamp}.xlsx`);
      await copyFile(OUT_PATH, arch).catch(() => {
        /* 아카이브 실패는 무시 */
      });
      return OUT_PATH;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${url}: ${msg}`);
      const p = prevMonth(y, m);
      y = p.y;
      m = p.m;
    }
  }

  try {
    const buf = await tryMainPageLink();
    await mkdir(SEED_DIR, { recursive: true });
    await mkdir(ARCHIVE_DIR, { recursive: true });
    await writeFile(OUT_PATH, buf);
    return OUT_PATH;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    errors.push(`main_page: ${msg}`);
    process.stderr.write(
      `[pa_acodeco_fetch] CABAMED 다운로드 실패. 시도 URL:\n${urlsTried.join("\n")}\n상세:\n${errors.join("\n")}\n`,
    );
    throw new Error(
      "CABAMED XLSX를 가져오지 못했습니다. ACODECO 사이트 구조·월별 경로를 확인하세요.",
    );
  }
}

async function main(): Promise<void> {
  const p = await fetchCabamedXlsx();
  process.stdout.write(JSON.stringify({ ok: true, path: p }) + "\n");
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
