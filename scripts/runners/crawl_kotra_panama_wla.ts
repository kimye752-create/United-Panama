/**
 * KOTRA dream URL — Jina(`readWithJina`) 텍스트 + WLA·기간·한국지정 후보 문자열
 * T0-1 Case B
 */
/// <reference types="node" />

import * as fs from "node:fs/promises";
import * as path from "node:path";

import { readWithJina } from "./jina_minsa_shared";

interface KotraResult {
  url: string;
  text: string;
  text_truncated: boolean;
  wla_mentions: string[];
  duration_mentions: string[];
  korea_wla_designation_mentions: string[];
  error?: string;
}

const URLS: string[] = [
  "https://dream.kotra.or.kr/kotranews/cms/indReport/actionIndReportDetail.do?pRptNo=14109",
  "https://dream.kotra.or.kr/user/globalBbs/kotranews/2/globalBbsDataView.do?setIdx=243&dataIdx=226530",
  "https://dream.kotra.or.kr/",
  "https://www.kotra.or.kr/bigdata/visualization/country/PA",
];

const OUT_DIR = "data/raw/kotra_panama";
const TEXT_CAP = 120000;
const OUT_FILE = path.join(process.cwd(), OUT_DIR, "wla_evidence.json");

const KOREA_WLA_RE =
  /한국.{0,20}(위생선진국|WLA|지정|고시)|(위생선진국|WLA).{0,20}한국/g;

async function main(): Promise<void> {
  await fs.mkdir(path.join(process.cwd(), OUT_DIR), { recursive: true });
  const results: KotraResult[] = [];

  for (const url of URLS) {
    try {
      const raw = await readWithJina(url);
      const truncated = raw.length > TEXT_CAP;
      const text = truncated ? raw.slice(0, TEXT_CAP) : raw;
      const wla = [...raw.matchAll(/WLA|위생선진국|패스트트랙|fast[\s-]?track|WHO\s*Listed\s*Authority/gi)].map(
        (m) => m[0],
      );
      const duration = [...raw.matchAll(/(\d{1,3})\s*(일|day|days|month|months|개월)/gi)].map((m) => m[0]);
      const koreaWla = [...raw.matchAll(KOREA_WLA_RE)].map((m) => m[0]);

      results.push({
        url,
        text,
        text_truncated: truncated,
        wla_mentions: uniqueStrings(wla),
        duration_mentions: uniqueStrings(duration),
        korea_wla_designation_mentions: uniqueStrings(koreaWla),
      });
      await new Promise((r) => setTimeout(r, 1500 + Math.random() * 1500));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[KOTRA] ${url} failed:`, msg);
      results.push({
        url,
        text: "",
        text_truncated: false,
        wla_mentions: [],
        duration_mentions: [],
        korea_wla_designation_mentions: [],
        error: msg,
      });
    }
  }

  const payload = {
    generated_at: new Date().toISOString(),
    primary_source_strength_hint: "medium",
    note: "자동 추출은 노이즈 가능. 설계자 문맥 검증 후 high/low 확정.",
    results,
  };
  await fs.writeFile(OUT_FILE, JSON.stringify(payload, null, 2), "utf-8");
  console.log(`[KOTRA] ${String(results.length)} URL(s) processed, saved to ${OUT_FILE}`);
}

function uniqueStrings(items: string[]): string[] {
  return [...new Set(items.map((s) => s.trim()).filter((s) => s !== ""))];
}

if (process.argv[1] !== undefined && process.argv[1].endsWith("crawl_kotra_panama_wla.ts")) {
  main().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}
