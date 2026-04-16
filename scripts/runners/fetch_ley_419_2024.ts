/**
 * Ley 419 de 2024 — Gaceta PDF 텍스트 추출 + 키워드 히트 JSON (DB 미사용)
 * `pdf-parse` v2: `PDFParse` 클래스 (프로젝트 표준)
 */
/// <reference types="node" />

import * as fs from "node:fs/promises";
import * as path from "node:path";

import { PDFParse } from "pdf-parse";

/** Ley 419 de 1 de febrero de 2024 — 실패 시 LEY419_PDF_URL 또는 로컬 PDF 경로로 교체 */
const PDF_URL = "https://www.gacetaoficial.gob.pa/pdfTemp/29966_A/98562.pdf";

const OUT_DIR = "data/raw/minsa_laws";
const KEYWORDS: string[] = [
  "WLA",
  "autoridad regulatoria",
  "Corea",
  "referencia",
  "30 días",
  "45 días",
  "alto nivel",
  "país de alta vigilancia",
];

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function main(): Promise<void> {
  const dir = path.join(process.cwd(), OUT_DIR);
  await fs.mkdir(dir, { recursive: true });
  const outTxt = path.join(dir, "ley_419_2024.txt");
  const outKw = path.join(dir, "ley_419_2024_keyword_hits.json");
  const outErr = path.join(dir, "ley_419_2024_error.txt");

  const pdfPathRaw = process.env.LEY419_PDF_PATH;
  const pdfPath =
    typeof pdfPathRaw === "string" && pdfPathRaw.trim() !== ""
      ? path.resolve(process.cwd(), pdfPathRaw.trim())
      : null;

  let buffer: Buffer;
  let sourceLabel: string;
  if (pdfPath !== null) {
    try {
      buffer = await fs.readFile(pdfPath);
      sourceLabel = `local_file: ${pdfPath}`;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      await fs.writeFile(outErr, `로컬 PDF 읽기 실패: ${message}\npath=${pdfPath}`, "utf-8");
      throw new Error(`LEY419_PDF_PATH 파일 읽기 실패: ${message}`);
    }
  } else {
    const pdfUrl = process.env.LEY419_PDF_URL ?? PDF_URL;
    const res = await fetch(pdfUrl);
    if (!res.ok) {
      await fs.writeFile(outErr, `HTTP ${String(res.status)} on ${pdfUrl}`, "utf-8");
      throw new Error(`HTTP ${String(res.status)} on ${pdfUrl}`);
    }
    buffer = Buffer.from(await res.arrayBuffer());
    sourceLabel = `source_pdf_url: ${pdfUrl}`;
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.toLowerCase().includes("pdf") && buffer.slice(0, 4).toString() !== "%PDF") {
      await fs.writeFile(
        outErr,
        `비 PDF 응답 가능. content-type=${ct}. Gaceta에서 Ley 419 PDF를 수동 확보해 LEY419_PDF_PATH=data/raw/minsa_laws/ley_419_2024.pdf 로 지정하세요.`,
        "utf-8",
      );
      throw new Error(`응답이 PDF가 아닙니다: ${pdfUrl}`);
    }
  }

  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  let parsedText: string;
  try {
    const textResult = await parser.getText();
    parsedText = textResult.text;
  } finally {
    await parser.destroy();
  }

  const header = `${sourceLabel}\nextracted_at: ${new Date().toISOString()}\n---\n\n`;
  await fs.writeFile(outTxt, header + parsedText, "utf-8");

  const keywordHits: Record<string, string[]> = {};
  for (const kw of KEYWORDS) {
    const regex = new RegExp(`.{0,100}${escapeRegExp(kw)}.{0,100}`, "gi");
    const hits = parsedText.match(regex) ?? [];
    keywordHits[kw] = hits.slice(0, 3).map((h) => h.trim());
    console.log(`[Ley 419] ${kw}: ${String(hits.length)} hits`);
    for (const h of hits.slice(0, 3)) {
      console.log(`  - ${h.trim().slice(0, 200)}`);
    }
  }

  await fs.writeFile(outKw, JSON.stringify(keywordHits, null, 2), "utf-8");
}

if (process.argv[1] !== undefined && process.argv[1].endsWith("fetch_ley_419_2024.ts")) {
  main().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}
