/**
 * Jina로 확보한 MINSA/DNFD 정적 텍스트에서 WLA·패스트트랙 관련 문구 추출
 */
import * as fs from "node:fs/promises";
import * as path from "node:path";

const DNFD_FILES = [
  "data/raw/jina_minsa/https___www_minsa_gob_pa.txt",
  "data/raw/jina_minsa/https___dnfd_minsa_gob_pa_.txt",
  "data/raw/jina_minsa/https___consultamedicamentos_minsa_gob_pa_.txt",
] as const;

const WLA_KEYWORDS = [
  "alta vigilancia sanitaria",
  "high sanitary",
  "fast track",
  "fast-track",
  "país de alta vigilancia",
  "autoridad reguladora de referencia",
  "WLA",
  "WHO Listed Authority",
  "Corea",
  "Korea",
  "registro sanitario simplificado",
  "trámite abreviado",
  "Ley 419",
  "ley 419",
] as const;

interface WlaEvidence {
  file: string;
  keyword: string;
  context: string;
  line_number: number;
}

async function main(): Promise<void> {
  const results: WlaEvidence[] = [];

  for (const filePath of DNFD_FILES) {
    try {
      const content = await fs.readFile(filePath, "utf-8");
      const lines = content.split("\n");

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? "";
        const lower = line.toLowerCase();

        for (const keyword of WLA_KEYWORDS) {
          if (lower.includes(keyword.toLowerCase())) {
            const start = Math.max(0, i - 2);
            const end = Math.min(lines.length, i + 3);
            const context = lines.slice(start, end).join("\n");

            results.push({
              file: filePath,
              keyword,
              context: context.slice(0, 400),
              line_number: i + 1,
            });
          }
        }
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`[SKIP] ${filePath} 읽기 실패 또는 없음: ${message}`);
    }
  }

  const outputPath = path.join(process.cwd(), "data/raw/jina_minsa/_wla_evidence.json");
  try {
    await fs.writeFile(outputPath, JSON.stringify(results, null, 2), "utf-8");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[extract_wla_from_dnfd] 결과 저장 실패: ${message}`);
    process.exitCode = 1;
    return;
  }

  console.log(`\n=== WLA 출처 추출 결과: ${results.length}건 ===`);
  for (const r of results) {
    console.log(`\n[${r.keyword}] ${r.file}:${r.line_number}`);
    console.log(r.context.slice(0, 200));
  }

  if (results.length === 0) {
    console.log("\n⚠ WLA 관련 문구 미발견. DNFD 정적 페이지에 해당 정보 없음.");
    console.log("→ 다음 작전: KOTRA 파나마 무역관 자료 또는 MINSA 공식 발표 PDF 확보 필요.");
  }
}

if (process.argv[1] !== undefined && process.argv[1].endsWith("extract_wla_from_dnfd.ts")) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[extract_wla_from_dnfd][fatal] ${message}`);
    process.exitCode = 1;
  });
}
