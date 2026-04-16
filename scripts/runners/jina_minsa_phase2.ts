import * as fs from "node:fs/promises";
import * as path from "node:path";

import {
  OUTPUT_DIR,
  SEARCH_KEYWORDS,
  URL_PATTERN,
  writeJsonFile,
} from "./jina_minsa_shared";

interface FoundLink {
  source_file: string;
  context: string;
  url: string;
  keyword_matched: string;
}

interface Phase2Summary {
  generated_at: string;
  found_count: number;
  unique_urls: string[];
  found: FoundLink[];
}

function extractContexts(content: string, keyword: string): string[] {
  const lower = content.toLowerCase();
  const target = keyword.toLowerCase();
  const contexts: string[] = [];
  let cursor = 0;
  while (cursor < lower.length) {
    const idx = lower.indexOf(target, cursor);
    if (idx === -1) {
      break;
    }
    const start = Math.max(0, idx - 100);
    const end = Math.min(content.length, idx + 200);
    contexts.push(content.slice(start, end));
    cursor = idx + target.length;
  }
  return contexts;
}

export async function runPhase2(): Promise<Phase2Summary> {
  const files = await fs.readdir(OUTPUT_DIR);
  const found: FoundLink[] = [];

  for (const file of files) {
    if (!file.endsWith(".txt")) {
      continue;
    }
    const filePath = path.join(OUTPUT_DIR, file);
    const content = await fs.readFile(filePath, "utf-8");

    for (const keyword of SEARCH_KEYWORDS) {
      const contexts = extractContexts(content, keyword);
      for (const context of contexts) {
        const urls = context.match(URL_PATTERN) ?? [];
        for (const url of urls) {
          found.push({
            source_file: file,
            context: context.replace(/\n/g, " "),
            url,
            keyword_matched: keyword,
          });
        }
      }
    }
  }

  const uniqueUrls = [...new Set(found.map((item) => item.url))];
  const summary: Phase2Summary = {
    generated_at: new Date().toISOString(),
    found_count: found.length,
    unique_urls: uniqueUrls,
    found,
  };
  await writeJsonFile(path.join(OUTPUT_DIR, "_phase2_search_urls.json"), found);
  await writeJsonFile(path.join(OUTPUT_DIR, "_phase2_summary.json"), summary);
  return summary;
}

async function main(): Promise<void> {
  const summary = await runPhase2();
  console.log(`\n=== Phase 2 결과: ${summary.found_count}개 URL 발견 ===`);
  console.log("\n고유 URL 목록:");
  for (const url of summary.unique_urls) {
    console.log(`  - ${url}`);
  }
}

if (process.argv[1] !== undefined && process.argv[1].endsWith("jina_minsa_phase2.ts")) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[Phase2][fatal] ${message}`);
    process.exitCode = 1;
  });
}
