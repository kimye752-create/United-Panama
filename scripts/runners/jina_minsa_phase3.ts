import * as fs from "node:fs/promises";
import * as path from "node:path";

import {
  OUTPUT_DIR,
  SELF_INNS_ES,
  fetchViaJina,
  readJsonFile,
  sleep,
  writeJsonFile,
} from "./jina_minsa_shared";

interface FoundLink {
  source_file: string;
  context: string;
  url: string;
  keyword_matched: string;
}

interface QueryResult {
  product: string;
  inn: string;
  selected_base_url: string | null;
  tried_urls: string[];
  success: boolean;
  size: number;
  output_file: string | null;
  error: string | null;
}

interface Phase3Summary {
  generated_at: string;
  base_search_url: string | null;
  skipped: boolean;
  reason: string | null;
  results: QueryResult[];
}

function pickBaseSearchUrl(links: readonly FoundLink[]): string | null {
  const priority = links
    .map((item) => item.url)
    .filter((url) => {
      const lower = url.toLowerCase();
      return (
        lower.includes("buscar") ||
        lower.includes("consulta") ||
        lower.includes("medicamento")
      );
    });
  if (priority.length > 0) {
    return priority[0] ?? null;
  }
  const first = links[0];
  return first?.url ?? null;
}

function buildVariants(baseSearchUrl: string, inn: string): string[] {
  const encoded = encodeURIComponent(inn);
  return [
    `${baseSearchUrl}?q=${encoded}`,
    `${baseSearchUrl}?search=${encoded}`,
    `${baseSearchUrl}?nombre=${encoded}`,
  ];
}

export async function runPhase3(): Promise<Phase3Summary> {
  const phase2Path = path.join(OUTPUT_DIR, "_phase2_search_urls.json");
  let phase2Result: FoundLink[] = [];
  try {
    phase2Result = await readJsonFile<FoundLink[]>(phase2Path);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const summary: Phase3Summary = {
      generated_at: new Date().toISOString(),
      base_search_url: null,
      skipped: true,
      reason: `Phase2 결과 파일 읽기 실패: ${message}`,
      results: [],
    };
    await writeJsonFile(path.join(OUTPUT_DIR, "_phase3_summary.json"), summary);
    return summary;
  }

  const baseSearchUrl = pickBaseSearchUrl(phase2Result);
  if (baseSearchUrl === null) {
    const summary: Phase3Summary = {
      generated_at: new Date().toISOString(),
      base_search_url: null,
      skipped: true,
      reason: "Phase 2에서 검색 URL을 찾지 못해 Phase 3를 건너뜁니다.",
      results: [],
    };
    await writeJsonFile(path.join(OUTPUT_DIR, "_phase3_summary.json"), summary);
    return summary;
  }

  const results: QueryResult[] = [];
  for (const item of SELF_INNS_ES) {
    const variants = buildVariants(baseSearchUrl, item.inn);
    let success = false;
    let size = 0;
    let outputFile: string | null = null;
    let lastError: string | null = null;

    for (const url of variants) {
      try {
        const text = await fetchViaJina(url);
        const fileName = `search_${item.product}_${item.inn.replace(/\s+/g, "_")}.txt`;
        const filePath = path.join(OUTPUT_DIR, fileName);
        await fs.writeFile(filePath, text, "utf-8");
        success = true;
        size = text.length;
        outputFile = filePath;
        console.log(`  ✓ ${item.product}: ${text.length} chars (${url})`);
        break;
      } catch (error: unknown) {
        lastError = error instanceof Error ? error.message : String(error);
      }
    }

    results.push({
      product: item.product,
      inn: item.inn,
      selected_base_url: baseSearchUrl,
      tried_urls: variants,
      success,
      size,
      output_file: outputFile,
      error: success ? null : lastError,
    });
    await sleep(2000);
  }

  const summary: Phase3Summary = {
    generated_at: new Date().toISOString(),
    base_search_url: baseSearchUrl,
    skipped: false,
    reason: null,
    results,
  };
  await writeJsonFile(path.join(OUTPUT_DIR, "_phase3_summary.json"), summary);
  return summary;
}

async function main(): Promise<void> {
  const summary = await runPhase3();
  if (summary.skipped) {
    console.log(`⚠ ${summary.reason}`);
    return;
  }
  console.log(`[Phase3] 검색 URL: ${summary.base_search_url}`);
  for (const row of summary.results) {
    if (row.success) {
      console.log(`  ✓ ${row.product}: ${row.size} chars`);
    } else {
      console.log(`  ✗ ${row.product}: ${row.error}`);
    }
  }
}

if (process.argv[1] !== undefined && process.argv[1].endsWith("jina_minsa_phase3.ts")) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[Phase3][fatal] ${message}`);
    process.exitCode = 1;
  });
}
