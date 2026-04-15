/**
 * Decreto Ejecutivo No.3 (2023) 의약품 PDF — 텍스트 추출 검증 전용 (DB 미사용)
 */
/// <reference types="node" />

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { PDFParse } from "pdf-parse";

const __dirname = dirname(fileURLToPath(import.meta.url));

const DEFAULT_PDF = join(
  __dirname,
  "..",
  "..",
  "data",
  "raw",
  "acodeco",
  "decreto3_2023_medicamentos.pdf",
);

/** 신 8제품 관련 INN·치료군 키워드 (대소문자 무시 매칭) */
const INN_KEYWORDS = [
  "Rosuvastatina",
  "Atorvastatina",
  "Simvastatina",
  "Cilostazol",
  "Mosaprida",
  "Salmeterol",
  "Fluticasona",
  "Gadobutrol",
  "Hidroxiurea",
  "Omega",
] as const;

/** 가격 후보 패턴: B/., PAB, $ + 숫자 */
const PRICE_PATTERNS: readonly RegExp[] = [
  /B\/\.?\s*[\d][\d.,]*/gi,
  /[\d][\d.,]*\s*(?:PAB|pab)\b/g,
  /\$\s*[\d][\d.,]*/g,
];

function countMatches(haystack: string, re: RegExp): number {
  const m = haystack.match(re);
  return m !== null ? m.length : 0;
}

async function main(): Promise<void> {
  const arg = process.argv.find((a) => a.startsWith("--file="));
  const pdfPath =
    arg !== undefined ? arg.slice("--file=".length) : DEFAULT_PDF;

  const buf = await readFile(pdfPath);
  const parser = new PDFParse({ data: new Uint8Array(buf) });
  let textResult;
  try {
    textResult = await parser.getText();
  } finally {
    await parser.destroy();
  }

  const fullText = textResult.text;
  const lines = fullText.split(/\r?\n/);
  const numPages = textResult.pages.length;

  const innCounts: Record<string, number> = {};
  const lower = fullText.toLowerCase();
  for (const kw of INN_KEYWORDS) {
    const re = new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    innCounts[kw] = countMatches(fullText, re);
  }

  let priceTotal = 0;
  for (const pr of PRICE_PATTERNS) {
    priceTotal += countMatches(fullText, pr);
  }

  const sampleLines = lines.slice(0, 30).map((l, i) => `${String(i + 1).padStart(3, " ")}| ${l}`);

  // 깨짐 휴리스틱: 대체 문자·빈 줄 비율
  const replacementChar = (fullText.match(/\uFFFD/g) ?? []).length;
  const nonPrintable = (fullText.match(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g) ?? [])
    .length;

  process.stdout.write(
    JSON.stringify(
      {
        pdfPath,
        numPages,
        lineCount: lines.length,
        charLength: fullText.length,
        innKeywordCounts: innCounts,
        pricePatternMatchTotal: priceTotal,
        qualityHints: {
          replacementCharCount: replacementChar,
          controlCharCount: nonPrintable,
        },
        sampleFirst30Lines: sampleLines.join("\n"),
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
